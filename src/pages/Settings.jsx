import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateVacation } from '../utils/db';
import { updateUser } from '../utils/db';
import { useVacation } from '../contexts/VacationContext';
import { useAuth } from '../contexts/AuthContext';
import { exportAsImage, exportAsExcel } from '../utils/exportUtils';
import { DEFAULT_AI_MODEL, AI_MODEL_OPTIONS } from '../utils/aiReceipt';
import { Settings as SettingsIcon, DollarSign, Eye, EyeOff, Users, Download, Key, LogOut, ChevronDown, ChevronUp, Plus, Trash2, Save, X, Image, FileSpreadsheet, UserCog, User, Info, Edit3, Sparkles } from 'lucide-react';

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
  section: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
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
  sectionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#334155',
    margin: 0,
  },
  sectionBody: {
    padding: '0 1.25rem 1.25rem',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  toggleLabel: {
    fontSize: '0.95rem',
    color: '#475569',
    fontWeight: 500,
  },
  toggle: (on) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: on ? '#10b981' : '#cbd5e1',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.25s ease',
    flexShrink: 0,
  }),
  toggleKnob: (on) => ({
    position: 'absolute',
    top: '2px',
    left: on ? '22px' : '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'left 0.25s ease',
  }),
  rateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  rateCode: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#334155',
    width: '50px',
  },
  rateInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#f8fafc',
    transition: 'border-color 0.2s',
  },
  smallBtn: (color = '#ef4444') => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: `${color}15`,
    color: color,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  addInput: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#f8fafc',
    width: '70px',
    textTransform: 'uppercase',
  },
  select: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#f8fafc',
    cursor: 'pointer',
    marginTop: '0.75rem',
    width: '100%',
  },
  selectLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: 600,
    marginTop: '0.75rem',
    marginBottom: '0.3rem',
  },
  participantRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  participantName: {
    fontSize: '0.95rem',
    color: '#334155',
    fontWeight: 500,
  },
  warning: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    fontSize: '0.85rem',
    color: '#92400e',
    marginTop: '0.75rem',
  },
  exportBtn: (bg) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.1rem',
    borderRadius: '10px',
    border: 'none',
    background: bg,
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    flex: 1,
    justifyContent: 'center',
  }),
  exportRow: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#f8fafc',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputGroup: {
    marginBottom: '1rem',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '0.35rem',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    width: '100%',
  },
  dangerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    width: '100%',
  },
  adminBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    border: '2px solid #6366f1',
    background: '#eef2ff',
    color: '#4f46e5',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    width: '100%',
  },
  toast: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#10b981',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
    zIndex: 9999,
    pointerEvents: 'none',
  },
};

const fieldLabels = {
  date: 'Datum',
  time: 'Uhrzeit',
  category: 'Kategorie',
  amount: 'Betrag',
  currency: 'Währung',
  note: 'Notiz',
  paidBy: 'Bezahlt von',
  paidFor: 'Bezahlt für',
};

function Toggle({ on, onToggle }) {
  return (
    <button style={styles.toggle(on)} onClick={onToggle} type="button">
      <span style={styles.toggleKnob(on)} />
    </button>
  );
}

function Section({ icon, title, children, defaultOpen = false }) {
  const { currentUser } = useAuth();
  const storageKey = currentUser ? `settings_section_${currentUser.id}_${title}` : null;
  const [open, setOpen] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === 'true';
    }
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) localStorage.setItem(storageKey, String(next));
  };

  return (
    <div style={styles.section}>
      <button style={styles.sectionHeader} onClick={toggle}>
        <div style={styles.sectionHeaderLeft}>
          {icon}
          <h3 style={styles.sectionTitle}>{title}</h3>
        </div>
        {open ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={styles.sectionBody}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Settings({ onAdminPanel, onLogout }) {
  const { currentVacation, expenses, refreshVacation } = useVacation();
  const auth = useAuth();
  const { currentUser, logout, refreshUser } = auth;

  const settings = currentVacation?.settings || {};

  const [visibleFields, setVisibleFields] = useState(settings.visibleFields || {});
  const [exchangeRates, setExchangeRates] = useState(settings.exchangeRates || { EUR: 1 });
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultExchangeRate || 'EUR');
  const [sharedMode, setSharedMode] = useState(settings.sharedMode || false);
  const [participants, setParticipants] = useState(settings.participants || []);

  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('');
  const [newParticipant, setNewParticipant] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [vacationName, setVacationName] = useState(currentVacation?.name || '');
  const [showRateInfo, setShowRateInfo] = useState(false);
  const [percentageSplits, setPercentageSplits] = useState(settings.percentageSplits || false);

  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  // --- OpenAI API-Key (pro User, geräteübergreifend in Firestore) ---
  const [apiKey, setApiKey] = useState(currentUser?.openaiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [aiModel, setAiModel] = useState(currentUser?.openaiModel || DEFAULT_AI_MODEL);

  useEffect(() => {
    setApiKey(currentUser?.openaiApiKey || '');
    setAiModel(currentUser?.openaiModel || DEFAULT_AI_MODEL);
  }, [currentUser?.openaiApiKey, currentUser?.openaiModel]);

  const handleSaveApiKey = async () => {
    if (!currentUser) return;
    setSavingApiKey(true);
    try {
      await updateUser(currentUser.id, { openaiApiKey: apiKey.trim(), openaiModel: aiModel });
      await refreshUser();
      showToast(apiKey.trim() ? 'Einstellungen gespeichert' : 'API-Key entfernt');
    } catch (e) {
      showToast('Fehler beim Speichern');
    }
    setSavingApiKey(false);
  };

  useEffect(() => {
    if (currentVacation) {
      setVacationName(currentVacation.name || '');
      if (currentVacation.settings) {
        const s = currentVacation.settings;
        setVisibleFields(s.visibleFields || {});
        setExchangeRates(s.exchangeRates || { EUR: 1 });
        setDefaultCurrency(s.defaultExchangeRate || 'EUR');
        setSharedMode(s.sharedMode || false);
        setParticipants(s.participants || []);
        setPercentageSplits(s.percentageSplits || false);
      }
    }
  }, [currentVacation]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const saveSettings = async (overrides = {}) => {
    if (!currentVacation) return;
    setSaving(true);
    try {
      const newSettings = {
        ...currentVacation.settings,
        visibleFields,
        exchangeRates,
        defaultExchangeRate: defaultCurrency,
        sharedMode,
        participants,
        percentageSplits,
        ...overrides,
      };
      await updateVacation(currentVacation.id, { settings: newSettings });
      await refreshVacation();
      showToast('Einstellungen gespeichert');
    } catch (e) {
      showToast('Fehler beim Speichern');
    }
    setSaving(false);
  };

  // --- Visible Fields ---
  const handleFieldToggle = (field) => {
    const updated = { ...visibleFields, [field]: !visibleFields[field] };
    setVisibleFields(updated);
    saveSettings({ visibleFields: updated });
  };

  // --- Exchange Rates ---
  const handleRateChange = (code, value) => {
    const num = parseFloat(value);
    if (value === '' || !isNaN(num)) {
      setExchangeRates({ ...exchangeRates, [code]: value === '' ? '' : num });
    }
  };

  const handleRateBlur = (code) => {
    const val = exchangeRates[code];
    if (val === '' || isNaN(val)) {
      setExchangeRates({ ...exchangeRates, [code]: 1 });
    }
    saveSettings({ exchangeRates: { ...exchangeRates, [code]: val === '' || isNaN(val) ? 1 : val } });
  };

  const handleAddCurrency = () => {
    const code = newCurrencyCode.trim().toUpperCase();
    const rate = parseFloat(newCurrencyRate);
    if (!code || code.length < 2 || code.length > 4) return;
    if (isNaN(rate) || rate <= 0) return;
    if (exchangeRates[code] !== undefined) return;
    const updated = { ...exchangeRates, [code]: rate };
    setExchangeRates(updated);
    setNewCurrencyCode('');
    setNewCurrencyRate('');
    saveSettings({ exchangeRates: updated });
  };

  const handleDeleteCurrency = (code) => {
    if (code === 'EUR') return;
    const updated = { ...exchangeRates };
    delete updated[code];
    setExchangeRates(updated);
    if (defaultCurrency === code) {
      setDefaultCurrency('EUR');
      saveSettings({ exchangeRates: updated, defaultExchangeRate: 'EUR' });
    } else {
      saveSettings({ exchangeRates: updated });
    }
  };

  const handleDefaultCurrencyChange = (e) => {
    setDefaultCurrency(e.target.value);
    saveSettings({ defaultExchangeRate: e.target.value });
  };

  // --- Shared Mode ---
  const handleSharedToggle = () => {
    const next = !sharedMode;
    setSharedMode(next);
    saveSettings({ sharedMode: next });
  };

  const handleAddParticipant = () => {
    const name = newParticipant.trim();
    if (!name || participants.includes(name)) return;
    const updated = [...participants, name];
    setParticipants(updated);
    setNewParticipant('');
    saveSettings({ participants: updated });
  };

  const handleRemoveParticipant = (name) => {
    const updated = participants.filter((p) => p !== name);
    setParticipants(updated);
    saveSettings({ participants: updated });
  };

  // --- Password ---
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (currentUser.password && currentPassword !== currentUser.password) {
      setPasswordError('Aktuelles Passwort ist falsch.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      await updateUser(currentUser.id, { password: newPassword });
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Passwort erfolgreich geändert.');
      showToast('Passwort geändert');
    } catch (e) {
      setPasswordError('Fehler beim Ändern des Passworts.');
    }
  };

  // --- Vacation Name ---
  const handleSaveVacationName = async () => {
    if (!vacationName.trim()) return;
    await updateVacation(currentVacation.id, { name: vacationName.trim() });
    await refreshVacation();
    showToast('Urlaubsname gespeichert');
  };

  // --- Percentage Splits ---
  const handlePercentageSplitsToggle = () => {
    const next = !percentageSplits;
    setPercentageSplits(next);
    saveSettings({ percentageSplits: next });
  };

  // --- Export ---
  const handleExportImage = () => {
    const el = document.getElementById('export-content');
    if (!el) {
      alert('Bitte gehe zur Übersicht und nutze den Export dort');
      return;
    }
    exportAsImage('export-content', `${currentVacation?.name || 'urlaub'}.png`);
  };
  const handleExportExcel = () => {
    const data = (expenses || []).map(e => ({
      Ausgabe: e.name,
      Betrag: e.amount,
      Währung: e.currency,
      Kategorie: e.category,
      Datum: e.date,
    }));
    exportAsExcel(data, `${currentVacation?.name || 'urlaub'}.xlsx`);
  };

  // --- Logout ---
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  if (!currentVacation) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '3rem' }}>
          Kein Urlaub ausgewählt.
        </p>
      </div>
    );
  }

  const visibleFieldKeys = Object.keys(fieldLabels).filter((key) => {
    if (key === 'paidBy' || key === 'paidFor') return sharedMode;
    return true;
  });

  return (
    <div style={styles.container}>
      <motion.div
        style={styles.header}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SettingsIcon size={28} color="#0d9488" />
        <h1 style={styles.headerTitle}>Einstellungen</h1>
      </motion.div>

      {/* Logged-in User */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02, duration: 0.35 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          background: '#f0fdf4',
          borderRadius: '12px',
          border: '1px solid #bbf7d0',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#166534',
          fontWeight: 500,
        }}
      >
        <User size={16} color="#16a34a" />
        Angemeldet als: {currentUser?.username}
      </motion.div>

      {/* Rename Vacation */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03, duration: 0.35 }}
      >
        <Section icon={<Edit3 size={18} color="#0d9488" />} title="Urlaub umbenennen" defaultOpen>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={vacationName}
              onChange={(e) => setVacationName(e.target.value)}
              placeholder="Urlaubsname"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveVacationName()}
            />
            <button
              style={{ ...styles.smallBtn('#10b981'), width: '40px', height: '40px' }}
              onClick={handleSaveVacationName}
              title="Speichern"
            >
              <Save size={16} />
            </button>
          </div>
        </Section>
      </motion.div>

      {/* Visible Fields */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
      >
        <Section
          icon={<Eye size={18} color="#6366f1" />}
          title="Angezeigte Felder"
          defaultOpen
        >
          {visibleFieldKeys.map((key) => (
            <div style={styles.toggleRow} key={key}>
              <span style={styles.toggleLabel}>{fieldLabels[key]}</span>
              <Toggle on={!!visibleFields[key]} onToggle={() => handleFieldToggle(key)} />
            </div>
          ))}
        </Section>
      </motion.div>

      {/* Exchange Rates */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <Section icon={<DollarSign size={18} color="#f59e0b" />} title="Wechselkurse">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowRateInfo(!showRateInfo); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Info size={14} /> Info
            </button>
          </div>
          <AnimatePresence>
            {showRateInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: '#1e40af',
                  marginBottom: '0.75rem',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                }}
              >
                Die Wechselkurse beziehen sich auf die Basiswährung (EUR). Ein Kurs von 1.08 bei USD bedeutet: 1 EUR = 1.08 USD. Wenn du eine Ausgabe in USD erfasst, wird sie automatisch in EUR umgerechnet.
              </motion.div>
            )}
          </AnimatePresence>
          {Object.entries(exchangeRates).map(([code, rate]) => (
            <div style={styles.rateRow} key={code}>
              <span style={styles.rateCode}>{code}</span>
              <input
                style={styles.rateInput}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => handleRateChange(code, e.target.value)}
                onBlur={() => handleRateBlur(code)}
                disabled={code === 'EUR'}
              />
              {code !== 'EUR' && (
                <button
                  style={styles.smallBtn('#ef4444')}
                  onClick={() => handleDeleteCurrency(code)}
                  title="Entfernen"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}

          <div style={styles.addRow}>
            <input
              style={styles.addInput}
              placeholder="USD"
              value={newCurrencyCode}
              onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
              maxLength={4}
            />
            <input
              style={{ ...styles.rateInput, width: 'auto', flex: 1 }}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Kurs"
              value={newCurrencyRate}
              onChange={(e) => setNewCurrencyRate(e.target.value)}
            />
            <button
              style={styles.smallBtn('#10b981')}
              onClick={handleAddCurrency}
              title="Hinzufügen"
            >
              <Plus size={16} />
            </button>
          </div>

          <div style={styles.selectLabel}>Standardwährung</div>
          <select
            style={styles.select}
            value={defaultCurrency}
            onChange={handleDefaultCurrencyChange}
          >
            {Object.keys(exchangeRates).map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </Section>
      </motion.div>

      {/* Shared Mode */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <Section icon={<Users size={18} color="#0ea5e9" />} title="Gemeinsamer Urlaub">
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Gemeinsamer Modus</span>
            <Toggle on={sharedMode} onToggle={handleSharedToggle} />
          </div>

          {sharedMode && (
            <div style={styles.toggleRow}>
              <span style={styles.toggleLabel}>Prozentuale Aufteilung</span>
              <Toggle on={percentageSplits} onToggle={handlePercentageSplitsToggle} />
            </div>
          )}

          <AnimatePresence initial={false}>
            {sharedMode && (
              <motion.div
                key="shared-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: '0.75rem' }}>
                  {participants.map((name) => (
                    <div style={styles.participantRow} key={name}>
                      <span style={styles.participantName}>{name}</span>
                      <button
                        style={styles.smallBtn('#ef4444')}
                        onClick={() => handleRemoveParticipant(name)}
                        title="Entfernen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  <div style={styles.addRow}>
                    <input
                      style={{ ...styles.rateInput, flex: 1 }}
                      placeholder="Name hinzufügen"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                    />
                    <button
                      style={styles.smallBtn('#10b981')}
                      onClick={handleAddParticipant}
                      title="Hinzufügen"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!sharedMode && (
            <div style={styles.warning}>
              Wenn der gemeinsame Modus deaktiviert wird, bleiben bereits erfasste geteilte Daten erhalten.
            </div>
          )}
        </Section>
      </motion.div>

      {/* Export */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <Section icon={<Download size={18} color="#8b5cf6" />} title="Export">
          <div style={styles.exportRow}>
            <button style={styles.exportBtn('#3b82f6')} onClick={handleExportImage}>
              <Image size={17} /> Bild (PNG)
            </button>
            <button style={styles.exportBtn('#10b981')} onClick={handleExportExcel}>
              <FileSpreadsheet size={17} /> Excel
            </button>
          </div>
        </Section>
      </motion.div>

      {/* KI Beleg-Scanner / OpenAI API-Key */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35 }}
      >
        <Section icon={<Sparkles size={18} color="#8b5cf6" />} title="KI Beleg-Scanner">
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginTop: 0, marginBottom: '0.85rem' }}>
            Hinterlege deinen persönlichen OpenAI API-Key, um Ausgaben automatisch aus
            einem Foto vom Kassenzettel zu erkennen. Der Key gilt nur für dich und wird
            geräteübergreifend gespeichert.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>OpenAI API-Key</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                style={{ ...styles.input, flex: 1, fontFamily: 'monospace' }}
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                style={styles.smallBtn('#64748b')}
                onClick={() => setShowApiKey((v) => !v)}
                title={showApiKey ? 'Verbergen' : 'Anzeigen'}
                type="button"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>KI-Modell</label>
            <select
              style={{ ...styles.select, marginTop: 0 }}
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
            >
              {AI_MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <button
            style={{ ...styles.primaryBtn, opacity: savingApiKey ? 0.7 : 1 }}
            onClick={handleSaveApiKey}
            disabled={savingApiKey}
          >
            <Save size={17} /> {savingApiKey ? 'Speichern…' : 'API-Key & Modell speichern'}
          </button>

          <div style={{ ...styles.warning, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
            Tipp: Einen API-Key erstellst du unter platform.openai.com → API Keys.
            Es können Kosten bei OpenAI anfallen (Modell: GPT‑4o Vision).
          </div>
        </Section>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        <Section icon={<Key size={18} color="#f97316" />} title="Passwort ändern">
          {currentUser?.password && (
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Aktuelles Passwort</label>
              <input
                style={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Neues Passwort</label>
            <input
              style={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Passwort bestätigen</label>
            <input
              style={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <AnimatePresence>
            {passwordError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                {passwordError}
              </motion.div>
            )}
            {passwordSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                {passwordSuccess}
              </motion.div>
            )}
          </AnimatePresence>

          <button style={styles.primaryBtn} onClick={handleChangePassword}>
            <Save size={17} /> Passwort speichern
          </button>
        </Section>
      </motion.div>

      {/* Admin Section */}
      {currentUser?.isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <Section icon={<UserCog size={18} color="#6366f1" />} title="Administration">
            <button style={styles.adminBtn} onClick={onAdminPanel}>
              <UserCog size={17} /> Benutzerverwaltung
            </button>
          </Section>
        </motion.div>
      )}

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        style={{ marginTop: '0.5rem' }}
      >
        <button style={styles.dangerBtn} onClick={handleLogout}>
          <LogOut size={17} /> Abmelden
        </button>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            style={styles.toast}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
