import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler } from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { updateVacation, calculateDebts } from '../utils/db';
import { useVacation } from '../contexts/VacationContext';
import { Plus, Trash2, Edit3, TrendingUp, DollarSign, Calendar, BarChart3, PieChart, X, Eye, EyeOff, Users, AlignLeft, Percent, Clock } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler);

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#14b8a6'];
// Subtle accent palette for iOS-Liquid-Glass KPI tiles (color used only as a soft tint underneath translucent white)
const KPI_ACCENTS = [
  { tint: '#6366f1', soft: '#818cf8' }, // indigo
  { tint: '#ec4899', soft: '#f472b6' }, // pink
  { tint: '#0ea5e9', soft: '#38bdf8' }, // sky
  { tint: '#10b981', soft: '#34d399' }, // emerald
  { tint: '#f59e0b', soft: '#fbbf24' }, // amber
  { tint: '#8b5cf6', soft: '#a78bfa' }, // violet
  { tint: '#14b8a6', soft: '#2dd4bf' }, // teal
  { tint: '#f97316', soft: '#fb923c' }, // orange
  { tint: '#ef4444', soft: '#f87171' }, // red
  { tint: '#84cc16', soft: '#a3e635' }, // lime
  { tint: '#06b6d4', soft: '#22d3ee' }, // cyan
  { tint: '#a855f7', soft: '#c084fc' }, // purple
];
const currencySymbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', TRY: '₺', THB: '฿' };

function genId() { return Math.random().toString(36).substring(2, 9); }

// Scriptable helpers for stacked bars: round only the outermost *visible, non-zero* segment of each bar.
// Because the topmost dataset can be zero (or hidden) for a given bar, this must be evaluated per data point.
function isOuterStackSegment(context) {
  const { chart, datasetIndex, dataIndex } = context;
  const datasets = chart.data.datasets;
  let lastIdx = -1;
  for (let i = 0; i < datasets.length; i++) {
    const meta = chart.getDatasetMeta(i);
    if (meta && meta.hidden) continue;
    const v = datasets[i].data[dataIndex];
    if (typeof v === 'number' && Math.abs(v) > 0.0001) lastIdx = i;
  }
  return datasetIndex === lastIdx;
}
const stackBorderRadius = (ctx) => (isOuterStackSegment(ctx) ? 5 : 0);
const stackBorderSkipped = (ctx) => (isOuterStackSegment(ctx) ? 'start' : false);

// Compact number formatter for axis ticks (e.g. 12500 -> 12,5K)
function compactNumber(value) {
  const v = Math.abs(value);
  if (v >= 1_000_000) return (value / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',') + 'M';
  if (v >= 10_000) return (value / 1_000).toFixed(0) + 'K';
  if (v >= 1_000) return (value / 1_000).toFixed(1).replace('.', ',') + 'K';
  return value.toFixed(0);
}

// Custom plugin: draw stacked total on top of each stack (column or bar orientation)
const stackedTotalPlugin = {
  id: 'stackedTotal',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !opts.enabled) return;
    const { ctx } = chart;
    const isHorizontal = chart.options.indexAxis === 'y';
    const meta0 = chart.getDatasetMeta(0);
    if (!meta0 || !meta0.data) return;
    const sym = opts.symbol || '';
    const negColor = opts.negativeColor || '#dc2626';
    const posColor = opts.color || '#0f172a';

    meta0.data.forEach((_bar, index) => {
      let total = 0;
      let topPositive = null;
      let bottomNegative = null;
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        const v = ds.data[index];
        if (typeof v !== 'number') return;
        total += v;
        const el = meta.data[index];
        if (!el) return;
        if (isHorizontal) {
          if (v >= 0 && (topPositive === null || el.x > topPositive.x)) topPositive = { x: el.x, y: el.y };
          if (v < 0 && (bottomNegative === null || el.x < bottomNegative.x)) bottomNegative = { x: el.x, y: el.y };
        } else {
          if (v >= 0 && (topPositive === null || el.y < topPositive.y)) topPositive = { x: el.x, y: el.y };
          if (v < 0 && (bottomNegative === null || el.y > bottomNegative.y)) bottomNegative = { x: el.x, y: el.y };
        }
      });
      if (Math.abs(total) < 0.005) return;
      const anchor = total >= 0 ? topPositive : bottomNegative;
      if (!anchor) return;

      const label = `${sym}${compactNumber(total)}`;
      ctx.save();
      ctx.font = "700 11px 'Inter', system-ui, sans-serif";
      const padX = 6;
      const textW = ctx.measureText(label).width;
      let x, y, alignX = 'center', baseline = 'middle';

      if (isHorizontal) {
        x = anchor.x + (total >= 0 ? 8 : -8);
        y = anchor.y;
        alignX = total >= 0 ? 'left' : 'right';
        baseline = 'middle';
      } else {
        x = anchor.x;
        y = anchor.y + (total >= 0 ? -8 : 14);
        alignX = 'center';
        baseline = total >= 0 ? 'bottom' : 'top';
      }

      // Pill background for readability
      ctx.textAlign = alignX;
      ctx.textBaseline = baseline;
      const bgX = alignX === 'left' ? x - padX : alignX === 'right' ? x - textW - padX : x - textW / 2 - padX;
      const bgY = baseline === 'middle' ? y - 9 : baseline === 'bottom' ? y - 16 : y - 1;
      const bgW = textW + padX * 2;
      const bgH = 18;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(15,23,42,0.08)';
      ctx.lineWidth = 1;
      const r = 9;
      ctx.beginPath();
      ctx.moveTo(bgX + r, bgY);
      ctx.lineTo(bgX + bgW - r, bgY);
      ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + r);
      ctx.lineTo(bgX + bgW, bgY + bgH - r);
      ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - r, bgY + bgH);
      ctx.lineTo(bgX + r, bgY + bgH);
      ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - r);
      ctx.lineTo(bgX, bgY + r);
      ctx.quadraticCurveTo(bgX, bgY, bgX + r, bgY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = total >= 0 ? posColor : negColor;
      ctx.fillText(label, x, y);
      ctx.restore();
    });
  },
};

export default function Overview() {
  const { currentVacation, expenses, refreshVacation } = useVacation();
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  // Drill-down modal opened by tapping a chart segment — shows the full
  // (scrollable) list of expenses behind that slice / bar.
  const [drillDown, setDrillDown] = useState(null);
  const [editKpi, setEditKpi] = useState(null);
  const [editChart, setEditChart] = useState(null);
  const [kpiForm, setKpiForm] = useState({ type: 'total', label: '', categories: [], currency: 'EUR', mergedCategories: [], persons: [] });
  const [chartForm, setChartForm] = useState({ type: 'pie', label: '', categories: [], currency: 'EUR', showValues: true, showPercent: false, mergedCategories: [], persons: [], stackMode: 'category_person', timeGranularity: 'day', timeStackBy: 'category', splitBy: 'category', sortOrder: 'value_desc' });
  const [mergeInput, setMergeInput] = useState({ name: '', categories: [] });

  const rates = currentVacation?.settings?.exchangeRates || { EUR: 1 };
  const displayCurrency = currentVacation?.settings?.currency || 'EUR';
  const isShared = currentVacation?.settings?.sharedMode || false;
  const participants = currentVacation?.settings?.participants || [];
  const payments = currentVacation?.payments || [];
  const categories = useMemo(() => {
    const fromVacation = currentVacation?.categories || [];
    const fromExpenses = (expenses || []).map(e => e.category).filter(Boolean);
    return [...new Set([...fromVacation, ...fromExpenses])];
  }, [currentVacation?.categories, expenses]);
  const kpis = currentVacation?.kpis || [];
  const charts = currentVacation?.charts || [];

  const convertAmount = (amount, fromRate, toCurrency) => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(fromRate) || 1;
    const baseAmount = amt / rate;
    const targetRate = rates[toCurrency] || 1;
    return baseAmount * targetRate;
  };

  const getExpensesByCategories = (selectedCats, merged, persons) => {
    let exps = expenses || [];
    if (persons && persons.length > 0) {
      exps = exps.filter(e => persons.includes(e.paidBy));
    }
    if (merged && merged.length > 0) {
      const catMap = {};
      merged.forEach(m => m.categories.forEach(c => { catMap[c] = m.name; }));
      exps = exps.map(e => ({
        ...e,
        displayCategory: catMap[e.category] || e.category,
      }));
    } else {
      exps = exps.map(e => ({ ...e, displayCategory: e.category }));
    }
    if (selectedCats && selectedCats.length > 0) {
      const allCats = new Set(selectedCats);
      if (merged) merged.forEach(m => { if (selectedCats.includes(m.name)) m.categories.forEach(c => allCats.add(c)); });
      exps = exps.filter(e => allCats.has(e.category) || allCats.has(e.displayCategory));
    }
    return exps;
  };

  const calcKpiValue = (kpi) => {
    const cur = kpi.currency || displayCurrency;
    const persons = kpi.persons || [];
    const exps = getExpensesByCategories(kpi.categories, kpi.mergedCategories, kpi.type === 'person_balance' ? [] : persons);

    let result;
    switch (kpi.type) {
      case 'total':
      case 'category_total': {
        result = exps.reduce((sum, e) => sum + convertAmount(e.amount, e.exchangeRate, cur), 0);
        break;
      }
      case 'daily_avg':
      case 'category_daily_avg': {
        const total = exps.reduce((sum, e) => sum + convertAmount(e.amount, e.exchangeRate, cur), 0);
        // Denominator = full trip span (first to last *across all expenses*), not just the filtered subset —
        // so excluding categories lowers the total but keeps the duration constant.
        const allDates = (expenses || []).map(e => e.date).filter(Boolean).sort();
        if (allDates.length === 0) { result = 0; break; }
        const first = new Date(allDates[0] + 'T00:00:00');
        const last = new Date(allDates[allDates.length - 1] + 'T00:00:00');
        const dayCount = Math.max(1, Math.round((last - first) / 86400000) + 1);
        result = total / dayCount;
        break;
      }
      case 'count':
      case 'category_count':
        return exps.length;
      case 'person_balance': {
        if (!persons.length || !participants.length) return 0;
        const allExps = getExpensesByCategories(kpi.categories, kpi.mergedCategories, []);
        const { balances } = calculateDebts(allExps, participants, payments);
        result = persons.reduce((sum, p) => sum + (balances[p] || 0), 0);
        break;
      }
      default: return 0;
    }
    return isNaN(result) ? 0 : result;
  };

  // Returns the order in which labels should be displayed based on `order`
  const sortIndices = (labels, totals, order) => {
    const idx = labels.map((_, i) => i);
    if (!order || order === 'none') return idx;
    if (order === 'value_desc') idx.sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
    else if (order === 'value_asc') idx.sort((a, b) => (totals[a] ?? 0) - (totals[b] ?? 0));
    else if (order === 'label_asc') idx.sort((a, b) => String(labels[a]).localeCompare(String(labels[b]), 'de'));
    else if (order === 'label_desc') idx.sort((a, b) => String(labels[b]).localeCompare(String(labels[a]), 'de'));
    return idx;
  };

  const getChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, chart.persons || []);
    const grouped = {};
    const breakdown = {}; // { label: [ {name, amount} ] } — used by tooltip drill-down
    const splitBy = chart.splitBy || 'category';
    exps.forEach(e => {
      const key = splitBy === 'person'
        ? (e.paidBy || 'Unbekannt')
        : (e.displayCategory || e.category || 'Sonstiges');
      const amt = convertAmount(e.amount, e.exchangeRate, cur);
      grouped[key] = (grouped[key] || 0) + amt;
      if (!breakdown[key]) breakdown[key] = [];
      breakdown[key].push({ name: e.name || '(ohne Name)', amount: amt, date: e.date });
    });

    let labels = Object.keys(grouped);
    let values = Object.values(grouped).map(v => {
      const rounded = Math.round(v * 100) / 100;
      return isNaN(rounded) ? 0 : rounded;
    });

    // Apply sort
    const order = chart.sortOrder || 'value_desc';
    const sortedIdx = sortIndices(labels, values, order);
    labels = sortedIdx.map(i => labels[i]);
    values = sortedIdx.map(i => values[i]);

    const sym = currencySymbols[cur] || cur;
    const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

    const isPie = chart.type === 'pie';
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: isPie ? '#ffffff' : colors,
        borderWidth: isPie ? 2 : 0,
        borderRadius: isPie ? 0 : 10,
        hoverBackgroundColor: colors,
        hoverOffset: isPie ? 10 : 0,
        spacing: isPie ? 1 : 0,
      }],
      sym,
      breakdown,
    };
  };

  const getStackedChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, []);
    const sym = currencySymbols[cur] || cur;
    const mode = chart.stackMode || 'category_person';
    const filterPersons = chart.persons || [];

    const order = chart.sortOrder || 'value_desc';

    if (mode === 'category_person') {
      // X-axis = categories, stacks = persons
      const catSet = new Set();
      const personSet = new Set();
      const data = {};
      const breakdown = {}; // breakdown[label][dataset] = [ {name, amount} ]
      exps.forEach(e => {
        const cat = e.displayCategory || e.category || 'Sonstiges';
        const person = e.paidBy || 'Unbekannt';
        if (filterPersons.length > 0 && !filterPersons.includes(person)) return;
        catSet.add(cat);
        personSet.add(person);
        if (!data[cat]) data[cat] = {};
        const amt = convertAmount(e.amount, e.exchangeRate, cur);
        data[cat][person] = (data[cat][person] || 0) + amt;
        if (!breakdown[cat]) breakdown[cat] = {};
        if (!breakdown[cat][person]) breakdown[cat][person] = [];
        breakdown[cat][person].push({ name: e.name || '(ohne Name)', amount: amt, date: e.date });
      });
      const origLabels = [...catSet];
      const persons = [...personSet];
      const totals = origLabels.map(cat => persons.reduce((s, p) => s + (data[cat]?.[p] || 0), 0));
      const idx = sortIndices(origLabels, totals, order);
      const labels = idx.map(i => origLabels[i]);
      const datasets = persons.map((p, i) => ({
        label: p,
        data: idx.map(j => Math.round(((data[origLabels[j]]?.[p]) || 0) * 100) / 100),
        backgroundColor: COLORS[i % COLORS.length],
        borderRadius: stackBorderRadius,
        borderSkipped: stackBorderSkipped,
      }));
      return { labels, datasets, sym, breakdown };
    } else {
      // X-axis = persons, stacks = categories
      const catSet = new Set();
      const personSet = new Set();
      const data = {};
      const breakdown = {};
      exps.forEach(e => {
        const cat = e.displayCategory || e.category || 'Sonstiges';
        const person = e.paidBy || 'Unbekannt';
        if (filterPersons.length > 0 && !filterPersons.includes(person)) return;
        catSet.add(cat);
        personSet.add(person);
        if (!data[person]) data[person] = {};
        const amt = convertAmount(e.amount, e.exchangeRate, cur);
        data[person][cat] = (data[person][cat] || 0) + amt;
        if (!breakdown[person]) breakdown[person] = {};
        if (!breakdown[person][cat]) breakdown[person][cat] = [];
        breakdown[person][cat].push({ name: e.name || '(ohne Name)', amount: amt, date: e.date });
      });
      const origLabels = [...personSet];
      const cats = [...catSet];
      const totals = origLabels.map(p => cats.reduce((s, c) => s + (data[p]?.[c] || 0), 0));
      const idx = sortIndices(origLabels, totals, order);
      const labels = idx.map(i => origLabels[i]);
      const datasets = cats.map((cat, i) => ({
        label: cat,
        data: idx.map(j => Math.round(((data[origLabels[j]]?.[cat]) || 0) * 100) / 100),
        backgroundColor: COLORS[i % COLORS.length],
        borderRadius: stackBorderRadius,
        borderSkipped: stackBorderSkipped,
      }));
      return { labels, datasets, sym, breakdown };
    }
  };

  const getBalanceChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const sym = currencySymbols[cur] || cur;
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, []);
    const filterPersons = chart.persons || [];
    const personsToShow = filterPersons.length > 0 ? filterPersons : participants;
    if (!personsToShow.length) return { labels: [], datasets: [], sym };

    const { balances } = calculateDebts(exps, participants, payments);

    // Calculate paid per person + per-person expense list for the tooltip
    const paid = {};
    const breakdown = {};
    personsToShow.forEach(p => { paid[p] = 0; breakdown[p] = { Bezahlt: [] }; });
    exps.forEach(e => {
      if (personsToShow.includes(e.paidBy)) {
        const amt = convertAmount(e.amount, e.exchangeRate, cur);
        paid[e.paidBy] = (paid[e.paidBy] || 0) + amt;
        breakdown[e.paidBy].Bezahlt.push({ name: e.name || '(ohne Name)', amount: amt, date: e.date });
      }
    });

    const origLabels = personsToShow;
    const paidValuesAll = origLabels.map(p => Math.round((paid[p] || 0) * 100) / 100);
    const balanceValuesAll = origLabels.map(p => Math.round((balances[p] || 0) * 100) / 100);
    const order = chart.sortOrder || 'value_desc';
    const idx = sortIndices(origLabels, paidValuesAll, order);
    const labels = idx.map(i => origLabels[i]);
    const paidValues = idx.map(i => paidValuesAll[i]);
    const balanceValues = idx.map(i => balanceValuesAll[i]);

    return {
      labels,
      datasets: [
        {
          label: 'Bezahlt',
          data: paidValues,
          backgroundColor: '#0ea5e9',
          borderRadius: 5,
          borderSkipped: 'start',
        },
        {
          label: 'Bilanz',
          data: balanceValues,
          backgroundColor: balanceValues.map(v => v >= 0 ? '#22c55e' : '#ef4444'),
          borderRadius: 5,
          borderSkipped: 'start',
        },
      ],
      sym,
      breakdown,
    };
  };

  const getTimeChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const sym = currencySymbols[cur] || cur;
    const granularity = chart.timeGranularity || 'day';
    const stackBy = chart.timeStackBy || 'category';
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, chart.persons || []);

    const getTimeBucket = (e) => {
      const date = e.date;
      if (!date) return null;
      if (granularity === 'hour') {
        const hour = (e.time || '00:00').split(':')[0].padStart(2, '0');
        return `${date} ${hour}`;
      }
      if (granularity === 'day') return date;
      if (granularity === 'week') {
        const d = new Date(date + 'T00:00:00');
        const day = d.getDay() || 7;
        d.setDate(d.getDate() + 4 - day);
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      if (granularity === 'month') return date.slice(0, 7);
      return date;
    };

    const formatBucket = (bucket) => {
      if (!bucket) return '?';
      if (granularity === 'hour') {
        const [d, h] = bucket.split(' ');
        const [y, m, day] = d.split('-');
        return `${day}.${m} ${h}:00`;
      }
      if (granularity === 'day') {
        const [y, m, d] = bucket.split('-');
        return `${d}.${m}.${y.slice(2)}`;
      }
      if (granularity === 'week') {
        const [y, w] = bucket.split('-W');
        return `KW${w} ${y}`;
      }
      if (granularity === 'month') {
        const [y, m] = bucket.split('-');
        const names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        return `${names[parseInt(m) - 1]} ${y}`;
      }
      return bucket;
    };

    const bucketSet = new Set();
    const groupSet = new Set();
    const data = {};
    const bucketBreakdown = {}; // bucketBreakdown[formattedLabel][group] = [ {name, amount} ]
    exps.forEach(e => {
      const bucket = getTimeBucket(e);
      if (!bucket) return;
      const group = stackBy === 'person'
        ? (e.paidBy || 'Unbekannt')
        : (e.displayCategory || e.category || 'Sonstiges');
      bucketSet.add(bucket);
      groupSet.add(group);
      const amt = convertAmount(e.amount, e.exchangeRate, cur);
      if (!data[bucket]) data[bucket] = {};
      data[bucket][group] = (data[bucket][group] || 0) + amt;
      const formatted = formatBucket(bucket);
      if (!bucketBreakdown[formatted]) bucketBreakdown[formatted] = {};
      if (!bucketBreakdown[formatted][group]) bucketBreakdown[formatted][group] = [];
      bucketBreakdown[formatted][group].push({ name: e.name || '(ohne Name)', amount: amt, date: e.date });
    });

    const sortedBuckets = [...bucketSet].sort();
    const labels = sortedBuckets.map(formatBucket);
    const groups = [...groupSet];
    const datasets = groups.map((group, i) => ({
      label: group,
      data: sortedBuckets.map(b => Math.round((data[b]?.[group] || 0) * 100) / 100),
      backgroundColor: COLORS[i % COLORS.length],
      borderRadius: stackBorderRadius,
      borderSkipped: stackBorderSkipped,
    }));
    return { labels, datasets, sym, breakdown: bucketBreakdown };
  };

  const saveKpis = async (newKpis) => {
    await updateVacation(currentVacation.id, { kpis: newKpis });
    await refreshVacation();
  };

  const saveCharts = async (newCharts) => {
    await updateVacation(currentVacation.id, { charts: newCharts });
    await refreshVacation();
  };

  const handleSaveKpi = async () => {
    const item = { ...kpiForm, id: editKpi?.id || genId() };
    if (!item.label) item.label = kpiTypeLabels[item.type] || 'KPI';
    const newKpis = editKpi ? kpis.map(k => k.id === editKpi.id ? item : k) : [...kpis, item];
    await saveKpis(newKpis);
    setShowKpiModal(false);
    setEditKpi(null);
    setKpiForm({ type: 'total', label: '', categories: [], currency: displayCurrency, mergedCategories: [], persons: [] });
  };

  const handleSaveChart = async () => {
    const item = { ...chartForm, id: editChart?.id || genId() };
    const typeLabels = { pie: 'Kreisdiagramm', column: 'Säulendiagramm', bar: 'Balkendiagramm', stacked_column: 'Gestapeltes Säulendiagramm', stacked_bar: 'Gestapeltes Balkendiagramm', balance_column: 'Personen-Bilanz (Säulen)', balance_bar: 'Personen-Bilanz (Balken)', time_column: 'Zeitverlauf (Säulen)', time_bar: 'Zeitverlauf (Balken)' };
    if (!item.label) item.label = typeLabels[item.type] || 'Diagramm';
    const newCharts = editChart ? charts.map(c => c.id === editChart.id ? item : c) : [...charts, item];
    await saveCharts(newCharts);
    setShowChartModal(false);
    setEditChart(null);
    setChartForm({ type: 'pie', label: '', categories: [], currency: displayCurrency, showValues: true, showPercent: false, mergedCategories: [], persons: [], stackMode: 'category_person', timeGranularity: 'day', timeStackBy: 'category', splitBy: 'category', sortOrder: 'value_desc' });
  };

  const deleteKpi = async (id) => {
    await saveKpis(kpis.filter(k => k.id !== id));
  };

  const deleteChart = async (id) => {
    await saveCharts(charts.filter(c => c.id !== id));
  };

  const addMergedCategory = (form, setForm) => {
    if (!mergeInput.name || mergeInput.categories.length < 2) return;
    setForm(prev => ({
      ...prev,
      mergedCategories: [...(prev.mergedCategories || []), { ...mergeInput }],
    }));
    setMergeInput({ name: '', categories: [] });
  };

  const kpiTypeLabels = {
    total: 'Gesamtausgaben',
    category_total: 'Kategorie-Summe',
    daily_avg: 'Tagesdurchschnitt',
    category_daily_avg: 'Kategorie-Tagesdurchschnitt',
    count: 'Anzahl Ausgaben',
    category_count: 'Kategorie-Anzahl',
    ...(isShared ? { person_balance: 'Personen-Bilanz (+/-)' } : {}),
  };

  const kpiTypeIcons = {
    total: DollarSign,
    category_total: DollarSign,
    daily_avg: Calendar,
    category_daily_avg: Calendar,
    count: TrendingUp,
    category_count: TrendingUp,
    person_balance: Users,
  };

  const s = {
    page: { padding: 16 },
    section: { marginBottom: 28 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 },
    // Subtle iOS-Liquid-Glass KPI tile — translucent frosted surface, soft rounded shadow, no colored halo
    kpiCard: () => ({
      position: 'relative',
      borderRadius: 20,
      padding: '16px 16px 14px',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.74) 100%)',
      backdropFilter: 'blur(22px) saturate(170%)',
      WebkitBackdropFilter: 'blur(22px) saturate(170%)',
      boxShadow: '0 6px 16px -10px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.04)',
      border: '1px solid rgba(255,255,255,0.7)',
      overflow: 'hidden',
      isolation: 'isolate',
      color: '#0f172a',
      minHeight: 112,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }),
    // Soft white highlight on the top edge for the glass feel
    kpiHighlight: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(120% 70% at 0% -10%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    chartCard: {
      position: 'relative',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.82) 100%)',
      backdropFilter: 'blur(18px) saturate(160%)',
      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      borderRadius: 20,
      padding: '20px 16px 16px',
      boxShadow: '0 6px 18px -12px rgba(15,23,42,0.12), 0 1px 2px rgba(15,23,42,0.04)',
      border: '1px solid rgba(255,255,255,0.7)',
      marginBottom: 20,
    },
    btn: { padding: '10px 18px', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' },
    btnPrimary: { background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff' },
    btnSmall: { padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: '#f1f5f9', color: '#64748b' },
    btnGhost: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' },
    label: { fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' },
    select: { padding: '10px 14px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 14, background: '#f8fafc', outline: 'none', width: '100%', boxSizing: 'border-box' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto' },
    badge: (active) => ({
      display: 'inline-block', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
      background: active ? '#0ea5e9' : '#f0f9ff', color: active ? '#fff' : '#0ea5e9',
    }),
  };

  if (!currentVacation) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: 48, marginBottom: 16 }}>📊</motion.div>
        <p>Bitte erstelle zuerst einen Urlaub</p>
      </div>
    );
  }

  const renderCategoryMerger = (form, setForm) => (
    <div style={{ marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 12 }}>
      <label style={s.label}>Kategorien zusammenfassen</label>
      {(form.mergedCategories || []).map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{m.name}:</span>
          <span style={{ color: '#64748b' }}>{m.categories.join(', ')}</span>
          <button onClick={() => setForm(prev => ({ ...prev, mergedCategories: prev.mergedCategories.filter((_, j) => j !== i) }))} style={s.btnGhost}><X size={14} /></button>
        </div>
      ))}
      <input placeholder="Neuer Gruppenname" value={mergeInput.name} onChange={e => setMergeInput(p => ({ ...p, name: e.target.value }))} style={{ ...s.input, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setMergeInput(p => ({ ...p, categories: p.categories.includes(cat) ? p.categories.filter(c => c !== cat) : [...p.categories, cat] }))} style={s.badge(mergeInput.categories.includes(cat))}>
            {cat}
          </button>
        ))}
      </div>
      <button onClick={() => addMergedCategory(form, setForm)} disabled={!mergeInput.name || mergeInput.categories.length < 2} style={{ ...s.btnSmall, opacity: (!mergeInput.name || mergeInput.categories.length < 2) ? 0.5 : 1 }}>
        <Plus size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Gruppe hinzufügen
      </button>
    </div>
  );

  const renderModal = (isKpi) => {
    const form = isKpi ? kpiForm : chartForm;
    const setForm = isKpi ? setKpiForm : setChartForm;
    const show = isKpi ? showKpiModal : showChartModal;
    const setShow = isKpi ? setShowKpiModal : setShowChartModal;
    const handleSave = isKpi ? handleSaveKpi : handleSaveChart;
    const editing = isKpi ? editKpi : editChart;

    return (
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={s.overlay} onClick={() => { setShow(false); isKpi ? setEditKpi(null) : setEditChart(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>{editing ? 'Bearbeiten' : isKpi ? 'Neuer KPI' : 'Neues Diagramm'}</h3>
                <button onClick={() => { setShow(false); isKpi ? setEditKpi(null) : setEditChart(null); }} style={s.btnGhost}><X size={20} /></button>
              </div>

              {isKpi && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Typ</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={s.select}>
                    {Object.entries(kpiTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}

              {!isKpi && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>Diagrammtyp</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        ['pie', 'Kreis', PieChart],
                        ['column', 'Säulen', BarChart3],
                        ['bar', 'Balken', AlignLeft],
                        ['stacked_column', 'Gest. Säulen', BarChart3],
                        ['stacked_bar', 'Gest. Balken', AlignLeft],
                        ['time_column', 'Zeit Säulen', Clock],
                        ['time_bar', 'Zeit Balken', Clock],
                        ...(isShared ? [['balance_column', 'Bilanz Säulen', Users], ['balance_bar', 'Bilanz Balken', Users]] : []),
                      ].map(([type, label, Icon]) => (
                        <button key={type} onClick={() => setForm(p => ({ ...p, type }))} style={{
                          padding: '8px 12px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
                          background: form.type === type ? '#0ea5e9' : '#f1f5f9',
                          color: form.type === type ? '#fff' : '#64748b',
                        }}>
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(form.type === 'stacked_column' || form.type === 'stacked_bar') && isShared && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={s.label}>Stapel-Modus</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          ['category_person', 'Kategorien / Personen'],
                          ['person_category', 'Personen / Kategorien'],
                        ].map(([mode, label]) => (
                          <button key={mode} onClick={() => setForm(p => ({ ...p, stackMode: mode }))} style={{
                            ...s.btn, flex: 1, fontSize: 12,
                            background: (form.stackMode || 'category_person') === mode ? '#8b5cf6' : '#f1f5f9',
                            color: (form.stackMode || 'category_person') === mode ? '#fff' : '#64748b',
                          }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                        {(form.stackMode || 'category_person') === 'category_person'
                          ? 'Achse = Kategorien, Stapel = Personen'
                          : 'Achse = Personen, Stapel = Kategorien'}
                      </div>
                    </div>
                  )}
                  {(form.type === 'time_column' || form.type === 'time_bar') && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={s.label}>Zeitauflösung</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[['hour','Stunden'],['day','Tage'],['week','Wochen'],['month','Monate']].map(([g, lbl]) => (
                            <button key={g} onClick={() => setForm(p => ({ ...p, timeGranularity: g }))} style={{
                              padding: '8px 12px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                              background: (form.timeGranularity || 'day') === g ? '#0ea5e9' : '#f1f5f9',
                              color: (form.timeGranularity || 'day') === g ? '#fff' : '#64748b',
                            }}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={s.label}>Stapeln nach</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[['category','Kategorien'], ...(isShared ? [['person','Personen']] : [])].map(([m, lbl]) => (
                            <button key={m} onClick={() => setForm(p => ({ ...p, timeStackBy: m }))} style={{
                              ...s.btn, flex: 1, fontSize: 12,
                              background: (form.timeStackBy || 'category') === m ? '#8b5cf6' : '#f1f5f9',
                              color: (form.timeStackBy || 'category') === m ? '#fff' : '#64748b',
                            }}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Bezeichnung</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="z.B. Gesamtausgaben" style={s.input} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Währung</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} style={s.select}>
                  {Object.keys(rates).map(c => <option key={c} value={c}>{c} {currencySymbols[c] ? `(${currencySymbols[c]})` : ''}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Kategorien (leer = alle)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setForm(p => ({ ...p, categories: (p.categories || []).includes(cat) ? p.categories.filter(c => c !== cat) : [...(p.categories || []), cat] }))} style={s.badge((form.categories || []).includes(cat))}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {isShared && participants.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Personen (leer = alle)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {participants.map(p => (
                      <button key={p} onClick={() => setForm(prev => ({ ...prev, persons: (prev.persons || []).includes(p) ? prev.persons.filter(x => x !== p) : [...(prev.persons || []), p] }))} style={s.badge((form.persons || []).includes(p))}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isKpi && (
                <>
                  <div style={{ marginBottom: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                      Werte anzeigen
                      <button onClick={() => setForm(p => ({ ...p, showValues: !p.showValues }))} style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                        background: form.showValues ? '#0ea5e9' : '#cbd5e1',
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                          left: form.showValues ? 23 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                    </label>
                    {form.type === 'pie' && (
                      <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                        Prozent %
                        <button onClick={() => setForm(p => ({ ...p, showPercent: !p.showPercent }))} style={{
                          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                          background: form.showPercent ? '#8b5cf6' : '#cbd5e1',
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                            left: form.showPercent ? 23 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                      </label>
                    )}
                  </div>
                  {form.type === 'pie' && isShared && participants.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={s.label}>Aufteilen nach</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[['category','Kategorien'],['person','Personen']].map(([m, lbl]) => (
                          <button key={m} onClick={() => setForm(p => ({ ...p, splitBy: m }))} style={{
                            ...s.btn, flex: 1, fontSize: 12,
                            background: (form.splitBy || 'category') === m ? '#0ea5e9' : '#f1f5f9',
                            color: (form.splitBy || 'category') === m ? '#fff' : '#64748b',
                          }}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Sort order — applies to all non-time charts */}
                  {form.type !== 'time_column' && form.type !== 'time_bar' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={s.label}>Sortierung</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                        {[
                          ['value_desc', 'Größe ↓'],
                          ['value_asc', 'Größe ↑'],
                          ['label_asc', 'A → Z'],
                          ['label_desc', 'Z → A'],
                          ['none', 'Original'],
                        ].map(([k, lbl]) => (
                          <button key={k} onClick={() => setForm(p => ({ ...p, sortOrder: k }))} style={{
                            padding: '8px 10px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                            background: (form.sortOrder || 'value_desc') === k ? '#0ea5e9' : '#f1f5f9',
                            color: (form.sortOrder || 'value_desc') === k ? '#fff' : '#64748b',
                            transition: 'all 0.2s',
                          }}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {renderCategoryMerger(form, setForm)}

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} style={{ ...s.btn, ...s.btnPrimary, width: '100%', marginTop: 16 }}>
                {editing ? 'Speichern' : 'Hinzufügen'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div id="export-content" style={s.page}>
      {/* KPIs Section */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}><TrendingUp size={18} /> KPIs</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setKpiForm({ type: 'total', label: '', categories: [], currency: displayCurrency, mergedCategories: [], persons: [] });
              setEditKpi(null);
              setShowKpiModal(true);
            }}
            style={{ ...s.btnSmall, background: '#e0f2fe', color: '#0284c7' }}
          >
            <Plus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> KPI
          </motion.button>
        </div>

        {kpis.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 30, background: '#f8fafc', borderRadius: 16, color: '#94a3b8' }}>
            <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ fontSize: 14 }}>Noch keine KPIs angelegt</p>
            <p style={{ fontSize: 12 }}>Füge KPIs hinzu um deine Ausgaben im Blick zu behalten</p>
          </motion.div>
        ) : (
          <div style={s.grid}>
            {kpis.map((kpi, i) => {
              const val = calcKpiValue(kpi);
              const accent = KPI_ACCENTS[i % KPI_ACCENTS.length];
              const Icon = kpiTypeIcons[kpi.type] || TrendingUp;
              const sym = currencySymbols[kpi.currency || displayCurrency] || kpi.currency || '€';
              const isCount = kpi.type === 'count' || kpi.type === 'category_count';
              const isBalance = kpi.type === 'person_balance';
              const valueText = isCount
                ? String(Math.round(val))
                : isBalance
                  ? `${val > 0 ? '+' : ''}${sym} ${val.toFixed(2).replace('.', ',')}`
                  : `${sym} ${val.toFixed(2).replace('.', ',')}`;
              // Dynamic font shrink for long values so they never get cut off
              const valLen = valueText.length;
              const valFontSize = valLen > 14 ? 19 : valLen > 11 ? 22 : valLen > 8 ? 25 : 27;
              const valueColor = isBalance
                ? (val > 0.01 ? '#16a34a' : val < -0.01 ? '#dc2626' : '#0f172a')
                : '#0f172a';

              return (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 240, damping: 22 }}
                  whileHover={{ y: -2 }}
                  style={s.kpiCard()}
                >
                  <div style={s.kpiHighlight} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: `${accent.tint}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={accent.tint} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => { setKpiForm({ ...kpi }); setEditKpi(kpi); setShowKpiModal(true); }} style={s.btnGhost}><Edit3 size={14} /></button>
                      <button onClick={() => deleteKpi(kpi.id)} style={s.btnGhost}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontSize: valFontSize,
                        fontWeight: 800,
                        marginBottom: 2,
                        letterSpacing: '-0.02em',
                        color: valueColor,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {valueText}
                    </motion.div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.01em' }}>
                      {kpi.label || kpiTypeLabels[kpi.type]}
                      {kpi.persons?.length > 0 && <span style={{ display: 'block', fontSize: 11, marginTop: 2, opacity: 0.8, fontWeight: 500 }}>{kpi.persons.join(', ')}</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitle}><BarChart3 size={18} /> Diagramme</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setChartForm({ type: 'pie', label: '', categories: [], currency: displayCurrency, showValues: true, showPercent: false, mergedCategories: [], persons: [], stackMode: 'category_person', timeGranularity: 'day', timeStackBy: 'category', splitBy: 'category', sortOrder: 'value_desc' });
              setEditChart(null);
              setShowChartModal(true);
            }}
            style={{ ...s.btnSmall, background: '#e0f2fe', color: '#0284c7' }}
          >
            <Plus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Diagramm
          </motion.button>
        </div>

        {charts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 30, background: '#f8fafc', borderRadius: 16, color: '#94a3b8' }}>
            <PieChart size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ fontSize: 14 }}>Noch keine Diagramme angelegt</p>
            <p style={{ fontSize: 12 }}>Erstelle Diagramme für eine visuelle Übersicht</p>
          </motion.div>
        ) : (
          charts.map((chart, i) => {
            const isTime = chart.type === 'time_column' || chart.type === 'time_bar';
            const isGroupedStacked = chart.type === 'stacked_column' || chart.type === 'stacked_bar';
            const isStacked = isGroupedStacked || isTime;
            const isBalance = chart.type === 'balance_column' || chart.type === 'balance_bar';
            const isHorizontal = chart.type === 'bar' || chart.type === 'stacked_bar' || chart.type === 'balance_bar' || chart.type === 'time_bar';
            const isPie = chart.type === 'pie';
            const chartData = isBalance ? getBalanceChartData(chart) : isGroupedStacked ? getStackedChartData(chart) : isTime ? getTimeChartData(chart) : getChartData(chart);
            const { labels, datasets, sym, breakdown } = chartData;
            const hasData = labels.length > 0;

            // Compute total of pie for percentage / overlap logic
            const pieTotal = isPie && datasets[0] ? datasets[0].data.reduce((a, b) => a + (parseFloat(b) || 0), 0) : 0;

            // Vertical column charts: pick a rotation that fits every label and reserve
            // enough vertical room so the bottom of long rotated labels never gets clipped.
            const maxXLabelLen = !isHorizontal && labels.length > 0
              ? labels.reduce((m, l) => Math.max(m, String(l).length), 0)
              : 0;
            const xRotation = !isHorizontal
              ? (labels.length > 10 || maxXLabelLen > 12 ? 60
                : labels.length > 6 || maxXLabelLen > 8 ? 45
                : labels.length > 4 ? 30
                : 0)
              : 0;
            // Approx vertical pixels a rotated label needs (font ≈ 11 px, char ≈ 6.5 px wide)
            const xLabelExtra = xRotation > 0
              ? Math.ceil(maxXLabelLen * 6.8 * Math.sin(xRotation * Math.PI / 180)) + 18
              : 0;

            // Dynamic chart container height — grows with bar count, and extends for rotated x-labels
            const containerHeight = isPie
              ? (labels.length > 8 ? 360 : 300)
              : isHorizontal
                ? Math.max(240, labels.length * 38 + 80)
                : Math.max(300, Math.min(440, labels.length * 32 + 110)) + xLabelExtra;

            const chartOptions = {
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: isHorizontal ? 'y' : 'x',
              animation: { duration: 650, easing: 'easeOutQuart' },
              // Reserve space so top/right value labels (and the stacked-total pill) never clip
              layout: { padding: { top: !isHorizontal ? 28 : 8, right: isHorizontal ? 64 : 16, bottom: 4, left: 4 } },
              // Tap on any segment → open a scrollable drill-down modal listing every individual expense
              onClick: (_evt, els, c) => {
                if (!els || !els.length) return;
                const el = els[0];
                const dsIdx = el.datasetIndex;
                const idx = el.index;
                const segLabel = c.data.labels[idx];
                const datasetLabel = c.data.datasets[dsIdx]?.label;
                let entries = [];
                let title = segLabel;
                let subtitle = '';
                let color = c.data.datasets[dsIdx]?.backgroundColor;
                if (Array.isArray(color)) color = color[idx];
                if ((isStacked || isBalance) && breakdown) {
                  entries = (breakdown[segLabel] && breakdown[segLabel][datasetLabel]) || [];
                  subtitle = datasetLabel || '';
                } else if (breakdown) {
                  entries = breakdown[segLabel] || [];
                }
                if (!entries.length) return;
                const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
                setDrillDown({ title, subtitle, entries: [...entries].sort((a, b) => b.amount - a.amount), total, sym, color });
              },
              plugins: {
                legend: {
                  display: isPie || isStacked || isBalance,
                  position: isPie ? 'bottom' : 'top',
                  align: 'center',
                  labels: {
                    padding: 14, usePointStyle: true, pointStyleWidth: 10,
                    boxHeight: 8,
                    font: { size: 12, weight: 500, family: "'Inter', system-ui, sans-serif" },
                    color: '#475569',
                    // For pies, embed percentage + value in legend so tiny slices stay readable even when label is hidden
                    generateLabels: isPie ? (c) => {
                      const data = c.data;
                      if (!data.labels.length || !data.datasets.length) return [];
                      const ds = data.datasets[0];
                      const meta = c.getDatasetMeta(0);
                      const visible = ds.data.reduce((acc, v, idx) => acc + (meta.data[idx]?.hidden ? 0 : (parseFloat(v) || 0)), 0) || 1;
                      return data.labels.map((label, idx) => {
                        const val = parseFloat(ds.data[idx]) || 0;
                        const pct = ((val / visible) * 100).toFixed(val / visible < 0.1 ? 1 : 0);
                        const txt = chart.showPercent
                          ? `${label} — ${pct}%`
                          : `${label} — ${sym}${compactNumber(val)} (${pct}%)`;
                        const hidden = !!meta.data[idx]?.hidden;
                        return {
                          text: txt,
                          fillStyle: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[idx] : ds.backgroundColor,
                          strokeStyle: Array.isArray(ds.borderColor) ? ds.borderColor[idx] : ds.borderColor,
                          lineWidth: 1,
                          hidden,
                          index: idx,
                          fontColor: hidden ? '#cbd5e1' : '#475569',
                        };
                      });
                    } : undefined,
                  },
                },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.96)',
                  titleFont: { size: 13, weight: 700, family: "'Inter', system-ui, sans-serif" },
                  bodyFont: { size: 12, family: "'Inter', system-ui, sans-serif" },
                  footerFont: { size: 11, weight: 500, family: "'Inter', system-ui, sans-serif", style: 'italic' },
                  padding: 12,
                  cornerRadius: 12,
                  displayColors: true,
                  boxPadding: 6,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  callbacks: {
                    label: (ctx) => {
                      // Pick the *value* axis: vertical charts → y, horizontal → x, pie → parsed scalar
                      let val;
                      if (isPie) val = ctx.parsed ?? ctx.raw ?? 0;
                      else if (isHorizontal) val = ctx.parsed?.x ?? ctx.raw ?? 0;
                      else val = ctx.parsed?.y ?? ctx.raw ?? 0;
                      const v = typeof val === 'number' ? val.toFixed(2).replace('.', ',') : val;
                      const base = (isStacked || isBalance)
                        ? ` ${ctx.dataset.label}: ${sym} ${v}`
                        : ` ${ctx.label}: ${sym} ${v}`;
                      if (isPie) {
                        const meta = ctx.chart.getDatasetMeta(0);
                        const visibleTotal = ctx.dataset.data.reduce((sum, d, j) => sum + (meta.data[j]?.hidden ? 0 : (parseFloat(d) || 0)), 0) || 1;
                        const pct = ((val / visibleTotal) * 100).toFixed(1);
                        return `${base} (${pct}%)`;
                      }
                      return base;
                    },
                    // Drill-down: list the individual expenses behind the tapped segment
                    afterBody: (items) => {
                      if (!items || !items.length || !breakdown) return [];
                      const ctx = items[0];
                      let entries = [];
                      if (isStacked || isBalance) {
                        entries = (breakdown[ctx.label] && breakdown[ctx.label][ctx.dataset.label]) || [];
                      } else {
                        entries = breakdown[ctx.label] || [];
                      }
                      if (!entries.length) return [];
                      const sorted = [...entries].sort((a, b) => b.amount - a.amount);
                      const MAX = 12;
                      const top = sorted.slice(0, MAX);
                      const lines = ['', '— Einträge —'];
                      top.forEach(e => {
                        const a = e.amount.toFixed(2).replace('.', ',');
                        const nm = e.name && e.name.length > 24 ? e.name.slice(0, 23) + '…' : e.name;
                        lines.push(`• ${nm}  ${sym} ${a}`);
                      });
                      if (sorted.length > MAX) lines.push(`+ ${sorted.length - MAX} weitere – tippen für alle`);
                      else if (sorted.length > 3) lines.push('Tippen für Details');
                      return lines;
                    },
                  },
                },
                datalabels: chart.showValues ? {
                  color: isPie ? '#fff' : '#1e293b',
                  font: { weight: 700, size: isPie ? 12 : 11, family: "'Inter', system-ui, sans-serif" },
                  textShadowColor: isPie ? 'rgba(0,0,0,0.45)' : undefined,
                  textShadowBlur: isPie ? 6 : 0,
                  // For stacked charts, hide per-segment labels — totals are drawn by stackedTotalPlugin instead
                  display: (context) => {
                    if (isStacked) return false;
                    if (isPie) {
                      // Hide labels on slices smaller than 6% of total to prevent overlap
                      const v = parseFloat(context.dataset.data[context.dataIndex]) || 0;
                      const meta = context.chart.getDatasetMeta(0);
                      const visible = context.dataset.data.reduce((sum, d, j) => sum + (meta.data[j]?.hidden ? 0 : (parseFloat(d) || 0)), 0) || 1;
                      return (v / visible) >= 0.06;
                    }
                    return true;
                  },
                  formatter: (value, context) => {
                    if (value === 0 || value === null || value === undefined) return '';
                    if (isPie) {
                      // Always show the Euro value on pie slices; percent toggle ADDS the % beneath it.
                      const valueLine = `${sym}${compactNumber(value)}`;
                      if (!chart.showPercent) return valueLine;
                      const meta = context.chart.getDatasetMeta(0);
                      const visibleTotal = context.dataset.data.reduce((sum, d, j) => sum + (meta.data[j]?.hidden ? 0 : (parseFloat(d) || 0)), 0) || 1;
                      const pct = ((value / visibleTotal) * 100).toFixed(0);
                      return `${valueLine}\n${pct}%`;
                    }
                    return `${sym}${compactNumber(value)}`;
                  },
                  anchor: isPie ? 'center' : 'end',
                  align: isPie ? 'center' : isHorizontal ? 'end' : 'end',
                  offset: isPie ? 0 : 4,
                  clamp: true,
                  clip: false,
                } : { display: false },
                // Draw total pill on top of each stack (only true stacked charts, not grouped balance bars)
                stackedTotal: {
                  enabled: isStacked,
                  symbol: sym,
                  color: '#0f172a',
                  negativeColor: '#dc2626',
                },
              },
              scales: !isPie ? {
                x: {
                  stacked: isStacked,
                  beginAtZero: isHorizontal,
                  // For horizontal charts the x-axis is the value axis → add headroom for right-aligned labels
                  grace: isHorizontal ? '12%' : undefined,
                  grid: { display: isHorizontal, color: 'rgba(148,163,184,0.15)', drawBorder: false, drawTicks: false },
                  ticks: {
                    font: { size: 11, weight: 500, family: "'Inter', system-ui, sans-serif" }, color: '#64748b', padding: 6,
                    // Force every label to render even when space is tight — the rotation below ensures they fit
                    autoSkip: false,
                    maxRotation: isHorizontal ? 0 : xRotation,
                    minRotation: isHorizontal ? 0 : xRotation,
                    callback: isHorizontal
                      ? (v) => `${sym}${compactNumber(v)}`
                      : function(value) { const lbl = this.getLabelForValue(value); return typeof lbl === 'string' && lbl.length > 18 ? lbl.slice(0, 17) + '…' : lbl; },
                  },
                  border: { display: false },
                },
                y: {
                  stacked: isStacked,
                  beginAtZero: !isHorizontal,
                  // For vertical charts the y-axis is the value axis → add headroom so top labels / total pill never clip
                  grace: !isHorizontal ? '12%' : undefined,
                  grid: { display: !isHorizontal, color: 'rgba(148,163,184,0.15)', drawBorder: false, drawTicks: false },
                  ticks: {
                    font: { size: 11, weight: 500, family: "'Inter', system-ui, sans-serif" }, color: '#64748b', padding: 6,
                    autoSkip: true,
                    callback: !isHorizontal
                      ? (v) => `${sym}${compactNumber(v)}`
                      : function(value) { const lbl = this.getLabelForValue(value); return typeof lbl === 'string' && lbl.length > 16 ? lbl.slice(0, 15) + '…' : lbl; },
                  },
                  border: { display: false },
                },
              } : undefined,
            };

            const barData = (isStacked || isBalance)
              // for true stacks the dataset generator already provides per-segment borderRadius / borderSkipped
              ? { labels, datasets: datasets.map(d => ({ ...d, maxBarThickness: 56 })) }
              // Single-series bar/column: only the value-end (top / right) is rounded — base stays flat against the axis
              : { labels, datasets: [{ ...datasets[0], label: chart.label, borderRadius: 5, borderSkipped: 'start', maxBarThickness: 56 }] };

            const activePlugins = [];
            if (chart.showValues) activePlugins.push(ChartDataLabels);
            if (isStacked) activePlugins.push(stackedTotalPlugin);

            return (
              <motion.div
                key={chart.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={s.chartCard}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chart.label}</h4>
                    {isPie && pieTotal > 0 && (
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                        Gesamt: <span style={{ color: '#0f172a', fontWeight: 700 }}>{sym} {pieTotal.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
                    {isPie && (
                      <button onClick={() => {
                        const updated = charts.map(c => c.id === chart.id ? { ...c, showPercent: !c.showPercent } : c);
                        saveCharts(updated);
                      }} style={{ ...s.btnGhost, color: chart.showPercent ? '#8b5cf6' : '#94a3b8' }}>
                        <Percent size={15} />
                      </button>
                    )}
                    <button onClick={() => {
                      const updated = charts.map(c => c.id === chart.id ? { ...c, showValues: !c.showValues } : c);
                      saveCharts(updated);
                    }} style={s.btnGhost}>
                      {chart.showValues ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => { setChartForm({ ...chart, showPercent: chart.showPercent || false, stackMode: chart.stackMode || 'category_person', timeGranularity: chart.timeGranularity || 'day', timeStackBy: chart.timeStackBy || 'category', splitBy: chart.splitBy || 'category', sortOrder: chart.sortOrder || 'value_desc' }); setEditChart(chart); setShowChartModal(true); }} style={s.btnGhost}><Edit3 size={14} /></button>
                    <button onClick={() => deleteChart(chart.id)} style={s.btnGhost}><Trash2 size={14} /></button>
                  </div>
                </div>

                {hasData ? (
                  <div style={{
                    position: 'relative',
                    height: containerHeight,
                    width: '100%',
                    padding: isPie ? '4px 0' : '0',
                  }}>
                    {isPie ? (
                      <Doughnut
                        data={{ labels, datasets }}
                        options={{ ...chartOptions, cutout: '58%', radius: '92%' }}
                        plugins={chart.showValues ? [ChartDataLabels] : []}
                      />
                    ) : (
                      <Bar data={barData} options={chartOptions} plugins={activePlugins} />
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
                    Keine Daten vorhanden
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {renderModal(true)}
      {renderModal(false)}

      {/* Drill-down modal: shows every expense behind the tapped segment, scrollable */}
      <AnimatePresence>
        {drillDown && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.55)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000,
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
            }}
            onClick={() => setDrillDown(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.96), rgba(255,255,255,0.82))',
                backdropFilter: 'blur(22px) saturate(180%)',
                WebkitBackdropFilter: 'blur(22px) saturate(180%)',
                borderRadius: 22, width: '100%', maxWidth: 460,
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 24px 60px -20px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 4, flexShrink: 0,
                  background: drillDown.color || '#0ea5e9',
                  boxShadow: `0 0 0 1px rgba(15,23,42,0.06)`,
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {drillDown.title}
                    {drillDown.subtitle ? <span style={{ color: '#64748b', fontWeight: 500 }}> · {drillDown.subtitle}</span> : null}
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                    {drillDown.entries.length} {drillDown.entries.length === 1 ? 'Eintrag' : 'Einträge'} · Gesamt {drillDown.sym} {drillDown.total.toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <button onClick={() => setDrillDown(null)} style={{ background: 'rgba(15,23,42,0.06)', border: 'none', borderRadius: 10, padding: 6, cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '6px 8px 12px', flex: 1 }}>
                {drillDown.entries.map((e, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: idx % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.name || '(ohne Name)'}
                      </div>
                      {e.date && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {drillDown.sym} {e.amount.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
