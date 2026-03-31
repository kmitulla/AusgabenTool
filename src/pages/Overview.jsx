import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler } from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { updateVacation, calculateDebts } from '../utils/db';
import { useVacation } from '../contexts/VacationContext';
import { Plus, Trash2, Edit3, TrendingUp, DollarSign, Calendar, BarChart3, PieChart, X, Eye, EyeOff, Users, AlignLeft, Percent } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, Filler);

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#14b8a6'];
const COLORS_SOFT = COLORS.map(c => c + 'cc');
const currencySymbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', TRY: '₺', THB: '฿' };

function genId() { return Math.random().toString(36).substring(2, 9); }

export default function Overview() {
  const { currentVacation, expenses, refreshVacation } = useVacation();
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [editKpi, setEditKpi] = useState(null);
  const [editChart, setEditChart] = useState(null);
  const [kpiForm, setKpiForm] = useState({ type: 'total', label: '', categories: [], currency: 'EUR', mergedCategories: [], persons: [] });
  const [chartForm, setChartForm] = useState({ type: 'pie', label: '', categories: [], currency: 'EUR', showValues: true, showPercent: false, mergedCategories: [], persons: [], stackMode: 'category_person' });
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
        const days = new Set(exps.map(e => e.date).filter(Boolean));
        result = days.size > 0 ? total / days.size : 0;
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

  const getChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, chart.persons || []);
    const grouped = {};
    exps.forEach(e => {
      const cat = e.displayCategory || e.category || 'Sonstiges';
      grouped[cat] = (grouped[cat] || 0) + convertAmount(e.amount, e.exchangeRate, cur);
    });

    const labels = Object.keys(grouped);
    const values = Object.values(grouped).map(v => {
      const rounded = Math.round(v * 100) / 100;
      return isNaN(rounded) ? 0 : rounded;
    });
    const sym = currencySymbols[cur] || cur;

    const isPie = chart.type === 'pie';
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: isPie ? COLORS_SOFT : labels.map((_, i) => COLORS[i % COLORS.length] + 'dd'),
        borderColor: isPie ? '#ffffff' : labels.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: isPie ? 3 : 0,
        borderRadius: isPie ? 0 : 10,
        hoverBackgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
        hoverOffset: isPie ? 8 : 0,
      }],
      sym,
    };
  };

  const getStackedChartData = (chart) => {
    const cur = chart.currency || displayCurrency;
    const exps = getExpensesByCategories(chart.categories, chart.mergedCategories, []);
    const sym = currencySymbols[cur] || cur;
    const mode = chart.stackMode || 'category_person';
    const filterPersons = chart.persons || [];

    if (mode === 'category_person') {
      // X-axis = categories, stacks = persons
      const catSet = new Set();
      const personSet = new Set();
      const data = {};
      exps.forEach(e => {
        const cat = e.displayCategory || e.category || 'Sonstiges';
        const person = e.paidBy || 'Unbekannt';
        if (filterPersons.length > 0 && !filterPersons.includes(person)) return;
        catSet.add(cat);
        personSet.add(person);
        if (!data[cat]) data[cat] = {};
        data[cat][person] = (data[cat][person] || 0) + convertAmount(e.amount, e.exchangeRate, cur);
      });
      const labels = [...catSet];
      const persons = [...personSet];
      const datasets = persons.map((p, i) => ({
        label: p,
        data: labels.map(cat => Math.round((data[cat]?.[p] || 0) * 100) / 100),
        backgroundColor: COLORS[i % COLORS.length],
        borderRadius: 4,
      }));
      return { labels, datasets, sym };
    } else {
      // X-axis = persons, stacks = categories
      const catSet = new Set();
      const personSet = new Set();
      const data = {};
      exps.forEach(e => {
        const cat = e.displayCategory || e.category || 'Sonstiges';
        const person = e.paidBy || 'Unbekannt';
        if (filterPersons.length > 0 && !filterPersons.includes(person)) return;
        catSet.add(cat);
        personSet.add(person);
        if (!data[person]) data[person] = {};
        data[person][cat] = (data[person][cat] || 0) + convertAmount(e.amount, e.exchangeRate, cur);
      });
      const labels = [...personSet];
      const cats = [...catSet];
      const datasets = cats.map((cat, i) => ({
        label: cat,
        data: labels.map(p => Math.round((data[p]?.[cat] || 0) * 100) / 100),
        backgroundColor: COLORS[i % COLORS.length],
        borderRadius: 4,
      }));
      return { labels, datasets, sym };
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

    // Calculate paid per person
    const paid = {};
    personsToShow.forEach(p => { paid[p] = 0; });
    exps.forEach(e => {
      if (personsToShow.includes(e.paidBy)) {
        paid[e.paidBy] = (paid[e.paidBy] || 0) + convertAmount(e.amount, e.exchangeRate, cur);
      }
    });

    const labels = personsToShow;
    const balanceValues = labels.map(p => Math.round((balances[p] || 0) * 100) / 100);
    const paidValues = labels.map(p => Math.round((paid[p] || 0) * 100) / 100);

    return {
      labels,
      datasets: [
        {
          label: 'Bezahlt',
          data: paidValues,
          backgroundColor: '#0ea5e9',
          borderRadius: 6,
        },
        {
          label: 'Bilanz',
          data: balanceValues,
          backgroundColor: balanceValues.map(v => v >= 0 ? '#22c55e' : '#ef4444'),
          borderRadius: 6,
        },
      ],
      sym,
    };
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
    const typeLabels = { pie: 'Kreisdiagramm', column: 'Säulendiagramm', bar: 'Balkendiagramm', stacked_column: 'Gestapeltes Säulendiagramm', stacked_bar: 'Gestapeltes Balkendiagramm', balance_column: 'Personen-Bilanz (Säulen)', balance_bar: 'Personen-Bilanz (Balken)' };
    if (!item.label) item.label = typeLabels[item.type] || 'Diagramm';
    const newCharts = editChart ? charts.map(c => c.id === editChart.id ? item : c) : [...charts, item];
    await saveCharts(newCharts);
    setShowChartModal(false);
    setEditChart(null);
    setChartForm({ type: 'pie', label: '', categories: [], currency: displayCurrency, showValues: true, mergedCategories: [], persons: [] });
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
    section: { marginBottom: 24 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 8 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
    kpiCard: (color) => ({
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      borderRadius: 16, padding: '18px 16px',
      border: `1px solid ${color}30`,
      position: 'relative', overflow: 'hidden',
    }),
    chartCard: { background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: 20 },
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
              const color = COLORS[i % COLORS.length];
              const Icon = kpiTypeIcons[kpi.type] || TrendingUp;
              const sym = currencySymbols[kpi.currency || displayCurrency] || kpi.currency || '€';
              const isCount = kpi.type === 'count' || kpi.type === 'category_count';

              return (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={s.kpiCard(color)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => { setKpiForm({ ...kpi }); setEditKpi(kpi); setShowKpiModal(true); }} style={s.btnGhost}><Edit3 size={14} /></button>
                      <button onClick={() => deleteKpi(kpi.id)} style={s.btnGhost}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: 22, fontWeight: 800, marginBottom: 4,
                      color: kpi.type === 'person_balance' ? (val > 0.01 ? '#16a34a' : val < -0.01 ? '#dc2626' : '#64748b') : '#1e293b',
                    }}
                  >
                    {isCount ? Math.round(val) : kpi.type === 'person_balance' ? `${val > 0 ? '+' : ''}${sym} ${val.toFixed(2)}` : `${sym} ${val.toFixed(2)}`}
                  </motion.div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                    {kpi.label || kpiTypeLabels[kpi.type]}
                    {kpi.persons?.length > 0 && <span style={{ display: 'block', fontSize: 11, marginTop: 2, opacity: 0.8 }}>{kpi.persons.join(', ')}</span>}
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
              setChartForm({ type: 'pie', label: '', categories: [], currency: displayCurrency, showValues: true, mergedCategories: [], persons: [] });
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
            const isStacked = chart.type === 'stacked_column' || chart.type === 'stacked_bar';
            const isBalance = chart.type === 'balance_column' || chart.type === 'balance_bar';
            const isHorizontal = chart.type === 'bar' || chart.type === 'stacked_bar' || chart.type === 'balance_bar';
            const isPie = chart.type === 'pie';
            const chartData = isBalance ? getBalanceChartData(chart) : isStacked ? getStackedChartData(chart) : getChartData(chart);
            const { labels, datasets, sym } = chartData;
            const hasData = labels.length > 0;

            const totalForPercent = isPie ? datasets[0]?.data?.reduce((a, b) => a + b, 0) || 1 : 1;

            const chartOptions = {
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: isHorizontal ? 'y' : 'x',
              animation: { duration: 600, easing: 'easeOutQuart' },
              plugins: {
                legend: {
                  display: isPie || isStacked || isBalance,
                  position: isPie ? 'bottom' : 'top',
                  labels: {
                    padding: 16, usePointStyle: true, pointStyleWidth: 10,
                    font: { size: 12, weight: 500, family: "'Inter', system-ui, sans-serif" },
                    color: '#475569',
                  },
                },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  titleFont: { size: 13, weight: 600 },
                  bodyFont: { size: 12 },
                  padding: 12,
                  cornerRadius: 10,
                  displayColors: true,
                  boxPadding: 4,
                  callbacks: {
                    label: (ctx) => {
                      const val = ctx.parsed?.x ?? ctx.parsed?.y ?? ctx.parsed ?? ctx.raw ?? 0;
                      const v = typeof val === 'number' ? val.toFixed(2) : val;
                      const base = (isStacked || isBalance)
                        ? ` ${ctx.dataset.label}: ${sym} ${v}`
                        : ` ${ctx.label}: ${sym} ${v}`;
                      if (isPie && chart.showPercent) {
                        const pct = ((val / totalForPercent) * 100).toFixed(1);
                        return `${base} (${pct}%)`;
                      }
                      return base;
                    },
                  },
                },
                datalabels: chart.showValues ? {
                  color: isPie ? '#fff' : '#334155',
                  font: { weight: 700, size: isPie ? 12 : 11, family: "'Inter', system-ui, sans-serif" },
                  textShadowColor: isPie ? 'rgba(0,0,0,0.3)' : undefined,
                  textShadowBlur: isPie ? 4 : 0,
                  formatter: (value) => {
                    if (value <= 0) return '';
                    if (isPie && chart.showPercent) {
                      const pct = ((value / totalForPercent) * 100).toFixed(0);
                      return `${sym}${value.toFixed(0)}\n${pct}%`;
                    }
                    return `${sym}${value.toFixed(0)}`;
                  },
                  anchor: isPie ? 'center' : 'end',
                  align: isPie ? 'center' : isHorizontal ? 'right' : 'top',
                } : { display: false },
              },
              scales: !isPie ? {
                x: {
                  stacked: isStacked,
                  beginAtZero: isHorizontal,
                  grid: { display: isHorizontal, color: '#f1f5f920', drawBorder: false },
                  ticks: { font: { size: 11, weight: 500 }, color: '#64748b', padding: 4 },
                  border: { display: false },
                },
                y: {
                  stacked: isStacked,
                  beginAtZero: !isHorizontal,
                  grid: { display: !isHorizontal, color: '#f1f5f920', drawBorder: false },
                  ticks: { font: { size: 11, weight: 500 }, color: '#64748b', padding: 4 },
                  border: { display: false },
                },
              } : undefined,
            };

            const barData = (isStacked || isBalance)
              ? { labels, datasets }
              : { labels, datasets: [{ ...datasets[0], label: chart.label, borderRadius: 8 }] };

            return (
              <motion.div
                key={chart.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={s.chartCard}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>{chart.label}</h4>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                    <button onClick={() => { setChartForm({ ...chart, showPercent: chart.showPercent || false, stackMode: chart.stackMode || 'category_person' }); setEditChart(chart); setShowChartModal(true); }} style={s.btnGhost}><Edit3 size={14} /></button>
                    <button onClick={() => deleteChart(chart.id)} style={s.btnGhost}><Trash2 size={14} /></button>
                  </div>
                </div>

                {hasData ? (
                  <div style={{
                    maxHeight: isHorizontal ? Math.max(220, labels.length * 44 + 60) : 320,
                    padding: isPie ? '8px 0' : '4px 0',
                  }}>
                    {isPie ? (
                      <Doughnut
                        data={{ labels, datasets }}
                        options={{ ...chartOptions, cutout: '35%' }}
                        plugins={chart.showValues ? [ChartDataLabels] : []}
                      />
                    ) : (
                      <Bar data={barData} options={chartOptions} plugins={chart.showValues ? [ChartDataLabels] : []} />
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
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
    </div>
  );
}
