import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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

const currencySymbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', TRY: '₺', THB: '฿' };

export function exportSoloVacationExcel(expenses, filename, displayCurrency = 'EUR', rates = {}, vacName = 'Urlaub') {
  const wb = XLSX.utils.book_new();
  const sym = currencySymbols[displayCurrency] || displayCurrency;

  const dates = (expenses || []).map(e => e.date).filter(Boolean).sort();
  const firstDate = dates[0] || '';
  const lastDate = dates[dates.length - 1] || '';
  const vacDays = firstDate && lastDate
    ? Math.max(1, Math.round((new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24)) + 1)
    : 0;

  const convertAmount = (amount, exchangeRate) => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(exchangeRate) || 1;
    return amt / rate;
  };

  // Category totals
  const categoryTotals = {};
  (expenses || []).forEach(e => {
    const cat = e.category || 'Sonstiges';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + convertAmount(e.amount, e.exchangeRate);
  });
  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const allCategories = Object.keys(categoryTotals).sort();

  // Daily dates
  const allDates = [];
  if (firstDate && lastDate) {
    for (let d = new Date(firstDate); d <= new Date(lastDate); d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }
  }

  // Sheet 1: Übersicht
  const s1Rows = [];
  addRow(s1Rows, [`Urlaubsübersicht: ${vacName}`]);
  addRow(s1Rows, []);
  addRow(s1Rows, ['Zeitraum', firstDate && lastDate ? `${fmtDate(firstDate)} – ${fmtDate(lastDate)}` : 'Keine Daten']);
  addRow(s1Rows, ['Urlaubstage', vacDays]);
  addRow(s1Rows, ['Anzahl Ausgaben', (expenses || []).length]);
  addRow(s1Rows, [`Gesamtausgaben (${sym})`, fmt(grandTotal)]);
  addRow(s1Rows, [`Durchschnitt/Tag (${sym})`, vacDays > 0 ? fmt(grandTotal / vacDays) : 0]);
  addRow(s1Rows, []);
  addRow(s1Rows, ['Ausgaben nach Kategorie', `Betrag (${sym})`, 'Anteil (%)']);
  Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, total]) => {
    addRow(s1Rows, [cat, fmt(total), grandTotal > 0 ? fmt((total / grandTotal) * 100, 1) + '%' : '0%']);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
  setColWidths(ws1, [30, 22, 14]);
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Übersicht');

  // Sheet 2: Alle Ausgaben
  const s2Rows = [];
  addRow(s2Rows, [`Alle Ausgaben – ${vacName}`]);
  addRow(s2Rows, []);
  addRow(s2Rows, ['Nr.', 'Datum', 'Ausgabe', 'Betrag', 'Währung', `Betrag (${sym})`, 'Kategorie', 'Notiz']);
  const sortedExpenses = [...(expenses || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  sortedExpenses.forEach((e, i) => {
    addRow(s2Rows, [
      i + 1,
      fmtDate(e.date),
      e.name || '',
      fmt(parseFloat(e.amount) || 0),
      e.currency || displayCurrency,
      fmt(convertAmount(e.amount, e.exchangeRate)),
      e.category || '',
      e.note || '',
    ]);
  });
  addRow(s2Rows, []);
  addRow(s2Rows, ['', '', 'GESAMT', '', '', fmt(grandTotal), '', '']);

  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  setColWidths(ws2, [6, 14, 25, 12, 10, 14, 16, 20]);
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Ausgaben');

  // Sheet 3: Tagesübersicht
  if (allDates.length > 0) {
    const s3Rows = [];
    addRow(s3Rows, [`Tagesübersicht – ${vacName}`]);
    addRow(s3Rows, []);
    addRow(s3Rows, ['Datum', ...allCategories, 'Gesamt']);

    const dailyData = {};
    allDates.forEach(date => {
      dailyData[date] = {};
      allCategories.forEach(cat => { dailyData[date][cat] = 0; });
    });
    (expenses || []).forEach(e => {
      if (e.date && dailyData[e.date]) {
        const cat = e.category || 'Sonstiges';
        if (dailyData[e.date][cat] !== undefined) {
          dailyData[e.date][cat] += convertAmount(e.amount, e.exchangeRate);
        }
      }
    });

    allDates.forEach(date => {
      const row = [fmtDate(date)];
      let dayTotal = 0;
      allCategories.forEach(cat => {
        const val = fmt(dailyData[date][cat]);
        row.push(val);
        dayTotal += dailyData[date][cat];
      });
      row.push(fmt(dayTotal));
      addRow(s3Rows, row);
    });
    addRow(s3Rows, ['GESAMT', ...allCategories.map(cat => fmt(categoryTotals[cat])), fmt(grandTotal)]);

    const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
    setColWidths(ws3, [14, ...allCategories.map(() => 14), 14]);
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(allCategories.length, 6) } }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Tagesübersicht');
  }

  XLSX.writeFile(wb, filename);
}

function fmt(val, decimals = 2) {
  const n = parseFloat(val) || 0;
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function addRow(rows, values) {
  rows.push(values);
  return rows.length - 1;
}

export function exportSharedVacationExcel(expenses, settlements, participants, filename, personStats = {}, displayCurrency = 'EUR', payments = [], vacNameParam = '') {
  const wb = XLSX.utils.book_new();
  const sym = currencySymbols[displayCurrency] || displayCurrency;

  // --- Vacation duration ---
  const dates = (expenses || []).map(e => e.date).filter(Boolean).sort();
  const firstDate = dates[0] || '';
  const lastDate = dates[dates.length - 1] || '';
  const vacDays = firstDate && lastDate
    ? Math.max(1, Math.round((new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24)) + 1)
    : 0;
  const vacName = vacNameParam || filename.replace(/\.xlsx$/, '').replace(/^Gemeinsamer_Urlaub_/, '').replace(/_/g, ' ');

  // --- Category totals ---
  const categoryTotals = {};
  (expenses || []).forEach(e => {
    const cat = e.category || 'Sonstiges';
    const amount = (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
  });

  // --- Person totals (paid) ---
  const personPaid = {};
  participants.forEach(p => { personPaid[p] = 0; });
  (expenses || []).forEach(e => {
    if (e.paidBy && personPaid[e.paidBy] !== undefined) {
      personPaid[e.paidBy] += (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
    }
  });
  const grandTotal = Object.values(personPaid).reduce((s, v) => s + v, 0);

  // --- Daily breakdown by category ---
  const allDates = [];
  if (firstDate && lastDate) {
    for (let d = new Date(firstDate); d <= new Date(lastDate); d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }
  }
  const allCategories = Object.keys(categoryTotals).sort();

  // ============================
  // SHEET 1: Übersicht
  // ============================
  const s1Rows = [];
  addRow(s1Rows, [`Urlaubsübersicht: ${vacName}`]);
  addRow(s1Rows, []);
  addRow(s1Rows, ['Zeitraum', firstDate && lastDate ? `${fmtDate(firstDate)} – ${fmtDate(lastDate)}` : 'Keine Daten']);
  addRow(s1Rows, ['Urlaubstage', vacDays]);
  addRow(s1Rows, ['Anzahl Ausgaben', (expenses || []).length]);
  addRow(s1Rows, [`Gesamtausgaben (${sym})`, fmt(grandTotal)]);
  addRow(s1Rows, [`Durchschnitt/Tag (${sym})`, vacDays > 0 ? fmt(grandTotal / vacDays) : 0]);
  addRow(s1Rows, []);

  // Category summary
  addRow(s1Rows, ['Ausgaben nach Kategorie', `Betrag (${sym})`, 'Anteil (%)']);
  const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  sortedCats.forEach(([cat, total]) => {
    addRow(s1Rows, [cat, fmt(total), grandTotal > 0 ? fmt((total / grandTotal) * 100, 1) + '%' : '0%']);
  });
  addRow(s1Rows, []);

  // Person summary
  addRow(s1Rows, ['Ausgaben nach Person', `Bezahlt (${sym})`, 'Anteil (%)']);
  participants.forEach(p => {
    addRow(s1Rows, [p, fmt(personPaid[p]), grandTotal > 0 ? fmt((personPaid[p] / grandTotal) * 100, 1) + '%' : '0%']);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
  setColWidths(ws1, [30, 22, 14]);
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Übersicht');

  // ============================
  // SHEET 2: Alle Ausgaben
  // ============================
  const s2Rows = [];
  addRow(s2Rows, [`Alle Ausgaben – ${vacName}`]);
  addRow(s2Rows, []);
  addRow(s2Rows, ['Nr.', 'Datum', 'Ausgabe', 'Betrag', 'Währung', `Betrag (${sym})`, 'Kategorie', 'Bezahlt von', 'Bezahlt für', 'Notiz']);

  const sortedExpenses = [...(expenses || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  sortedExpenses.forEach((e, i) => {
    const converted = (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
    addRow(s2Rows, [
      i + 1,
      fmtDate(e.date),
      e.name || '',
      fmt(parseFloat(e.amount) || 0),
      e.currency || displayCurrency,
      fmt(converted),
      e.category || '',
      e.paidBy || '',
      (e.paidFor || []).join(', '),
      e.note || '',
    ]);
  });

  // Totals row
  addRow(s2Rows, []);
  const totalConverted = sortedExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1), 0);
  addRow(s2Rows, ['', '', 'GESAMT', '', '', fmt(totalConverted), '', '', '', '']);

  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  setColWidths(ws2, [6, 14, 25, 12, 10, 14, 16, 16, 25, 20]);
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Ausgaben');

  // ============================
  // SHEET 3: Personen & Bilanzen
  // ============================
  const s3Rows = [];
  addRow(s3Rows, [`Personen & Bilanzen – ${vacName}`]);
  addRow(s3Rows, []);

  // Person balance table
  addRow(s3Rows, ['Teilnehmer', `Bezahlt (${sym})`, `Anteil/Schuld (${sym})`, `Bilanz (${sym})`, 'Status']);
  participants.forEach(p => {
    const stats = personStats[p] || { paid: 0, owes: 0 };
    const balance = fmt(stats.paid - stats.owes);
    const status = balance > 0.01 ? 'Bekommt Geld' : balance < -0.01 ? 'Schuldet Geld' : 'Ausgeglichen';
    addRow(s3Rows, [p, fmt(stats.paid), fmt(stats.owes), balance, status]);
  });
  addRow(s3Rows, []);

  // Settlements
  addRow(s3Rows, ['Ausgleichszahlungen']);
  if (settlements.length === 0) {
    addRow(s3Rows, ['Keine Ausgleichszahlungen nötig']);
  } else {
    addRow(s3Rows, ['Von', 'An', `Betrag (${sym})`]);
    settlements.forEach(s => {
      addRow(s3Rows, [s.from, s.to, fmt(s.amount)]);
    });
  }
  addRow(s3Rows, []);

  // Person-to-person payments (recorded transfers between participants)
  if (payments && payments.length > 0) {
    addRow(s3Rows, ['Zahlungen untereinander']);
    addRow(s3Rows, ['Datum', 'Von', 'An', `Betrag (${sym})`, 'Notiz']);
    payments.forEach(pay => {
      addRow(s3Rows, [fmtDate(pay.date), pay.from, pay.to, fmt(parseFloat(pay.amount) || 0), pay.note || '']);
    });
    addRow(s3Rows, []);
  }

  // Direct payments from expenses
  addRow(s3Rows, ['Bereits getätigte Zahlungen (Direktzahlungen bei Ausgaben)']);
  const directPayments = [];
  (expenses || []).forEach(e => {
    if (e.directlyPaid) {
      Object.entries(e.directlyPaid).forEach(([person, paid]) => {
        if (paid && person !== e.paidBy) {
          const share = e.paidForAmounts?.[person]
            ? (parseFloat(e.paidForAmounts[person]) || 0) / (parseFloat(e.exchangeRate) || 1)
            : ((parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1)) / (e.paidFor?.length || 1);
          directPayments.push({
            date: e.date,
            from: person,
            to: e.paidBy,
            amount: share,
            reason: e.name || 'Ausgabe',
          });
        }
      });
    }
  });
  if (directPayments.length === 0) {
    addRow(s3Rows, ['Keine Direktzahlungen erfasst']);
  } else {
    addRow(s3Rows, ['Datum', 'Von', 'An', `Betrag (${sym})`, 'Ausgabe']);
    directPayments.forEach(dp => {
      addRow(s3Rows, [fmtDate(dp.date), dp.from, dp.to, fmt(dp.amount), dp.reason]);
    });
  }
  addRow(s3Rows, []);

  // Detailed: What each person paid for whom
  addRow(s3Rows, ['Detailübersicht: Wer hat was für wen bezahlt']);
  addRow(s3Rows, []);
  participants.forEach(p => {
    addRow(s3Rows, [`${p} – Bezahlte Ausgaben`]);
    addRow(s3Rows, ['Datum', 'Ausgabe', `Betrag (${sym})`, 'Kategorie', 'Bezahlt für']);
    const paidExps = sortedExpenses.filter(e => e.paidBy === p);
    if (paidExps.length === 0) {
      addRow(s3Rows, ['Keine Ausgaben']);
    } else {
      paidExps.forEach(e => {
        const converted = (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
        addRow(s3Rows, [fmtDate(e.date), e.name || '', fmt(converted), e.category || '', (e.paidFor || []).join(', ')]);
      });
      const pTotal = paidExps.reduce((s, e) => s + (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1), 0);
      addRow(s3Rows, ['', 'Summe', fmt(pTotal), '', '']);
    }
    addRow(s3Rows, []);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
  setColWidths(ws3, [18, 22, 22, 16, 20]);
  ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Personen & Bilanzen');

  // ============================
  // SHEET 4: Zeitverlauf (Daily breakdown)
  // ============================
  if (allDates.length > 0) {
    const s4Rows = [];
    addRow(s4Rows, [`Tagesübersicht – ${vacName}`]);
    addRow(s4Rows, []);

    // Header: Date | Category1 | Category2 | ... | Gesamt
    const header = ['Datum', ...allCategories, 'Gesamt'];
    addRow(s4Rows, header);

    const dailyData = {};
    allDates.forEach(date => {
      dailyData[date] = {};
      allCategories.forEach(cat => { dailyData[date][cat] = 0; });
    });
    (expenses || []).forEach(e => {
      if (e.date && dailyData[e.date]) {
        const cat = e.category || 'Sonstiges';
        const amount = (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
        if (dailyData[e.date][cat] !== undefined) {
          dailyData[e.date][cat] += amount;
        }
      }
    });

    allDates.forEach(date => {
      const row = [fmtDate(date)];
      let dayTotal = 0;
      allCategories.forEach(cat => {
        const val = fmt(dailyData[date][cat]);
        row.push(val);
        dayTotal += dailyData[date][cat];
      });
      row.push(fmt(dayTotal));
      addRow(s4Rows, row);
    });

    // Totals row
    const totalRow = ['GESAMT'];
    allCategories.forEach(cat => {
      totalRow.push(fmt(categoryTotals[cat]));
    });
    totalRow.push(fmt(grandTotal));
    addRow(s4Rows, totalRow);

    addRow(s4Rows, []);

    // Person per day
    addRow(s4Rows, ['Ausgaben pro Person und Tag']);
    addRow(s4Rows, []);
    const pHeader = ['Datum', ...participants, 'Gesamt'];
    addRow(s4Rows, pHeader);

    const dailyPerson = {};
    allDates.forEach(date => {
      dailyPerson[date] = {};
      participants.forEach(p => { dailyPerson[date][p] = 0; });
    });
    (expenses || []).forEach(e => {
      if (e.date && dailyPerson[e.date] && e.paidBy && dailyPerson[e.date][e.paidBy] !== undefined) {
        dailyPerson[e.date][e.paidBy] += (parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1);
      }
    });

    allDates.forEach(date => {
      const row = [fmtDate(date)];
      let dayTotal = 0;
      participants.forEach(p => {
        const val = fmt(dailyPerson[date][p]);
        row.push(val);
        dayTotal += dailyPerson[date][p];
      });
      row.push(fmt(dayTotal));
      addRow(s4Rows, row);
    });

    const pTotalRow = ['GESAMT'];
    participants.forEach(p => { pTotalRow.push(fmt(personPaid[p])); });
    pTotalRow.push(fmt(grandTotal));
    addRow(s4Rows, pTotalRow);

    const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
    const s4Widths = [14, ...allCategories.map(() => 14), 14];
    setColWidths(ws4, s4Widths);
    ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(allCategories.length, 6) } }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Tagesübersicht');
  }

  XLSX.writeFile(wb, filename);
}

export async function exportSharedVacationPDF(elementId, filename) {
  await exportAsPDF(elementId, filename);
}
