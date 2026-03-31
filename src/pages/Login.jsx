import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginUser, updateUser } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';

const floatingElements = ['🌴', '🌺', '🐚', '🌊', '☀️', '🍹', '🦩', '✈️'];

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0d9488 0%, #f97316 50%, #e11d48 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '1rem',
  },
  floatingElement: (i) => ({
    position: 'absolute',
    fontSize: `${1.2 + Math.random() * 1.8}rem`,
    opacity: 0.15,
    pointerEvents: 'none',
    userSelect: 'none',
    left: `${(i / floatingElements.length) * 100}%`,
    top: `${15 + Math.random() * 70}%`,
  }),
  card: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    position: 'relative',
    zIndex: 2,
  },
  iconWrap: {
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  icon: {
    fontSize: '4rem',
    display: 'inline-block',
  },
  title: {
    textAlign: 'center',
    fontSize: '2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff 0%, #fcd34d 50%, #fb923c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '0.25rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    marginBottom: '2rem',
    fontWeight: 400,
  },
  inputGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.4rem',
    letterSpacing: '0.02em',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.14)',
  },
  button: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
    boxShadow: '0 4px 16px rgba(233, 29, 72, 0.35)',
    letterSpacing: '0.02em',
    marginTop: '0.5rem',
  },
  buttonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 24px rgba(233, 29, 72, 0.45)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
};

export default function Login() {
  const auth = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [buttonHover, setButtonHover] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(username, password);

      if (result.mustSetPassword) {
        setPendingUser(result.user);
        setMustSetPassword(true);
        setPassword('');
        setLoading(false);
        return;
      }

      if (result.success) {
        auth.login(result.user);
      } else {
        setError(result.error || 'Login fehlgeschlagen. Bitte versuche es erneut.');
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    }

    setLoading(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);

    try {
      await updateUser(pendingUser.id, {
        password: newPassword,
        mustSetPassword: false,
      });

      const updatedUser = { ...pendingUser, mustSetPassword: false };
      auth.login(updatedUser);
    } catch (err) {
      setError('Passwort konnte nicht gesetzt werden. Bitte versuche es erneut.');
    }

    setLoading(false);
  };

  const getInputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocus : {}),
  });

  const getButtonStyle = () => ({
    ...styles.button,
    ...(buttonHover && !loading ? styles.buttonHover : {}),
    ...(loading ? styles.buttonDisabled : {}),
  });

  return (
    <div style={styles.wrapper}>
      {/* Floating background elements */}
      {floatingElements.map((emoji, i) => (
        <motion.span
          key={i}
          style={styles.floatingElement(i)}
          animate={{
            y: [0, -30, 0],
            x: [0, 15 * (i % 2 === 0 ? 1 : -1), 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 5 + i * 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        >
          {emoji}
        </motion.span>
      ))}

      {/* Card */}
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Palm tree icon */}
        <div style={styles.iconWrap}>
          <motion.span
            style={styles.icon}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            🏝️
          </motion.span>
        </div>

        {/* Title */}
        <motion.h1
          style={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Urlaubsausgaben
        </motion.h1>

        <motion.p
          style={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          {mustSetPassword
            ? 'Bitte lege ein neues Passwort fest'
            : 'Melde dich an, um deine Reisekosten zu verwalten'}
        </motion.p>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              style={styles.error}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '1rem' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!mustSetPassword ? (
            /* Login form */
            <motion.form
              key="login"
              onSubmit={handleLogin}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35 }}
            >
              <motion.div
                style={styles.inputGroup}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <label style={styles.label}>Benutzername</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle('username')}
                  placeholder="Dein Benutzername"
                  autoComplete="username"
                  required
                />
              </motion.div>

              <motion.div
                style={styles.inputGroup}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <label style={styles.label}>Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle('password')}
                  placeholder="Dein Passwort"
                  autoComplete="current-password"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  style={getButtonStyle()}
                  onMouseEnter={() => setButtonHover(true)}
                  onMouseLeave={() => setButtonHover(false)}
                >
                  {loading ? 'Anmeldung...' : 'Anmelden'}
                </button>
              </motion.div>
            </motion.form>
          ) : (
            /* Set new password form */
            <motion.form
              key="set-password"
              onSubmit={handleSetPassword}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35 }}
            >
              <motion.div
                style={styles.inputGroup}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <label style={styles.label}>Neues Passwort</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle('newPassword')}
                  placeholder="Neues Passwort eingeben"
                  autoComplete="new-password"
                />
              </motion.div>

              <motion.div
                style={styles.inputGroup}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <label style={styles.label}>Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle('confirmPassword')}
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  style={getButtonStyle()}
                  onMouseEnter={() => setButtonHover(true)}
                  onMouseLeave={() => setButtonHover(false)}
                >
                  {loading ? 'Wird gespeichert...' : 'Passwort festlegen'}
                </button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
