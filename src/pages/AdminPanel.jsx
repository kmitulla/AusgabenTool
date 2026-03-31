import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsers, createUser, updateUser, deleteUser } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Trash2, Edit3, Shield, KeyRound, ArrowLeft } from 'lucide-react';

const colors = {
  primary: '#0ea5e9',
  primaryHover: '#0284c7',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  success: '#22c55e',
  successHover: '#16a34a',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

const styles = {
  container: {
    minHeight: '100vh',
    background: colors.bg,
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: colors.text,
  },
  inner: {
    maxWidth: 720,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    background: colors.card,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    color: colors.text,
    flexShrink: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    flex: 1,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 12,
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
  },
  userCard: {
    background: colors.card,
    borderRadius: 16,
    padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 18,
    color: '#fff',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 600,
    fontSize: 16,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: colors.bg,
    color: colors.textMuted,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: colors.card,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 20px 0',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1.5px solid ${colors.border}`,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    marginTop: 24,
  },
  btnPrimary: {
    flex: 1,
    padding: '11px 20px',
    borderRadius: 12,
    border: 'none',
    background: colors.primary,
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnCancel: {
    flex: 1,
    padding: '11px 20px',
    borderRadius: 12,
    border: `1.5px solid ${colors.border}`,
    background: 'transparent',
    color: colors.text,
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnDanger: {
    flex: 1,
    padding: '11px 20px',
    borderRadius: 12,
    border: 'none',
    background: colors.danger,
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnReset: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    border: `1.5px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textMuted,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    padding: '48px 20px',
    color: colors.textMuted,
    fontSize: 15,
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 350 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function getAvatarColor(name) {
  const hues = [210, 250, 330, 160, 30, 280, 190, 10, 50, 130];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hues[Math.abs(hash) % hues.length]}, 65%, 55%)`;
}

export default function AdminPanel({ onBack }) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAdmin, setFormAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.sort((a, b) => a.username.localeCompare(b.username)));
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setFormName('');
    setFormPassword('');
    setFormAdmin(false);
    setError('');
    setModal('create');
  };

  const openEdit = (user) => {
    setEditUser(user);
    setFormName(user.username);
    setFormPassword('');
    setFormAdmin(user.isAdmin || false);
    setError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditUser(null);
    setError('');
  };

  const handleCreate = async () => {
    const name = formName.trim();
    if (!name) {
      setError('Benutzername ist erforderlich');
      return;
    }
    const existing = users.find(u => u.username.toLowerCase() === name.toLowerCase());
    if (existing) {
      setError('Benutzer existiert bereits');
      return;
    }
    setSaving(true);
    try {
      await createUser(name, formPassword || '', formAdmin);
      await loadUsers();
      closeModal();
    } catch (e) {
      setError('Fehler beim Erstellen');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    const name = formName.trim();
    if (!name) {
      setError('Benutzername ist erforderlich');
      return;
    }
    setSaving(true);
    try {
      const data = { username: name, isAdmin: formAdmin };
      if (formPassword) {
        data.password = formPassword;
        data.mustSetPassword = false;
      }
      await updateUser(editUser.id, data);
      await loadUsers();
      closeModal();
    } catch (e) {
      setError('Fehler beim Speichern');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateUser(editUser.id, { password: '', mustSetPassword: true });
      await loadUsers();
      closeModal();
    } catch (e) {
      setError('Fehler beim Zurücksetzen');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    setSaving(true);
    try {
      await deleteUser(userId);
      setDeleteConfirm(null);
      await loadUsers();
    } catch (e) {
      console.error('Failed to delete user', e);
    } finally {
      setSaving(false);
    }
  };

  const isSelf = (user) => currentUser && user.id === currentUser.id;

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        {/* Header */}
        <div style={styles.header}>
          <motion.button
            style={styles.backBtn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <h1 style={styles.title}>Benutzerverwaltung</h1>
          <motion.button
            style={styles.addBtn}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
          >
            <UserPlus size={18} />
            <span>Neu</span>
          </motion.button>
        </div>

        {/* User list */}
        {loading ? (
          <div style={styles.empty}>Laden...</div>
        ) : users.length === 0 ? (
          <div style={styles.empty}>Keine Benutzer vorhanden</div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                  style={styles.userCard}
                >
                  <div
                    style={{
                      ...styles.avatar,
                      background: getAvatarColor(user.username),
                    }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.cardInfo}>
                    <p style={styles.username}>{user.username}</p>
                    {user.isAdmin && (
                      <div
                        style={{
                          ...styles.badge,
                          background: `${colors.primary}18`,
                          color: colors.primary,
                        }}
                      >
                        <Shield size={12} />
                        Admin
                      </div>
                    )}
                    {user.mustSetPassword && (
                      <div
                        style={{
                          ...styles.badge,
                          background: `${colors.danger}18`,
                          color: colors.danger,
                          marginLeft: user.isAdmin ? 6 : 0,
                        }}
                      >
                        <KeyRound size={12} />
                        Passwort setzen
                      </div>
                    )}
                  </div>
                  <div style={styles.actions}>
                    <motion.button
                      style={styles.iconBtn}
                      whileHover={{ scale: 1.1, background: `${colors.primary}18`, color: colors.primary }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEdit(user)}
                      title="Bearbeiten"
                    >
                      <Edit3 size={16} />
                    </motion.button>
                    {!isSelf(user) && (
                      <motion.button
                        style={styles.iconBtn}
                        whileHover={{ scale: 1.1, background: `${colors.danger}18`, color: colors.danger }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(user)}
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            style={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
          >
            <motion.div
              style={styles.modal}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>
                {modal === 'create' ? 'Neuer Benutzer' : 'Benutzer bearbeiten'}
              </h2>

              {error && (
                <div
                  style={{
                    background: `${colors.danger}12`,
                    color: colors.danger,
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 16,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Benutzername</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Name eingeben"
                  autoFocus
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = colors.border)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  {modal === 'edit' ? 'Neues Passwort (leer lassen um beizubehalten)' : 'Passwort (optional)'}
                </label>
                <input
                  style={styles.input}
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={modal === 'edit' ? 'Neues Passwort' : 'Passwort'}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = colors.border)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formAdmin}
                    onChange={(e) => setFormAdmin(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: colors.primary }}
                  />
                  <Shield size={16} style={{ color: colors.primary }} />
                  Administrator
                </label>
              </div>

              {modal === 'edit' && (
                <motion.button
                  style={styles.btnReset}
                  whileHover={{ background: `${colors.danger}10`, color: colors.danger, borderColor: colors.danger }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleResetPassword}
                  disabled={saving}
                >
                  <KeyRound size={14} />
                  Passwort zurücksetzen
                </motion.button>
              )}

              <div style={styles.modalActions}>
                <motion.button
                  style={styles.btnCancel}
                  whileHover={{ background: colors.bg }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Abbrechen
                </motion.button>
                <motion.button
                  style={styles.btnPrimary}
                  whileHover={{ background: colors.primaryHover }}
                  whileTap={{ scale: 0.97 }}
                  onClick={modal === 'create' ? handleCreate : handleEdit}
                  disabled={saving}
                >
                  {saving ? 'Speichern...' : modal === 'create' ? 'Erstellen' : 'Speichern'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            style={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              style={styles.modal}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>Benutzer löschen</h2>
              <p style={{ color: colors.textMuted, fontSize: 15, margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Möchtest du <strong style={{ color: colors.text }}>{deleteConfirm.username}</strong> wirklich
                löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div style={styles.modalActions}>
                <motion.button
                  style={styles.btnCancel}
                  whileHover={{ background: colors.bg }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setDeleteConfirm(null)}
                  disabled={saving}
                >
                  Abbrechen
                </motion.button>
                <motion.button
                  style={styles.btnDanger}
                  whileHover={{ background: colors.dangerHover }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDelete(deleteConfirm.id)}
                  disabled={saving}
                >
                  {saving ? 'Löschen...' : 'Löschen'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
