import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVacation } from '../contexts/VacationContext';
import { useAuth } from '../contexts/AuthContext';
import { updateVacation } from '../utils/db';
import { calculateDebts } from '../utils/db';
import { exportSharedVacationExcel, exportSharedVacationPDF, exportAsImage } from '../utils/exportUtils';
import { Users, UserPlus, UserMinus, ArrowRight, Download, FileText, FileSpreadsheet, Image, DollarSign, ChevronDown, Check, X, CreditCard, Trash2, Edit3 } from 'lucide-react';

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '1.5rem 1rem 3rem',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  headerTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#1e293b',
    margin: 0,
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    userSelect: 'none',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#334155',
    margin: 0,
  },
  cardBody: {
    padding: '0 1.25rem 1.25rem',
  },
  participantRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  participantLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  avatar: (color) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.85rem',
    lineHeight: '36px',
    textAlign: 'center',
    flexShrink: 0,
  }),
  participantName: {
    fontSize: '0.95rem',
    color: '#334155',
    fontWeight: 500,
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: '#ef444415',
    color: '#ef4444',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  addInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#f8fafc',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f115',
    color: '#6366f1',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.5rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  td: {
    padding: '0.6rem 0.5rem',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  },
  balancePositive: {
    color: '#16a34a',
    fontWeight: 700,
  },
  balanceNegative: {
    color: '#dc2626',
    fontWeight: 700,
  },
  balanceZero: {
    color: '#64748b',
    fontWeight: 600,
  },
  settlementCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '0.6rem',
    border: '1px solid #e2e8f0',
  },
  settlementName: {
    fontWeight: 600,
    color: '#334155',
    fontSize: '0.95rem',
    minWidth: '60px',
  },
  settlementAmount: {
    fontWeight: 700,
    color: '#6366f1',
    fontSize: '1rem',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  abrechnBtn: {
    width: '100%',
    padding: '1rem',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
  },
  expandBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: '0.5rem',
  },
  expandContent: {
    padding: '0.5rem 1rem 0.75rem',
    fontSize: '0.85rem',
    color: '#475569',
  },
  expenseItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.35rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  exportBtnGroup: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  exportBtn: (color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.55rem 1rem',
    borderRadius: '10px',
    border: 'none',
    background: `${color}12`,
    color: color,
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: '#94a3b8',
  },
  emptyIcon: {
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#64748b',
    margin: '0 0 0.5rem',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    margin: 0,
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalContent: {
    background: '#fff',
    borderRadius: '20px',
    padding: '1.75rem',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#1e293b',
    margin: '0 0 1.25rem',
  },
  warningText: {
    fontSize: '0.85rem',
    color: '#f59e0b',
    marginTop: '0.25rem',
    fontWeight: 500,
  },
};

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name, index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function formatCurrency(amount, currency = 'EUR') {
  const sym = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : currency === 'GBP' ? '\u00A3' : currency;
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

export default function SharedVacation() {
  const { currentVacation, expenses, refreshVacation } = useVacation();
  const { currentUser } = useAuth();
  const [newParticipant, setNewParticipant] = useState('');
  const [showSettlements, setShowSettlements] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const getSectionStored = (key, fallback) => {
    if (!currentUser) return fallback;
    const stored = localStorage.getItem(`shared_section_${currentUser.id}_${key}`);
    return stored !== null ? stored === 'true' : fallback;
  };

  const [sectionsOpen, setSectionsOpen] = useState({
    participants: getSectionStored('participants', true),
    summary: getSectionStored('summary', true),
    payments: getSectionStored('payments', true),
    breakdown: getSectionStored('breakdown', false),
    export: getSectionStored('export', false),
  });

  const [paymentForm, setPaymentForm] = useState({ from: '', to: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [editPayment, setEditPayment] = useState(null); // payment being edited

  const participants = currentVacation?.settings?.participants || [];
  const displayCurrency = currentVacation?.settings?.currency || 'EUR';
  const payments = currentVacation?.payments || [];

  const { balances, settlements } = useMemo(() => {
    if (!participants.length) return { balances: {}, settlements: [] };
    return calculateDebts(expenses, participants, payments);
  }, [expenses, participants, payments]);

  const personStats = useMemo(() => {
    const stats = {};
    participants.forEach(p => {
      stats[p] = { paid: 0, owes: 0, paidExpenses: [], owedExpenses: [] };
    });
    expenses.forEach(exp => {
      if (!exp.paidBy || !exp.paidFor || exp.paidFor.length === 0) return;
      const amount = parseFloat(exp.amount) || 0;
      const rate = parseFloat(exp.exchangeRate) || 1;
      const converted = amount / rate;

      if (stats[exp.paidBy]) {
        stats[exp.paidBy].paid += converted;
        stats[exp.paidBy].paidExpenses.push(exp);
      }
      exp.paidFor.forEach(person => {
        let share;
        if (exp.paidForAmounts && exp.paidForAmounts[person] !== undefined) {
          share = (parseFloat(exp.paidForAmounts[person]) || 0) / rate;
        } else {
          share = converted / exp.paidFor.length;
        }
        if (exp.directlyPaid?.[person]) {
          // Show direct payment transparently: person owes their share but also paid it
          if (stats[person]) {
            stats[person].owes += share;
            stats[person].paid += share;
            stats[person].owedExpenses.push(exp);
          }
        } else {
          if (stats[person]) {
            stats[person].owes += share;
            stats[person].owedExpenses.push(exp);
          }
        }
      });
    });
    // Factor in person-to-person payments
    // "from" paid money out → increases their "paid" total
    // "to" received money → increases their "owes" (offsets their credit)
    payments.forEach(pay => {
      const amt = parseFloat(pay.amount) || 0;
      if (stats[pay.from]) stats[pay.from].paid += amt;
      if (stats[pay.to]) stats[pay.to].owes += amt;
    });
    return stats;
  }, [expenses, participants, payments]);

  const toggleSection = (key) => {
    setSectionsOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (currentUser) {
        localStorage.setItem(`shared_section_${currentUser.id}_${key}`, String(next[key]));
      }
      return next;
    });
  };

  const handleAddParticipant = async () => {
    const name = newParticipant.trim();
    if (!name || participants.includes(name)) return;
    const updated = [...participants, name];
    await updateVacation(currentVacation.id, {
      settings: { ...currentVacation.settings, participants: updated },
    });
    setNewParticipant('');
    await refreshVacation();
  };

  const handleRemoveParticipant = async (name) => {
    const hasExpenses = expenses.some(
      e => e.paidBy === name || (e.paidFor && e.paidFor.includes(name))
    );
    if (hasExpenses && removeConfirm !== name) {
      setRemoveConfirm(name);
      return;
    }
    const updated = participants.filter(p => p !== name);
    await updateVacation(currentVacation.id, {
      settings: { ...currentVacation.settings, participants: updated },
    });
    setRemoveConfirm(null);
    await refreshVacation();
  };

  const handleAddPayment = async () => {
    const { from, to, amount, date, note } = paymentForm;
    if (!from || !to || !amount || from === to || parseFloat(amount) <= 0) return;
    setPaymentSaving(true);
    const newPayment = {
      id: `pay_${Date.now()}`,
      from, to,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      date: date || new Date().toISOString().slice(0, 10),
      note: note || '',
    };
    await updateVacation(currentVacation.id, { payments: [...payments, newPayment] });
    setPaymentForm({ from: '', to: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
    setPaymentSaving(false);
    await refreshVacation();
  };

  const handleUpdatePayment = async () => {
    if (!editPayment) return;
    const { from, to, amount, date, note } = editPayment;
    if (!from || !to || !amount || from === to || parseFloat(amount) <= 0) return;
    const updated = payments.map(p => p.id === editPayment.id
      ? { ...p, from, to, amount: parseFloat(parseFloat(amount).toFixed(2)), date: date || p.date, note: note || '' }
      : p
    );
    await updateVacation(currentVacation.id, { payments: updated });
    setEditPayment(null);
    await refreshVacation();
  };

  const handleDeletePayment = async (payId) => {
    await updateVacation(currentVacation.id, { payments: payments.filter(p => p.id !== payId) });
    await refreshVacation();
  };

  const handleExportPDF = () => {
    exportSharedVacationPDF('shared-vacation-export', `Gemeinsamer_Urlaub_${currentVacation.name || 'Export'}.pdf`);
  };

  const handleExportExcel = () => {
    exportSharedVacationExcel(expenses, settlements, participants, `Gemeinsamer_Urlaub_${currentVacation.name || 'Export'}.xlsx`, personStats, displayCurrency, payments, currentVacation.name || 'Export');
  };

  const handleExportImage = async () => {
    // Force settlements visible for export, then restore
    const wasShown = showSettlements;
    if (!wasShown) setShowSettlements(true);
    await new Promise(r => setTimeout(r, 120));
    await exportAsImage('shared-export-canvas', `Gemeinsamer_Urlaub_${currentVacation.name || 'Export'}.png`);
    if (!wasShown) setShowSettlements(false);
  };

  if (!currentVacation || !currentVacation.settings?.participants?.length) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Users size={28} color="#6366f1" />
          <h1 style={styles.headerTitle}>Gemeinsamer Urlaub</h1>
        </div>
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <Users size={48} color="#cbd5e1" />
            </div>
            <h3 style={styles.emptyTitle}>Keine Teilnehmer vorhanden</h3>
            <p style={styles.emptyText}>
              Fuge Teilnehmer in den Einstellungen hinzu, um den gemeinsamen Urlaub zu nutzen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Users size={28} color="#6366f1" />
        <h1 style={styles.headerTitle}>Gemeinsamer Urlaub</h1>
      </div>

      {/* Participant Management */}
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button style={styles.cardHeader} onClick={() => toggleSection('participants')}>
          <div style={styles.cardHeaderLeft}>
            <Users size={18} color="#6366f1" />
            <h3 style={styles.cardTitle}>Teilnehmer ({participants.length})</h3>
          </div>
          <motion.div
            animate={{ rotate: sectionsOpen.participants ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} color="#94a3b8" />
          </motion.div>
        </button>
        <AnimatePresence>
          {sectionsOpen.participants && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={styles.cardBody}>
                {participants.map((p, i) => (
                  <div key={p} style={styles.participantRow}>
                    <div style={styles.participantLeft}>
                      <div style={styles.avatar(getAvatarColor(p, i))}>
                        {getInitials(p)}
                      </div>
                      <span style={styles.participantName}>{p}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {removeConfirm === p && (
                        <motion.span
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={styles.warningText}
                        >
                          Hat Ausgaben!
                        </motion.span>
                      )}
                      <button
                        style={styles.removeBtn}
                        onClick={() => handleRemoveParticipant(p)}
                        title="Teilnehmer entfernen"
                      >
                        {removeConfirm === p ? <Check size={15} /> : <UserMinus size={15} />}
                      </button>
                      {removeConfirm === p && (
                        <button
                          style={{ ...styles.removeBtn, background: '#64748b15', color: '#64748b' }}
                          onClick={() => setRemoveConfirm(null)}
                          title="Abbrechen"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div style={styles.addRow}>
                  <input
                    style={styles.addInput}
                    type="text"
                    placeholder="Neuer Teilnehmer..."
                    value={newParticipant}
                    onChange={e => setNewParticipant(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                  />
                  <button style={styles.addBtn} onClick={handleAddParticipant} title="Hinzufugen">
                    <UserPlus size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Export wrapper */}
      <div id="shared-vacation-export">
        {/* Summary Table */}
        <motion.div
          style={styles.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <button style={styles.cardHeader} onClick={() => toggleSection('summary')}>
            <div style={styles.cardHeaderLeft}>
              <DollarSign size={18} color="#10b981" />
              <h3 style={styles.cardTitle}>Ubersichtstabelle</h3>
            </div>
            <motion.div
              animate={{ rotate: sectionsOpen.summary ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={18} color="#94a3b8" />
            </motion.div>
          </button>
          <AnimatePresence>
            {sectionsOpen.summary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={styles.cardBody}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Teilnehmer</th>
                          <th style={{ ...styles.th, textAlign: 'right' }}>Bezahlt</th>
                          <th style={{ ...styles.th, textAlign: 'right' }}>Anteil</th>
                          <th style={{ ...styles.th, textAlign: 'right' }}>Bilanz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p, i) => {
                          const stats = personStats[p] || { paid: 0, owes: 0 };
                          const balance = balances[p] || 0;
                          const balanceStyle = balance > 0.01
                            ? styles.balancePositive
                            : balance < -0.01
                              ? styles.balanceNegative
                              : styles.balanceZero;
                          return (
                            <motion.tr
                              key={p}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <td style={styles.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={styles.avatar(getAvatarColor(p, i))}>
                                    {getInitials(p)}
                                  </div>
                                  <span style={{ fontWeight: 600 }}>{p}</span>
                                </div>
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500 }}>
                                {formatCurrency(stats.paid, displayCurrency)}
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500 }}>
                                {formatCurrency(stats.owes, displayCurrency)}
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right', ...balanceStyle }}>
                                {balance > 0.01 ? '+' : ''}{formatCurrency(balance, displayCurrency)}
                                {balance < -0.01 && <span> </span>}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Settlement Section - shown after Abrechnen */}
        <AnimatePresence>
          {showSettlements && (
            <motion.div
              style={styles.card}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                  <ArrowRight size={18} color="#8b5cf6" />
                  <h3 style={styles.cardTitle}>Ausgleichszahlungen</h3>
                </div>
                {settlements.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Alle Ausgaben sind ausgeglichen. Keine Zahlungen notwendig.
                  </p>
                ) : (
                  settlements.map((s, i) => (
                    <motion.div
                      key={`${s.from}-${s.to}`}
                      style={styles.settlementCard}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span style={styles.settlementName}>{s.from}</span>
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <div style={{
                          height: '2px',
                          width: '40px',
                          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                          borderRadius: '1px',
                        }} />
                        <ArrowRight size={16} color="#8b5cf6" />
                      </motion.div>
                      <span style={styles.settlementName}>{s.to}</span>
                      <span style={styles.settlementAmount}>
                        {formatCurrency(s.amount, displayCurrency)}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Abrechnen Button */}
      <motion.div
        style={{ marginBottom: '1rem' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <motion.button
          style={styles.abrechnBtn}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowSettlements(prev => !prev)}
        >
          <DollarSign size={20} />
          {showSettlements ? 'Ausgleich ausblenden' : 'Abrechnen'}
        </motion.button>
      </motion.div>

      {/* Person-to-Person Payments */}
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
      >
        <button style={styles.cardHeader} onClick={() => toggleSection('payments')}>
          <div style={styles.cardHeaderLeft}>
            <CreditCard size={18} color="#10b981" />
            <h3 style={styles.cardTitle}>Zahlungen ({payments.length})</h3>
          </div>
          <motion.div animate={{ rotate: sectionsOpen.payments ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} color="#94a3b8" />
          </motion.div>
        </button>
        <AnimatePresence>
          {sectionsOpen.payments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={styles.cardBody}>
                {/* Add payment form */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <select value={paymentForm.from} onChange={e => setPaymentForm(f => ({ ...f, from: e.target.value }))}
                    style={{ flex: 1, minWidth: '90px', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff', color: '#334155' }}>
                    <option value="">Von</option>
                    {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={paymentForm.to} onChange={e => setPaymentForm(f => ({ ...f, to: e.target.value }))}
                    style={{ flex: 1, minWidth: '90px', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff', color: '#334155' }}>
                    <option value="">An</option>
                    {participants.filter(p => p !== paymentForm.from).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="number" inputMode="decimal" step="0.01" min="0"
                    placeholder={`Betrag (${displayCurrency})`} value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '110px', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit' }} />
                  <input type="date" value={paymentForm.date}
                    onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '130px', padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input type="text" placeholder="Notiz (optional)" value={paymentForm.note}
                    onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
                    style={{ flex: 1, padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit' }} />
                  <button onClick={handleAddPayment}
                    disabled={paymentSaving || !paymentForm.from || !paymentForm.to || !paymentForm.amount || paymentForm.from === paymentForm.to}
                    style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: (paymentSaving || !paymentForm.from || !paymentForm.to || !paymentForm.amount) ? 0.5 : 1 }}>
                    {paymentSaving ? '...' : '+ Zahlung'}
                  </button>
                </div>

                {/* Payment list */}
                {payments.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem 0' }}>
                    Noch keine Zahlungen erfasst
                  </div>
                ) : (
                  payments.map((pay, i) => {
                    const fromIdx = participants.indexOf(pay.from);
                    const toIdx = participants.indexOf(pay.to);
                    const isEditing = editPayment?.id === pay.id;
                    return (
                      <div key={pay.id} style={{ marginBottom: '0.5rem' }}>
                        {isEditing ? (
                          <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '0.75rem', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                              <select value={editPayment.from} onChange={e => setEditPayment(p => ({ ...p, from: e.target.value }))}
                                style={{ flex: 1, minWidth: '80px', padding: '0.4rem', borderRadius: '7px', border: '1px solid #86efac', fontSize: '0.8rem', fontFamily: 'inherit' }}>
                                {participants.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                              <select value={editPayment.to} onChange={e => setEditPayment(p => ({ ...p, to: e.target.value }))}
                                style={{ flex: 1, minWidth: '80px', padding: '0.4rem', borderRadius: '7px', border: '1px solid #86efac', fontSize: '0.8rem', fontFamily: 'inherit' }}>
                                {participants.filter(p => p !== editPayment.from).map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                              <input type="number" inputMode="decimal" step="0.01" value={editPayment.amount}
                                onChange={e => setEditPayment(p => ({ ...p, amount: e.target.value }))}
                                style={{ width: '90px', padding: '0.4rem', borderRadius: '7px', border: '1px solid #86efac', fontSize: '0.8rem', fontFamily: 'inherit' }} />
                              <input type="date" value={editPayment.date || ''}
                                onChange={e => setEditPayment(p => ({ ...p, date: e.target.value }))}
                                style={{ width: '130px', padding: '0.4rem', borderRadius: '7px', border: '1px solid #86efac', fontSize: '0.8rem', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <input type="text" placeholder="Notiz" value={editPayment.note || ''}
                                onChange={e => setEditPayment(p => ({ ...p, note: e.target.value }))}
                                style={{ flex: 1, padding: '0.4rem', borderRadius: '7px', border: '1px solid #86efac', fontSize: '0.8rem', fontFamily: 'inherit' }} />
                              <button onClick={handleUpdatePayment} style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditPayment(null)} style={{ padding: '0.4rem 0.75rem', borderRadius: '7px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer' }}>
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', background: i % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: AVATAR_COLORS[fromIdx >= 0 ? fromIdx % AVATAR_COLORS.length : 0], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '11px', lineHeight: '28px', textAlign: 'center', flexShrink: 0 }}>
                              {getInitials(pay.from)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{pay.from}</span>
                            <ArrowRight size={13} color="#10b981" />
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: AVATAR_COLORS[toIdx >= 0 ? toIdx % AVATAR_COLORS.length : 1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '11px', lineHeight: '28px', textAlign: 'center', flexShrink: 0 }}>
                              {getInitials(pay.to)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{pay.to}</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatCurrency(pay.amount, displayCurrency)}</span>
                              {(pay.date || pay.note) && (
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{pay.date}{pay.note ? ` · ${pay.note}` : ''}</span>
                              )}
                            </div>
                            <button onClick={() => setEditPayment({ ...pay })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeletePayment(pay.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expense Breakdown by Person */}
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <button style={styles.cardHeader} onClick={() => toggleSection('breakdown')}>
          <div style={styles.cardHeaderLeft}>
            <FileText size={18} color="#f59e0b" />
            <h3 style={styles.cardTitle}>Ausgaben pro Person</h3>
          </div>
          <motion.div
            animate={{ rotate: sectionsOpen.breakdown ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} color="#94a3b8" />
          </motion.div>
        </button>
        <AnimatePresence>
          {sectionsOpen.breakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={styles.cardBody}>
                {participants.map((p, i) => {
                  const stats = personStats[p] || { paidExpenses: [], owedExpenses: [] };
                  const isExpanded = expandedPerson === p;
                  return (
                    <div key={p} style={{ marginBottom: '0.35rem' }}>
                      <button
                        style={styles.expandBtn}
                        onClick={() => setExpandedPerson(isExpanded ? null : p)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={styles.avatar(getAvatarColor(p, i))}>
                            {getInitials(p)}
                          </div>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{p}</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} color="#94a3b8" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={styles.expandContent}>
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                  Bezahlt:
                                </div>
                                {stats.paidExpenses.length === 0 ? (
                                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Keine Ausgaben bezahlt</div>
                                ) : (
                                  stats.paidExpenses.map((exp, j) => (
                                    <div key={j} style={styles.expenseItem}>
                                      <span>{exp.name || 'Ohne Name'}</span>
                                      <span style={{ fontWeight: 600 }}>
                                        {formatCurrency(parseFloat(exp.amount) || 0, exp.currency || displayCurrency)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                  Beteiligt an:
                                </div>
                                {stats.owedExpenses.length === 0 ? (
                                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Keine Beteiligungen</div>
                                ) : (
                                  stats.owedExpenses.map((exp, j) => {
                                    const amount = parseFloat(exp.amount) || 0;
                                    let share;
                                    if (exp.paidForAmounts && exp.paidForAmounts[p] !== undefined) {
                                      share = parseFloat(exp.paidForAmounts[p]) || 0;
                                    } else {
                                      share = amount / (exp.paidFor?.length || 1);
                                    }
                                    return (
                                      <div key={j} style={styles.expenseItem}>
                                        <span>{exp.name || 'Ohne Name'} (von {exp.paidBy})</span>
                                        <span style={{ fontWeight: 600 }}>
                                          {formatCurrency(share, exp.currency || displayCurrency)}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Export Section */}
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <button style={styles.cardHeader} onClick={() => toggleSection('export')}>
          <div style={styles.cardHeaderLeft}>
            <Download size={18} color="#3b82f6" />
            <h3 style={styles.cardTitle}>Exportieren</h3>
          </div>
          <motion.div
            animate={{ rotate: sectionsOpen.export ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} color="#94a3b8" />
          </motion.div>
        </button>
        <AnimatePresence>
          {sectionsOpen.export && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={styles.cardBody}>
                <div style={styles.exportBtnGroup}>
                  <motion.button
                    style={styles.exportBtn('#ef4444')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExportPDF}
                  >
                    <FileText size={16} />
                    PDF
                  </motion.button>
                  <motion.button
                    style={styles.exportBtn('#10b981')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExportExcel}
                  >
                    <FileSpreadsheet size={16} />
                    Excel
                  </motion.button>
                  <motion.button
                    style={styles.exportBtn('#6366f1')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExportImage}
                  >
                    <Image size={16} />
                    Bild
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hidden clean export canvas – always rendered off-screen */}
      <div
        id="shared-export-canvas"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '560px',
          background: '#ffffff',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          padding: '32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Gemeinsamer Urlaub
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>
            {currentVacation?.name || 'Abrechnung'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Total amount */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', borderRadius: '10px', padding: '14px 18px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>Gesamtbetrag des Urlaubs</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
            {formatCurrency(participants.reduce((sum, p) => sum + (personStats[p]?.paid || 0), 0), displayCurrency)}
          </span>
        </div>

        {/* Summary Table */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
            Übersichtstabelle
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Teilnehmer</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bezahlt</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anteil</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bilanz</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => {
                const stats = personStats[p] || { paid: 0, owes: 0 };
                const balance = stats.paid - stats.owes;
                const balanceColor = balance > 0.01 ? '#16a34a' : balance < -0.01 ? '#dc2626' : '#64748b';
                return (
                  <tr key={p} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '12px',
                          lineHeight: '32px', textAlign: 'center', flexShrink: 0,
                        }}>
                          {getInitials(p)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{p}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 500, color: '#334155' }}>
                      {formatCurrency(stats.paid, displayCurrency)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 500, color: '#334155' }}>
                      {formatCurrency(stats.owes, displayCurrency)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: balanceColor }}>
                      {balance > 0.01 ? '+' : ''}{formatCurrency(balance, displayCurrency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Settlements */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#8b5cf6' }} />
            Ausgleichszahlungen
          </div>
          {settlements.length === 0 ? (
            <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: '10px', color: '#16a34a', fontSize: '13px', fontWeight: 500, border: '1px solid #bbf7d0' }}>
              ✓ Alle Ausgaben sind ausgeglichen – keine Zahlungen notwendig.
            </div>
          ) : (
            settlements.map((s, i) => (
              <div key={`${s.from}-${s.to}`} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: '#f8fafc',
                borderRadius: '10px', marginBottom: '8px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: AVATAR_COLORS[participants.indexOf(s.from) % AVATAR_COLORS.length] || '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '12px',
                  lineHeight: '32px', textAlign: 'center', flexShrink: 0,
                }}>
                  {getInitials(s.from)}
                </div>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{s.from}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '1px' }} />
                  <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700 }}>→</span>
                </div>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: AVATAR_COLORS[participants.indexOf(s.to) % AVATAR_COLORS.length] || '#8b5cf6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '12px',
                  lineHeight: '32px', textAlign: 'center', flexShrink: 0,
                }}>
                  {getInitials(s.to)}
                </div>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{s.to}</span>
                <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '15px', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {formatCurrency(s.amount, displayCurrency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
