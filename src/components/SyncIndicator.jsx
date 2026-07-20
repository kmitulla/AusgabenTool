import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeSyncState, getPendingCount } from '../utils/syncStatus';

const STATES = {
  online: {
    color: '#4ade80',
    label: null,
    title: 'Online – alles synchronisiert'
  },
  offline: {
    color: '#cbd5e1',
    label: 'Offline',
    title: 'Offline – keine ausstehenden Änderungen'
  },
  'offline-pending': {
    color: '#fbbf24',
    label: null, // wird dynamisch mit Anzahl gesetzt
    title: 'Offline – Änderungen werden synchronisiert, sobald du wieder online bist'
  },
  syncing: {
    color: '#38bdf8',
    label: 'Synchronisiert…',
    title: 'Online – Änderungen werden synchronisiert'
  }
};

export default function SyncIndicator() {
  const [state, setState] = useState('online');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    return subscribeSyncState((s) => {
      setState(s);
      setPending(getPendingCount());
    });
  }, []);

  const cfg = STATES[state] || STATES.online;
  const label = state === 'offline-pending'
    ? `${pending} ausstehend`
    : cfg.label;
  const animated = state === 'syncing' || state === 'offline-pending';

  return (
    <div
      title={cfg.title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        padding: label ? '4px 10px' : 4,
        borderRadius: 999,
        background: label ? 'rgba(255,255,255,0.55)' : 'transparent',
        border: label ? '1px solid rgba(255,255,255,0.75)' : '1px solid transparent',
        boxShadow: label ? 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 6px -3px rgba(15,23,42,0.2)' : 'none',
        color: '#475569',
        backdropFilter: label ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: label ? 'blur(8px)' : 'none',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <motion.span
        animate={animated ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={animated ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
          display: 'block',
        }}
      />
      <AnimatePresence>
        {label && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
