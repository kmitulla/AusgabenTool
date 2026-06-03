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
// Erzeugt ein sauberes A4-PDF mit Deckkopf, KPIs, Diagrammen (vektoriell
// gezeichnet), Kategorie-Tabelle und vollständiger Ausgabenliste mit
// automatischen Seitenumbrüchen, Kopf-/Fußzeilen und Beschriftungen.
// ============================================================================

const CUR_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', TRY: '₺', THB: '฿', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', HRK: 'kn', BGN: 'лв', RON: 'lei' };
const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#14b8a6'];

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

export function exportVacationPDF(vacation, expenses) {
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

  // Kategorie-Aufschlüsselung
  const catMap = {};
  list.forEach(e => {
    const key = e.category || 'Ohne Kategorie';
    if (!catMap[key]) catMap[key] = { sum: 0, count: 0 };
    catMap[key].sum += convert(e.amount, e.exchangeRate, displayCurrency, rates);
    catMap[key].count += 1;
  });
  const catRows = Object.entries(catMap)
    .map(([name, v]) => ({ name, sum: v.sum, count: v.count, pct: total > 0 ? (v.sum / total) * 100 : 0 }))
    .sort((a, b) => b.sum - a.sum);

  // Tageswerte (für Zeitverlauf-Diagramm)
  const dayMap = {};
  list.forEach(e => {
    if (!e.date) return;
    dayMap[e.date] = (dayMap[e.date] || 0) + convert(e.amount, e.exchangeRate, displayCurrency, rates);
  });
  const dayRows = Object.entries(dayMap).map(([date, sum]) => ({ date, sum })).sort((a, b) => a.date.localeCompare(b.date));

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
  const CPX = 2.4, CPY = 0; // cell padding x; y handled per row
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

  function sectionTitle(text) {
    ensure(14);
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(ML, y - 0.5, 3, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...HEADERC);
    doc.text(text, ML + 6, y + 4);
    y += 9;
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

  // Horizontales Balkendiagramm
  function hBarChart(items, currency) {
    if (!items.length) return;
    const labelW = 40, valueW = 34, barArea = CW - labelW - valueW - 4;
    const maxVal = Math.max(...items.map(it => it.value), 0.0001);
    const barH = 6, rowGap = 4.2;
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

  // Vertikales Balkendiagramm (Zeitverlauf)
  function vBarChart(items, currency) {
    if (!items.length) return;
    const H = 42;
    ensure(H + 14);
    const baseY = y + H;
    const maxVal = Math.max(...items.map(it => it.sum), 0.0001);
    // Achsenlinie
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(ML, baseY, ML + CW, baseY);
    // Max-Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(fmtMoney(maxVal, currency), ML + CW, y + 2, { align: 'right' });

    const n = items.length;
    const slot = CW / n;
    const barW = Math.min(slot * 0.6, 9);
    const labelEvery = Math.ceil(n / 12);
    items.forEach((it, i) => {
      const h = (it.sum / maxVal) * (H - 4);
      const x = ML + i * slot + (slot - barW) / 2;
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(x, baseY - h, barW, h, 0.8, 0.8, 'F');
      if (i % labelEvery === 0) {
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY);
        const d = it.date.split('-');
        doc.text(`${d[2]}.${d[1]}`, x + barW / 2, baseY + 3.5, { align: 'center' });
      }
    });
    y = baseY + 7;
    doc.setLineWidth(0.2);
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

  header(vacation?.name || 'Urlaubsausgaben', `Zeitraum: ${zeitraum}   •   Erstellt am ${genDate}   •   Währung: ${displayCurrency} (${sym})`);

  // Zusammenfassung
  sectionTitle('Zusammenfassung');
  const summaryCards = [
    { label: 'Gesamtausgaben', value: fmtMoney(total, displayCurrency), accent: '#0ea5e9' },
    { label: 'Anzahl Ausgaben', value: String(count), accent: '#6366f1' },
    { label: 'Ø pro Tag', value: fmtMoney(dailyAvg, displayCurrency), accent: '#10b981' },
    { label: 'Zeitraum (Tage)', value: String(days), accent: '#f59e0b' },
    { label: 'Kategorien', value: String(catRows.length), accent: '#ec4899' },
  ];
  if (isShared) summaryCards.push({ label: 'Teilnehmer', value: String(participants.length), accent: '#8b5cf6' });
  kpiCards(summaryCards);

  // Eigene KPIs
  const userKpis = vacation?.kpis || [];
  if (userKpis.length) {
    sectionTitle('Kennzahlen (KPIs)');
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

  // Ausgaben nach Kategorie
  sectionTitle('Ausgaben nach Kategorie');
  if (catRows.length) {
    hBarChart(catRows.slice(0, 12).map((c, i) => ({ label: c.name, value: c.sum, pct: c.pct, color: CHART_COLORS[i % CHART_COLORS.length] })), displayCurrency);
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
  } else {
    note('Keine Ausgaben erfasst.');
  }

  // Zeitverlauf
  if (dayRows.length > 1) {
    sectionTitle('Ausgaben im Zeitverlauf');
    vBarChart(dayRows, displayCurrency);
  }

  // Geteilte Bilanz
  if (isShared && participants.length) {
    sectionTitle('Bilanz pro Person');
    table(
      [
        { key: 'person', label: 'Teilnehmer', width: 92, wrap: true },
        { key: 'paid', label: `Bezahlt (${sym})`, width: 45, align: 'right' },
        { key: 'balance', label: `Saldo (${sym})`, width: 45, align: 'right', colorFor: (r) => r._bal > 0.01 ? [22, 163, 74] : r._bal < -0.01 ? [220, 38, 38] : DARK },
      ],
      balanceRows.map(b => ({ person: b.person, paid: fmtNumber(b.paid), balance: `${b.balance > 0 ? '+' : ''}${fmtNumber(b.balance)}`, _bal: b.balance }))
    );
    if (settlements.length) {
      sectionTitle('Ausgleichszahlungen');
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

  // Alle Ausgaben
  sectionTitle('Alle Ausgaben');
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
