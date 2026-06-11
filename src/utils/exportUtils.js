import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { calculateDebts } from './db';

export async function exportAsImage(elementId, filename = 'export.png') {
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportAsPDF(elementId, filename = 'export.pdf') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

export function exportAsExcel(data, filename = 'export.xlsx', sheetName = 'Daten') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportSharedVacationExcel(expenses, settlements, participants, filename, personStats = {}, displayCurrency = 'EUR') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: All expenses
  const expData = expenses.map(e => ({
    'Datum': e.date || '',
    'Ausgabe': e.name || '',
    'Betrag': e.amount || 0,
    'Währung': e.currency || 'EUR',
    'Kategorie': e.category || '',
    'Bezahlt von': e.paidBy || '',
    'Bezahlt für': (e.paidFor || []).join(', ')
  }));
  const ws1 = XLSX.utils.json_to_sheet(expData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Ausgaben');

  // Sheet 2: Settlements
  const settData = settlements.map(s => ({
    'Von': s.from,
    'An': s.to,
    [`Betrag (${displayCurrency})`]: s.amount
  }));
  const ws2 = XLSX.utils.json_to_sheet(settData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Ausgleichszahlungen');

  // Sheet 3: Balance table
  const bilanzData = participants.map(p => {
    const stats = personStats[p] || { paid: 0, owes: 0 };
    const balance = Math.round((stats.paid - stats.owes) * 100) / 100;
    return {
      'Teilnehmer': p,
      [`Bezahlt (${displayCurrency})`]: Math.round(stats.paid * 100) / 100,
      [`Anteil (${displayCurrency})`]: Math.round(stats.owes * 100) / 100,
      [`Bilanz (${displayCurrency})`]: balance
    };
  });
  const ws3 = XLSX.utils.json_to_sheet(bilanzData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Bilanz');

  XLSX.writeFile(wb, filename);
}

export async function exportSharedVacationPDF(elementId, filename) {
  await exportAsPDF(elementId, filename);
}

// ============================================================================
// PROFESSIONELLER PDF-REPORT (vektorbasiert, kein Screenshot)
// ----------------------------------------------------------------------------
// Erzeugt ein sauberes A4-PDF mit Deckkopf, KPIs, konfigurierbaren Diagrammen
// (vektoriell gezeichnet), Kategorie-Tabelle und vollständiger Ausgabenliste
// mit automatischen Seitenumbrüchen, Kopf-/Fußzeilen und Beschriftungen.
// Welche Diagramme/Abschnitte enthalten sind und welche Kategorien in den
// Diagrammen ausgeblendet werden, steuert eine Export-Konfiguration.
// ============================================================================

const CUR_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', TRY: '₺', THB: '฿', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', HRK: 'kn', BGN: 'лв', RON: 'lei' };
const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#14b8a6'];
const REST_COLOR = '#94a3b8';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function fmtNumber(value) {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}
function fmtMoney(value, currency) {
  const sym = CUR_SYMBOLS[currency] || currency || '';
  return `${fmtNumber(value)} ${sym}`.trim();
}
function fmtCompact(value) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value || 0);
}
function fmtDate(d) {
  if (!d) return '';
  const parts = String(d).split('-');
  if (parts.length !== 3) return String(d);
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
function sanitizeFilename(name) {
  return (name || 'Urlaub').replace(/[^\w\d äöüÄÖÜß-]/g, '').trim().replace(/\s+/g, '_') || 'Urlaub';
}

function convert(amount, fromRate, toCurrency, rates) {
  const amt = parseFloat(amount) || 0;
  const r = parseFloat(fromRate) || 1;
  const base = amt / r;
  const tr = rates[toCurrency] || 1;
  return base * tr;
}

// "Schöner" Achsenschritt für Gitterlinien (1/2/2,5/5 × 10^n)
function niceStep(maxVal, targetLines = 4) {
  const raw = Math.max(maxVal, 0.0001) / targetLines;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const c of [1, 2, 2.5, 5, 10]) {
    if (raw / pow <= c) return c * pow;
  }
  return 10 * pow;
}

// Kreisbogen als Bezier-Segmente (max. 90° pro Segment) — für Donut-Slices.
function arcBeziers(cx, cy, r, a0, a1) {
  const segs = [];
  const total = a1 - a0;
  const n = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 2)));
  const da = total / n;
  let a = a0;
  for (let i = 0; i < n; i++) {
    const b = a + da;
    const k = (4 / 3) * Math.tan((b - a) / 4) * r;
    const p0 = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const p3 = [cx + r * Math.cos(b), cy + r * Math.sin(b)];
    segs.push({
      c1: [p0[0] - k * Math.sin(a), p0[1] + k * Math.cos(a)],
      c2: [p3[0] + k * Math.sin(b), p3[1] - k * Math.cos(b)],
      p: p3,
    });
    a = b;
  }
  return segs;
}

// Donut-Segment (Ring-Ausschnitt) als geschlossener Pfad füllen + weiß umranden.
function drawDonutSlice(doc, cx, cy, rInner, rOuter, a0, a1) {
  const start = [cx + rOuter * Math.cos(a0), cy + rOuter * Math.sin(a0)];
  let curr = start;
  const ops = [];
  arcBeziers(cx, cy, rOuter, a0, a1).forEach(s => {
    ops.push([s.c1[0] - curr[0], s.c1[1] - curr[1], s.c2[0] - curr[0], s.c2[1] - curr[1], s.p[0] - curr[0], s.p[1] - curr[1]]);
    curr = s.p;
  });
  const innerStart = [cx + rInner * Math.cos(a1), cy + rInner * Math.sin(a1)];
  ops.push([innerStart[0] - curr[0], innerStart[1] - curr[1]]);
  curr = innerStart;
  arcBeziers(cx, cy, rInner, a1, a0).forEach(s => {
    ops.push([s.c1[0] - curr[0], s.c1[1] - curr[1], s.c2[0] - curr[0], s.c2[1] - curr[1], s.p[0] - curr[0], s.p[1] - curr[1]]);
    curr = s.p;
  });
  doc.lines(ops, start[0], start[1], [1, 1], 'FD', true);
}

// Spiegelt die Kategorie-/Personen-/Merge-Filterlogik der Übersicht.
function expensesByCats(expenses, selectedCats, merged, persons) {
  let exps = expenses || [];
  if (persons && persons.length) exps = exps.filter(e => persons.includes(e.paidBy));
  if (merged && merged.length) {
    const map = {};
    merged.forEach(m => m.categories.forEach(c => { map[c] = m.name; }));
    exps = exps.map(e => ({ ...e, displayCategory: map[e.category] || e.category }));
  } else {
    exps = exps.map(e => ({ ...e, displayCategory: e.category }));
  }
  if (selectedCats && selectedCats.length) {
    const all = new Set(selectedCats);
    if (merged) merged.forEach(m => { if (selectedCats.includes(m.name)) m.categories.forEach(c => all.add(c)); });
    exps = exps.filter(e => all.has(e.category) || all.has(e.displayCategory));
  }
  return exps;
}

// Spiegelt calcKpiValue aus der Übersicht.
function kpiValue(kpi, ctx) {
  const { expenses, rates, displayCurrency, participants, payments } = ctx;
  const cur = kpi.currency || displayCurrency;
  const persons = kpi.persons || [];
  const exps = expensesByCats(expenses, kpi.categories, kpi.mergedCategories, kpi.type === 'person_balance' ? [] : persons);
  switch (kpi.type) {
    case 'total':
    case 'category_total':
      return exps.reduce((s, e) => s + convert(e.amount, e.exchangeRate, cur, rates), 0);
    case 'daily_avg':
    case 'category_daily_avg': {
      const total = exps.reduce((s, e) => s + convert(e.amount, e.exchangeRate, cur, rates), 0);
      const allDates = (expenses || []).map(e => e.date).filter(Boolean).sort();
      if (!allDates.length) return 0;
      const first = new Date(allDates[0] + 'T00:00:00');
      const last = new Date(allDates[allDates.length - 1] + 'T00:00:00');
      const days = Math.max(1, Math.round((last - first) / 86400000) + 1);
      return total / days;
    }
    case 'count':
    case 'category_count':
      return exps.length;
    case 'person_balance': {
      if (!persons.length || !participants.length) return 0;
      const allExps = expensesByCats(expenses, kpi.categories, kpi.mergedCategories, []);
      const { balances } = calculateDebts(allExps, participants, payments);
      const rate = rates[cur] || 1;
      return persons.reduce((s, p) => s + ((balances[p] || 0) * rate), 0);
    }
    default:
      return 0;
  }
}

const KPI_TYPE_LABELS = {
  total: 'Gesamtausgaben', category_total: 'Kategorie-Summe',
  daily_avg: 'Tagesdurchschnitt', category_daily_avg: 'Kategorie-Ø/Tag',
  count: 'Anzahl Ausgaben', category_count: 'Kategorie-Anzahl',
  person_balance: 'Personen-Bilanz',
};

// ---------------------------------------------------------------------------
// Export-Konfiguration: welche Diagramme/Abschnitte, welche Kategorien
// pro Diagramm ausgeblendet werden. Wird pro Urlaub gespeichert.
// ---------------------------------------------------------------------------
export const DEFAULT_PDF_CONFIG = {
  charts: {
    catDonut: { enabled: true, excluded: [] },
    catBar: { enabled: true, excluded: [] },
    time: { enabled: true, excluded: [] },
    balance: { enabled: true },
  },
  sections: {
    summary: true,
    kpis: true,
    categoryTable: true,
    balanceTable: true,
    expenses: true,
  },
};

export function normalizePdfConfig(raw) {
  const d = DEFAULT_PDF_CONFIG;
  const c = raw || {};
  const chart = (key) => ({
    enabled: typeof c.charts?.[key]?.enabled === 'boolean' ? c.charts[key].enabled : d.charts[key].enabled,
    excluded: Array.isArray(c.charts?.[key]?.excluded) ? c.charts[key].excluded.filter(Boolean) : [],
  });
  return {
    charts: {
      catDonut: chart('catDonut'),
      catBar: chart('catBar'),
      time: chart('time'),
      balance: { enabled: typeof c.charts?.balance?.enabled === 'boolean' ? c.charts.balance.enabled : true },
    },
    sections: { ...d.sections, ...(c.sections || {}) },
  };
}

export function exportVacationPDF(vacation, expenses, exportConfig) {
  const cfg = normalizePdfConfig(exportConfig !== undefined ? exportConfig : vacation?.pdfExport);
  const settings = vacation?.settings || {};
  const rates = settings.exchangeRates || { EUR: 1 };
  const displayCurrency = settings.currency || 'EUR';
  const isShared = !!settings.sharedMode;
  const participants = settings.participants || [];
  const payments = vacation?.payments || [];
  const list = (expenses || []).slice();

  // ---- Kennzahlen berechnen ----
  const total = list.reduce((s, e) => s + convert(e.amount, e.exchangeRate, displayCurrency, rates), 0);
  const count = list.length;
  const dates = list.map(e => e.date).filter(Boolean).sort();
  const firstDate = dates[0] || null;
  const lastDate = dates[dates.length - 1] || null;
  let days = 1;
  if (firstDate && lastDate) {
    days = Math.max(1, Math.round((new Date(lastDate + 'T00:00:00') - new Date(firstDate + 'T00:00:00')) / 86400000) + 1);
  }
  const dailyAvg = total / days;

  // Kategorie-Aufschlüsselung (optional ohne ausgeblendete Kategorien)
  const catRowsFor = (excluded) => {
    const ex = new Set(excluded || []);
    const m = {};
    list.forEach(e => {
      const key = e.category || 'Ohne Kategorie';
      if (ex.has(key)) return;
      if (!m[key]) m[key] = { sum: 0, count: 0 };
      m[key].sum += convert(e.amount, e.exchangeRate, displayCurrency, rates);
      m[key].count += 1;
    });
    const t = Object.values(m).reduce((s, v) => s + v.sum, 0);
    return Object.entries(m)
      .map(([name, v]) => ({ name, sum: v.sum, count: v.count, pct: t > 0 ? (v.sum / t) * 100 : 0 }))
      .sort((a, b) => b.sum - a.sum);
  };
  const catRows = catRowsFor([]);

  // Globale Farbzuordnung: jede Kategorie hat in allen Diagrammen dieselbe Farbe.
  const colorOf = {};
  catRows.forEach((c, i) => { colorOf[c.name] = CHART_COLORS[i % CHART_COLORS.length]; });

  // Nur Kategorien melden, die es tatsächlich gibt (alte Konfig-Einträge ignorieren)
  const existingCats = new Set(catRows.map(c => c.name));
  const activeExcluded = (excluded) => (excluded || []).filter(c => existingCats.has(c));

  // Tageswerte (für Zeitverlauf-Diagramm) – inkl. Kategorie-Aufteilung pro Tag
  const dayRowsFor = (excluded) => {
    const ex = new Set(excluded || []);
    const m = {};
    list.forEach(e => {
      if (!e.date) return;
      const cat = e.category || 'Ohne Kategorie';
      if (ex.has(cat)) return;
      const amt = convert(e.amount, e.exchangeRate, displayCurrency, rates);
      if (!m[e.date]) m[e.date] = { sum: 0, segs: {} };
      m[e.date].sum += amt;
      m[e.date].segs[cat] = (m[e.date].segs[cat] || 0) + amt;
    });
    return Object.entries(m)
      .map(([date, v]) => ({ date, sum: v.sum, segs: v.segs }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Mehrwährungs-Erkennung
  const multiCurrency = list.some(e => (e.currency || 'EUR') !== displayCurrency);

  // Geteilte Bilanz
  let balanceRows = [], settlements = [];
  if (isShared && participants.length) {
    const debts = calculateDebts(list, participants, payments);
    const rate = rates[displayCurrency] || 1;
    const paid = {};
    participants.forEach(p => { paid[p] = 0; });
    list.forEach(e => { if (participants.includes(e.paidBy)) paid[e.paidBy] += convert(e.amount, e.exchangeRate, displayCurrency, rates); });
    balanceRows = participants.map(p => ({ person: p, paid: paid[p] || 0, balance: (debts.balances[p] || 0) * rate }));
    settlements = (debts.settlements || []).map(s => ({ from: s.from, to: s.to, amount: s.amount * rate }));
  }

  // ====================== PDF-Aufbau ======================
  const doc = new jsPDF('p', 'mm', 'a4');
  const PW = 210, PH = 297, ML = 14, MR = 14, MT = 16, MB = 16, CW = PW - ML - MR;
  const PRIMARY = [14, 165, 233], HEADERC = [12, 74, 110], DARK = [15, 23, 42], GRAY = [100, 116, 139], BORDER = [226, 232, 240], ZEBRA = [247, 250, 252];
  const CPX = 2.4;
  let y = MT;

  const fontH = (pt) => pt * 0.3528; // pt -> mm

  function newPage() { doc.addPage(); y = MT; }
  function ensure(h) { if (y + h > PH - MB) { newPage(); return true; } return false; }

  function header(title, subtitle) {
    // Top color bar
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, PW, 4, 'F');
    y = MT + 2;
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(title, ML, y + 6);
    y += 11;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...GRAY);
      doc.text(subtitle, ML, y);
      y += 5;
    }
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + CW, y);
    doc.setLineWidth(0.2);
    y += 7;
  }

  // keepWith: Mindestplatz, der nach dem Titel noch auf die Seite passen muss,
  // damit eine Überschrift nie allein am Seitenende steht.
  function sectionTitle(text, keepWith = 16) {
    ensure(9 + Math.min(keepWith, PH - MT - MB - 12));
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(ML, y - 0.5, 3, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...HEADERC);
    doc.text(text, ML + 6, y + 4);
    y += 9;
  }

  // keepWith: Höhe des folgenden Blocks, damit das Label nie allein
  // am Seitenende steht.
  function subLabel(text, keepWith = 10) {
    ensure(7 + Math.min(keepWith, PH - MT - MB - 10));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(text, ML, y + 3);
    y += 7;
  }

  // Fußnote unter einem Diagramm, wenn Kategorien ausgeblendet wurden.
  function chartNote(excluded) {
    const ex = activeExcluded(excluded);
    if (!ex.length) return;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    const txt = `Im Diagramm ausgeblendet: ${ex.join(', ')} — in Summen und Tabellen weiterhin enthalten.`;
    const lines = doc.splitTextToSize(txt, CW);
    ensure(lines.length * 3.2 + 3);
    doc.text(lines, ML, y + 1.5);
    y += lines.length * 3.2 + 4;
    doc.setFont('helvetica', 'normal');
  }

  // KPI-Karten (3 pro Reihe)
  function kpiCards(cards) {
    const perRow = 3, gap = 5;
    const cardW = (CW - (perRow - 1) * gap) / perRow;
    const cardH = 22;
    for (let i = 0; i < cards.length; i += perRow) {
      ensure(cardH + 3);
      const rowCards = cards.slice(i, i + perRow);
      rowCards.forEach((c, j) => {
        const x = ML + j * (cardW + gap);
        doc.setFillColor(250, 251, 253);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');
        const accent = c.accent ? hexToRgb(c.accent) : PRIMARY;
        doc.setFillColor(...accent);
        doc.roundedRect(x, y, 2.6, cardH, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...(c.valueColor || DARK));
        doc.text(String(c.value), x + 7, y + 10, { maxWidth: cardW - 9 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY);
        doc.text(doc.splitTextToSize(String(c.label), cardW - 9), x + 7, y + 16);
      });
      y += cardH + gap;
    }
  }

  // Donut-Diagramm mit Legende rechts (Wert + Anteil), Summe in der Mitte.
  function donutChart(items, currency) {
    if (!items.length) return;
    let data = items;
    if (data.length > 11) {
      const rest = data.slice(10);
      data = [
        ...data.slice(0, 10),
        { name: `Weitere (${rest.length})`, sum: rest.reduce((s, c) => s + c.sum, 0), color: REST_COLOR },
      ];
    }
    const sumAll = data.reduce((s, c) => s + c.sum, 0);
    if (sumAll <= 0) return;

    const R = 26, hole = 15;
    const rowH = 6.6;
    const blockH = Math.max(R * 2 + 2, data.length * rowH);
    ensure(blockH + 6);
    const cx = ML + R + 2;
    const cy = y + blockH / 2;

    // Segmente
    let a = -Math.PI / 2;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    const labelPos = [];
    data.forEach(it => {
      const frac = it.sum / sumAll;
      if (frac <= 0) return;
      const a1 = a + frac * Math.PI * 2;
      doc.setFillColor(...hexToRgb(it.color || colorOf[it.name] || REST_COLOR));
      drawDonutSlice(doc, cx, cy, hole, R, a, a1);
      if (frac >= 0.05) {
        const mid = (a + a1) / 2;
        const rm = (hole + R) / 2;
        labelPos.push({ x: cx + rm * Math.cos(mid), y: cy + rm * Math.sin(mid), txt: `${Math.round(frac * 100)} %` });
      }
      a = a1;
    });
    doc.setLineWidth(0.2);
    // Prozent-Labels auf den Segmenten
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    labelPos.forEach(l => doc.text(l.txt, l.x, l.y + 1.1, { align: 'center' }));

    // Summe in der Mitte (Schrift verkleinern, bis sie ins Loch passt)
    const centerTxt = fmtMoney(sumAll, currency);
    let fs = 10.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs);
    while (doc.getTextWidth(centerTxt) > hole * 2 - 5 && fs > 6) {
      fs -= 0.5;
      doc.setFontSize(fs);
    }
    doc.setTextColor(...DARK);
    doc.text(centerTxt, cx, cy + 0.4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...GRAY);
    doc.text('Summe', cx, cy + 4.6, { align: 'center' });

    // Legende rechts
    const lx = ML + R * 2 + 10;
    const lw = CW - (R * 2 + 10);
    let ly = y + Math.max(0, (blockH - data.length * rowH) / 2);
    data.forEach(it => {
      const pct = (it.sum / sumAll) * 100;
      doc.setFillColor(...hexToRgb(it.color || colorOf[it.name] || REST_COLOR));
      doc.roundedRect(lx, ly + 1.3, 3.2, 3.2, 0.7, 0.7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const name = doc.splitTextToSize(it.name, lw - 48)[0];
      doc.text(name, lx + 5.5, ly + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`${fmtMoney(it.sum, currency)} · ${pct.toFixed(1).replace('.', ',')} %`, lx + lw, ly + 4, { align: 'right' });
      ly += rowH;
    });

    y += blockH + 6;
  }

  // Horizontales Balkendiagramm
  function hBarChart(items, currency) {
    if (!items.length) return;
    const labelW = 40, valueW = 34, barArea = CW - labelW - valueW - 4;
    const maxVal = Math.max(...items.map(it => it.value), 0.0001);
    const barH = 6, rowGap = 4.2;
    // Block möglichst zusammenhalten
    ensure(Math.min(items.length * (barH + rowGap) + 2, PH - MT - MB - 10));
    items.forEach((it, i) => {
      ensure(barH + rowGap);
      const color = hexToRgb(it.color || CHART_COLORS[i % CHART_COLORS.length]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const lbl = doc.splitTextToSize(it.label, labelW - 2)[0];
      doc.text(lbl, ML, y + barH - 1.3);
      // track
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(ML + labelW, y, barArea, barH, 1.5, 1.5, 'F');
      const w = Math.max(1.2, (it.value / maxVal) * barArea);
      doc.setFillColor(...color);
      doc.roundedRect(ML + labelW, y, w, barH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const valTxt = `${fmtMoney(it.value, currency)}${it.pct != null ? '  ' + it.pct.toFixed(0) + '%' : ''}`;
      doc.text(valTxt, ML + CW, y + barH - 1.3, { align: 'right' });
      y += barH + rowGap;
    });
    y += 2;
  }

  // Höhe der Legende vorab berechnen, damit Legende + Diagramm als Block
  // zusammen auf eine Seite passen (kein Umbruch mittendrin).
  function measureLegendH(items) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const sw = 3, lineH = 5, itemGap = 6;
    let x = ML, h = lineH;
    items.forEach(it => {
      const w = sw + 1.5 + doc.getTextWidth(it.label) + itemGap;
      if (x + w > ML + CW) { x = ML; h += lineH; }
      x += w;
    });
    return h + 2;
  }

  // Farb-Legende (Swatch + Text), bricht automatisch um
  function legend(items) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const sw = 3, lineH = 5, itemGap = 6;
    let x = ML;
    items.forEach(it => {
      const tw = doc.getTextWidth(it.label);
      const w = sw + 1.5 + tw + itemGap;
      if (x + w > ML + CW) { x = ML; y += lineH; }
      doc.setFillColor(...hexToRgb(it.color));
      doc.roundedRect(x, y, sw, sw, 0.6, 0.6, 'F');
      doc.setTextColor(...DARK);
      doc.text(it.label, x + sw + 1.5, y + sw - 0.4);
      x += w;
    });
    y += lineH + 2;
  }

  // Gestapeltes Säulendiagramm (Zeitverlauf, Stapel = Kategorien)
  // mit Gitterlinien und Werte-Achse links.
  function stackedTimeChart(daysArr, catOrder, currency) {
    if (!daysArr.length) return;
    const present = catOrder.filter(c => daysArr.some(d => (d.segs[c] || 0) > 0));
    const legendItems = present.map(c => ({ label: c, color: colorOf[c] || REST_COLOR }));
    const H = 52, axisW = 14;
    const legH = measureLegendH(legendItems);
    ensure(legH + H + 12);
    legend(legendItems);

    const plotX = ML + axisW, plotW = CW - axisW;
    const baseY = y + H;
    const maxVal = Math.max(...daysArr.map(d => d.sum), 0.0001);
    const step = niceStep(maxVal, 4);
    const maxY = Math.max(step, Math.ceil(maxVal / step) * step);

    // Gitterlinien + Achsen-Beschriftung
    doc.setLineWidth(0.2);
    for (let v = 0; v <= maxY + step / 2; v += step) {
      const gy = baseY - (v / maxY) * (H - 6);
      doc.setDrawColor(...(v === 0 ? [203, 213, 225] : BORDER));
      doc.line(plotX, gy, ML + CW, gy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(fmtCompact(v), plotX - 1.5, gy + 1, { align: 'right' });
    }
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text(CUR_SYMBOLS[currency] || currency, plotX - 1.5, y + 1.5, { align: 'right' });

    const n = daysArr.length;
    const slot = plotW / n;
    const barW = Math.max(1.5, Math.min(slot * 0.66, 9));
    const labelEvery = Math.ceil(n / 14);
    daysArr.forEach((d, i) => {
      const x = plotX + i * slot + (slot - barW) / 2;
      let top = baseY;
      present.forEach(cat => {
        const v = d.segs[cat] || 0;
        if (v <= 0) return;
        const h = (v / maxY) * (H - 6);
        doc.setFillColor(...hexToRgb(colorOf[cat] || REST_COLOR));
        doc.rect(x, top - h, barW, h, 'F');
        top -= h;
      });
      if (i % labelEvery === 0) {
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY);
        const dd = d.date.split('-');
        doc.text(`${dd[2]}.${dd[1]}`, x + barW / 2, baseY + 3.5, { align: 'center' });
      }
    });
    y = baseY + 8;
    doc.setLineWidth(0.2);
  }

  // Divergierendes Balkendiagramm für die Bilanz pro Person
  // (positiv = bekommt Geld, negativ = schuldet Geld).
  function balanceChart(rows, currency) {
    if (!rows.length) return;
    const labelW = 36, valW = 27;
    const plotW = CW - labelW;
    const half = plotW / 2 - valW;
    const rowH = 7, gap = 3.4;
    const blockH = rows.length * (rowH + gap) + 4;
    ensure(blockH);
    const axisX = ML + labelW + plotW / 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(axisX, y - 1, axisX, y + rows.length * (rowH + gap) - gap + 1);
    doc.setLineWidth(0.2);
    const maxAbs = Math.max(...rows.map(r => Math.abs(r.balance)), 0.0001);
    rows.forEach(r => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(doc.splitTextToSize(r.person, labelW - 3)[0], ML, y + rowH - 2);
      const neutral = Math.abs(r.balance) < 0.005;
      const pos = r.balance >= 0;
      const color = neutral ? [148, 163, 184] : pos ? [22, 163, 74] : [220, 38, 38];
      const w = Math.max(0.8, (Math.abs(r.balance) / maxAbs) * half);
      const bx = pos ? axisX : axisX - w;
      doc.setFillColor(...color);
      doc.roundedRect(bx, y, w, rowH, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...color);
      const valTxt = `${pos && !neutral ? '+' : ''}${fmtMoney(r.balance, currency)}`;
      if (pos) doc.text(valTxt, axisX + w + 2, y + rowH - 2);
      else doc.text(valTxt, axisX - w - 2, y + rowH - 2, { align: 'right' });
      y += rowH + gap;
    });
    y += 4;
  }

  // Generische Tabelle mit Seitenumbruch + wiederholtem Kopf
  function table(columns, rows, opts = {}) {
    const fs = opts.fontSize || 9;
    const lh = fontH(fs);
    const padY = 2.0;
    const positions = [];
    let xx = ML;
    columns.forEach(c => { positions.push(xx); xx += c.width; });

    const drawHead = () => {
      const hh = lh + 2 * padY;
      doc.setFillColor(...HEADERC);
      doc.rect(ML, y, CW, hh, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      doc.setTextColor(255, 255, 255);
      columns.forEach((c, i) => {
        const tx = c.align === 'right' ? positions[i] + c.width - CPX : positions[i] + CPX;
        doc.text(c.label, tx, y + padY + lh * 0.8, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += hh;
    };

    ensure(lh * 3);
    drawHead();
    doc.setFont('helvetica', 'normal');

    rows.forEach((row, ri) => {
      const cellLines = columns.map(c => {
        let txt = row[c.key];
        txt = (txt === 0 ? '0' : (txt == null ? '' : txt));
        txt = String(txt);
        const lines = doc.splitTextToSize(txt, c.width - 2 * CPX);
        return c.wrap ? lines : [lines.length > 1 ? lines[0].replace(/.$/, '…') : lines[0]];
      });
      const maxLines = Math.max(1, ...cellLines.map(l => l.length));
      const rowH = maxLines * lh + 2 * padY;
      if (ensure(rowH)) drawHead();
      if (ri % 2 === 1) { doc.setFillColor(...ZEBRA); doc.rect(ML, y, CW, rowH, 'F'); }
      doc.setFontSize(fs);
      columns.forEach((c, i) => {
        doc.setTextColor(...(c.colorFor ? c.colorFor(row) : DARK));
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal');
        const tx = c.align === 'right' ? positions[i] + c.width - CPX : positions[i] + CPX;
        cellLines[i].forEach((ln, li) => {
          doc.text(ln, tx, y + padY + lh * 0.8 + li * lh, { align: c.align === 'right' ? 'right' : 'left' });
        });
      });
      y += rowH;
    });

    if (opts.totalRow) {
      const hh = lh + 2 * padY;
      if (ensure(hh)) drawHead();
      doc.setFillColor(...ZEBRA);
      doc.rect(ML, y, CW, hh, 'F');
      doc.setDrawColor(...HEADERC);
      doc.setLineWidth(0.4);
      doc.line(ML, y, ML + CW, y);
      doc.setLineWidth(0.2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      doc.setTextColor(...DARK);
      columns.forEach((c, i) => {
        const val = opts.totalRow[c.key];
        if (val == null) return;
        const tx = c.align === 'right' ? positions[i] + c.width - CPX : positions[i] + CPX;
        doc.text(String(val), tx, y + padY + lh * 0.8, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += hh;
    }
    // Untere Begrenzung
    doc.setDrawColor(...BORDER);
    doc.line(ML, y, ML + CW, y);
    y += 6;
  }

  function note(text) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(text, ML, y + 2);
    y += 8;
    doc.setFont('helvetica', 'normal');
  }

  // ---------------- Inhalt ----------------
  const sym = CUR_SYMBOLS[displayCurrency] || displayCurrency;
  const zeitraum = firstDate && lastDate
    ? (firstDate === lastDate ? fmtDate(firstDate) : `${fmtDate(firstDate)} – ${fmtDate(lastDate)}`)
    : 'Keine Daten';
  const genDate = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setProperties({ title: `${vacation?.name || 'Urlaubsausgaben'} – Ausgabenbericht` });

  header(vacation?.name || 'Urlaubsausgaben', `Zeitraum: ${zeitraum}   •   Erstellt am ${genDate}   •   Währung: ${displayCurrency} (${sym})`);

  // Zusammenfassung
  if (cfg.sections.summary) {
    sectionTitle('Zusammenfassung', 26);
    const summaryCards = [
      { label: 'Gesamtausgaben', value: fmtMoney(total, displayCurrency), accent: '#0ea5e9' },
      { label: 'Anzahl Ausgaben', value: String(count), accent: '#6366f1' },
      { label: 'Ø pro Tag', value: fmtMoney(dailyAvg, displayCurrency), accent: '#10b981' },
      { label: 'Zeitraum (Tage)', value: String(days), accent: '#f59e0b' },
      { label: 'Kategorien', value: String(catRows.length), accent: '#ec4899' },
    ];
    if (isShared) summaryCards.push({ label: 'Teilnehmer', value: String(participants.length), accent: '#8b5cf6' });
    kpiCards(summaryCards);
  }

  // Eigene KPIs
  const userKpis = vacation?.kpis || [];
  if (cfg.sections.kpis && userKpis.length) {
    sectionTitle('Kennzahlen (KPIs)', 26);
    const ctx = { expenses: list, rates, displayCurrency, participants, payments };
    const cards = userKpis.map((k, i) => {
      const v = kpiValue(k, ctx);
      const isCount = k.type === 'count' || k.type === 'category_count';
      const isBal = k.type === 'person_balance';
      const cur = k.currency || displayCurrency;
      let value, valueColor;
      if (isCount) value = String(Math.round(v));
      else if (isBal) { value = `${v > 0 ? '+' : ''}${fmtMoney(v, cur)}`; valueColor = v > 0.01 ? [22, 163, 74] : v < -0.01 ? [220, 38, 38] : DARK; }
      else value = fmtMoney(v, cur);
      return { label: k.label || KPI_TYPE_LABELS[k.type] || 'KPI', value, valueColor, accent: CHART_COLORS[i % CHART_COLORS.length] };
    });
    kpiCards(cards);
  }

  // Ausgaben nach Kategorie (Donut / Balken / Tabelle)
  const wantCatSection = cfg.charts.catDonut.enabled || cfg.charts.catBar.enabled || cfg.sections.categoryTable;
  if (wantCatSection) {
    sectionTitle('Ausgaben nach Kategorie', cfg.charts.catDonut.enabled ? 64 : 30);
    if (!catRows.length) {
      note('Keine Ausgaben erfasst.');
    } else {
      const bothCharts = cfg.charts.catDonut.enabled && cfg.charts.catBar.enabled;
      if (cfg.charts.catDonut.enabled) {
        const rowsD = catRowsFor(cfg.charts.catDonut.excluded);
        if (rowsD.length) {
          if (bothCharts) subLabel('Anteile', Math.max(54, Math.min(rowsD.length, 11) * 6.6) + 6);
          donutChart(rowsD.map(c => ({ name: c.name, sum: c.sum, color: colorOf[c.name] })), displayCurrency);
          chartNote(cfg.charts.catDonut.excluded);
        }
      }
      if (cfg.charts.catBar.enabled) {
        const rowsB = catRowsFor(cfg.charts.catBar.excluded);
        if (rowsB.length) {
          if (bothCharts) subLabel('Kategorien im Vergleich', Math.min(rowsB.length, 14) * 10.2 + 2);
          hBarChart(rowsB.slice(0, 14).map(c => ({ label: c.name, value: c.sum, pct: c.pct, color: colorOf[c.name] })), displayCurrency);
          chartNote(cfg.charts.catBar.excluded);
        }
      }
      if (cfg.sections.categoryTable) {
        table(
          [
            { key: 'name', label: 'Kategorie', width: 96, wrap: true },
            { key: 'count', label: 'Anzahl', width: 24, align: 'right' },
            { key: 'sum', label: `Betrag (${sym})`, width: 36, align: 'right' },
            { key: 'pct', label: 'Anteil', width: 26, align: 'right' },
          ],
          catRows.map(c => ({ name: c.name, count: c.count, sum: fmtNumber(c.sum), pct: c.pct.toFixed(1) + '%' })),
          { totalRow: { name: 'Gesamt', count: count, sum: fmtNumber(total), pct: '100%' } }
        );
      }
    }
  }

  // Zeitverlauf (gestapelt nach Kategorien)
  if (cfg.charts.time.enabled) {
    const dayRows = dayRowsFor(cfg.charts.time.excluded);
    if (dayRows.length > 1) {
      sectionTitle('Ausgaben im Zeitverlauf', 70);
      const timeCats = catRows.map(c => c.name).filter(c => !(cfg.charts.time.excluded || []).includes(c));
      stackedTimeChart(dayRows, timeCats, displayCurrency);
      chartNote(cfg.charts.time.excluded);
    }
  }

  // Geteilte Bilanz
  if (isShared && participants.length && (cfg.charts.balance.enabled || cfg.sections.balanceTable)) {
    sectionTitle('Bilanz pro Person', Math.min(balanceRows.length * 11 + 14, 80));
    if (cfg.charts.balance.enabled) {
      balanceChart(balanceRows, displayCurrency);
    }
    if (cfg.sections.balanceTable) {
      table(
        [
          { key: 'person', label: 'Teilnehmer', width: 92, wrap: true },
          { key: 'paid', label: `Bezahlt (${sym})`, width: 45, align: 'right' },
          { key: 'balance', label: `Saldo (${sym})`, width: 45, align: 'right', colorFor: (r) => r._bal > 0.01 ? [22, 163, 74] : r._bal < -0.01 ? [220, 38, 38] : DARK },
        ],
        balanceRows.map(b => ({ person: b.person, paid: fmtNumber(b.paid), balance: `${b.balance > 0 ? '+' : ''}${fmtNumber(b.balance)}`, _bal: b.balance }))
      );
      if (settlements.length) {
        sectionTitle('Ausgleichszahlungen', 24);
        table(
          [
            { key: 'from', label: 'Von', width: 70, wrap: true },
            { key: 'to', label: 'An', width: 70, wrap: true },
            { key: 'amount', label: `Betrag (${sym})`, width: 42, align: 'right' },
          ],
          settlements.map(s => ({ from: s.from, to: s.to, amount: fmtNumber(s.amount) }))
        );
      }
    }
  }

  // Alle Ausgaben
  if (cfg.sections.expenses) {
    sectionTitle('Alle Ausgaben', 30);
    if (list.length) {
      const sorted = list.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.name || '').localeCompare(b.name || ''));
      const cols = [{ key: 'date', label: 'Datum', width: 20 }];
      let nameW = CW - 20 - 36 - 30;
      if (isShared) nameW -= 30;
      if (multiCurrency) nameW -= 28;
      cols.push({ key: 'name', label: 'Ausgabe', width: nameW, wrap: true });
      cols.push({ key: 'category', label: 'Kategorie', width: 36, wrap: true });
      if (isShared) cols.push({ key: 'paidBy', label: 'Bezahlt von', width: 30, wrap: true });
      if (multiCurrency) cols.push({ key: 'orig', label: 'Original', width: 28, align: 'right' });
      cols.push({ key: 'amount', label: `Betrag (${sym})`, width: 30, align: 'right' });

      const rows = sorted.map(e => {
        const conv = convert(e.amount, e.exchangeRate, displayCurrency, rates);
        return {
          date: fmtDate(e.date),
          name: e.name || '(ohne Name)',
          category: e.category || '—',
          paidBy: e.paidBy || '—',
          orig: multiCurrency ? fmtMoney(parseFloat(e.amount) || 0, e.currency || displayCurrency) : '',
          amount: fmtNumber(conv),
        };
      });
      const totalRow = { date: '', name: 'Gesamt', category: '', paidBy: '', orig: '', amount: fmtNumber(total) };
      table(cols, rows, { fontSize: 8.5, totalRow });
    } else {
      note('Keine Ausgaben erfasst.');
    }
  }

  // ---- Fußzeile auf allen Seiten ----
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, PH - MB + 4, ML + CW, PH - MB + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(vacation?.name || 'Urlaubsausgaben', ML, PH - MB + 8.5);
    doc.text(`Seite ${p} / ${pageCount}`, ML + CW, PH - MB + 8.5, { align: 'right' });
    doc.text('Urlaubsausgaben', PW / 2, PH - MB + 8.5, { align: 'center' });
  }

  doc.save(`${sanitizeFilename(vacation?.name)}_Ausgaben.pdf`);
}
