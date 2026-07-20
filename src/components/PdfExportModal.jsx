import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, PieChart, AlignLeft, Clock, Users, X, TrendingUp, Calendar } from 'lucide-react';
import { exportVacationPDF, normalizePdfConfig } from '../utils/exportUtils';
import { updateVacation } from '../utils/db';

// Modal zur Konfiguration des PDF-Berichts: welche Diagramme und Abschnitte
// enthalten sind und welche Kategorien pro Diagramm ausgeblendet werden
// (z. B. Unterkunft, damit kleinere Kategorien sichtbar bleiben).
// Die Auswahl wird pro Urlaub gespeichert.
export default function PdfExportModal({ open, onClose, vacation, expenses }) {
  const [cfg, setCfg] = useState(() => normalizePdfConfig(vacation?.pdfExport));

  useEffect(() => {
    if (open) setCfg(normalizePdfConfig(vacation?.pdfExport));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vacation?.id]);

  const isShared = !!vacation?.settings?.sharedMode;
  const hasKpis = (vacation?.kpis || []).length > 0;

  // Kategorien nach Größe sortiert — die größte (z. B. Unterkunft) steht vorn
  // und lässt sich so am schnellsten ausblenden.
  const categories = useMemo(() => {
    const rates = vacation?.settings?.exchangeRates || { EUR: 1 };
    const cur = vacation?.settings?.currency || 'EUR';
    const sums = {};
    (expenses || []).forEach(e => {
      const key = e.category || 'Ohne Kategorie';
      const amt = ((parseFloat(e.amount) || 0) / (parseFloat(e.exchangeRate) || 1)) * (rates[cur] || 1);
      sums[key] = (sums[key] || 0) + amt;
    });
    return Object.entries(sums).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [expenses, vacation]);

  const setChart = (key, patch) => setCfg(p => ({ ...p, charts: { ...p.charts, [key]: { ...p.charts[key], ...patch } } }));
  const setSection = (key, val) => setCfg(p => ({ ...p, sections: { ...p.sections, [key]: val } }));
  const toggleExcluded = (key, cat) => setCfg(p => {
    const ex = p.charts[key].excluded || [];
    const next = ex.includes(cat) ? ex.filter(c => c !== cat) : [...ex, cat];
    return { ...p, charts: { ...p.charts, [key]: { ...p.charts[key], excluded: next } } };
  });

  const anythingOn =
    cfg.charts.catDonut.enabled || cfg.charts.catBar.enabled || cfg.charts.time.enabled ||
    (isShared && cfg.charts.balance.enabled) ||
    cfg.sections.summary || (hasKpis && cfg.sections.kpis) || cfg.sections.categoryTable ||
    (isShared && cfg.sections.balanceTable) || cfg.sections.expenses;

  const handleExport = async () => {
    try {
      await updateVacation(vacation.id, { pdfExport: cfg });
    } catch {
      // Speichern fehlgeschlagen (z. B. offline) — Export trotzdem ausführen
    }
    exportVacationPDF(vacation, expenses, cfg);
    onClose();
  };

  const st = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { background: 'linear-gradient(160deg, rgba(255,255,255,0.96), rgba(255,255,255,0.84))', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 24px 60px -20px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.9)', borderRadius: 22, padding: 24, width: '100%', maxWidth: 540, maxHeight: '88vh', overflow: 'auto', boxSizing: 'border-box' },
    groupLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '18px 0 8px' },
    card: { border: '1px solid rgba(255,255,255,0.7)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, background: 'rgba(255,255,255,0.55)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px -4px rgba(15,23,42,0.1)' },
    rowHead: { display: 'flex', alignItems: 'center', gap: 12 },
    iconBox: (color) => ({ width: 34, height: 34, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    title: { fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.25 },
    desc: { fontSize: 12, color: '#94a3b8', lineHeight: 1.35 },
    chip: (active) => ({
      padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
      background: active ? '#0ea5e9' : 'rgba(15,23,42,0.06)', color: active ? '#fff' : '#94a3b8',
      textDecoration: active ? 'none' : 'line-through',
    }),
    hint: { fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.4 },
  };

  const Switch = ({ on, onClick }) => (
    <div
      onClick={onClick}
      role="switch"
      aria-checked={on}
      style={{ width: 42, height: 25, borderRadius: 13, background: on ? '#0ea5e9' : 'rgba(15,23,42,0.15)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, marginLeft: 'auto' }}
    >
      <div style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
    </div>
  );

  // Karte für ein Diagramm — mit aufklappbarer Kategorie-Auswahl
  const ChartCard = ({ icon: Icon, color, title, desc, chartKey, withCategories = true }) => {
    const chart = cfg.charts[chartKey];
    const excluded = chart.excluded || [];
    return (
      <div style={st.card}>
        <div style={st.rowHead}>
          <div style={st.iconBox(color)}><Icon size={17} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={st.title}>{title}</div>
            <div style={st.desc}>{desc}</div>
          </div>
          <Switch on={chart.enabled} onClick={() => setChart(chartKey, { enabled: !chart.enabled })} />
        </div>
        <AnimatePresence initial={false}>
          {chart.enabled && withCategories && categories.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 7 }}>
                  Kategorien im Diagramm <span style={{ fontWeight: 400, color: '#94a3b8' }}>(antippen zum Ausblenden)</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => toggleExcluded(chartKey, cat)} style={st.chip(!excluded.includes(cat))}>
                      {cat}
                    </button>
                  ))}
                </div>
                {excluded.length > 0 && (
                  <div style={st.hint}>
                    Ausgeblendete Kategorien werden nur in diesem Diagramm weggelassen — in Summen und Tabellen bleiben sie enthalten (Hinweis erscheint im PDF).
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionRow = ({ icon: Icon, color, title, desc, sectionKey }) => (
    <div style={st.card}>
      <div style={st.rowHead}>
        <div style={st.iconBox(color)}><Icon size={17} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={st.title}>{title}</div>
          <div style={st.desc}>{desc}</div>
        </div>
        <Switch on={cfg.sections[sectionKey]} onClick={() => setSection(sectionKey, !cfg.sections[sectionKey])} />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={st.overlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }} style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={st.iconBox('#ef4444')}><FileText size={17} /></div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: 18 }}>PDF-Bericht</h3>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', lineHeight: 1.45 }}>
              Wähle, welche Diagramme und Inhalte im A4-Bericht erscheinen. Deine Auswahl wird für diesen Urlaub gespeichert.
            </p>

            <div style={st.groupLabel}>Diagramme</div>
            <ChartCard icon={PieChart} color="#8b5cf6" title="Kategorien – Donut" desc="Anteile der Kategorien mit Prozentwerten" chartKey="catDonut" />
            <ChartCard icon={AlignLeft} color="#0ea5e9" title="Kategorien – Balken" desc="Kategorien im direkten Größenvergleich" chartKey="catBar" />
            <ChartCard icon={Clock} color="#f59e0b" title="Zeitverlauf" desc="Ausgaben pro Tag, gestapelt nach Kategorien" chartKey="time" />
            {isShared && (
              <ChartCard icon={Users} color="#10b981" title="Bilanz pro Person" desc="Wer bekommt, wer schuldet — als Diagramm" chartKey="balance" withCategories={false} />
            )}

            <div style={st.groupLabel}>Inhalte</div>
            <SectionRow icon={TrendingUp} color="#6366f1" title="Zusammenfassung" desc="Kennzahlen-Karten: Summe, Ø pro Tag, Zeitraum …" sectionKey="summary" />
            {hasKpis && (
              <SectionRow icon={TrendingUp} color="#ec4899" title="Eigene KPIs" desc="Deine in der Übersicht angelegten Kennzahlen" sectionKey="kpis" />
            )}
            <SectionRow icon={AlignLeft} color="#06b6d4" title="Kategorie-Tabelle" desc="Alle Kategorien mit Betrag, Anzahl und Anteil" sectionKey="categoryTable" />
            {isShared && (
              <SectionRow icon={Users} color="#14b8a6" title="Bilanz & Ausgleich (Tabellen)" desc="Saldo pro Person und Ausgleichszahlungen" sectionKey="balanceTable" />
            )}
            <SectionRow icon={Calendar} color="#f97316" title="Ausgabenliste" desc="Alle Ausgaben chronologisch als Tabelle" sectionKey="expenses" />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: 'rgba(15,23,42,0.06)', color: '#64748b' }}
              >
                Abbrechen
              </button>
              <motion.button
                whileTap={{ scale: anythingOn ? 0.97 : 1 }}
                onClick={anythingOn ? handleExport : undefined}
                disabled={!anythingOn}
                style={{
                  flex: 2, padding: '12px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14,
                  cursor: anythingOn ? 'pointer' : 'not-allowed', opacity: anythingOn ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff',
                  boxShadow: '0 4px 14px -6px rgba(239,68,68,0.5)',
                }}
              >
                <FileText size={16} /> PDF erstellen
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
