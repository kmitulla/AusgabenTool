import { motion } from 'framer-motion';
import SyncIndicator from './SyncIndicator';

export default function Header({ vacationName }) {
  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 12,
        paddingLeft: 'max(18px, env(safe-area-inset-left))',
        paddingRight: 'max(18px, env(safe-area-inset-right))',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 24px -16px rgba(15,23,42,0.18), inset 0 -1px 0 rgba(15,23,42,0.04)',
      }}
    >
      {/* specular highlight for the glass feel */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(120% 90% at 8% -30%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 55%)',
        pointerEvents: 'none',
      }} />
      <motion.div
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
        style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(160deg, rgba(14,165,233,0.22), rgba(6,182,212,0.14))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px -4px rgba(14,165,233,0.35)',
          fontSize: 22, lineHeight: 1,
          position: 'relative', zIndex: 1,
        }}
      >
        🏝️
      </motion.div>
      <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
        <h1 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#0f172a',
        }}>
          Urlaubsausgaben
        </h1>
        {vacationName && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              margin: '1px 0 0',
              fontSize: 13,
              color: '#475569',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {vacationName}
          </motion.p>
        )}
      </div>
      <SyncIndicator />
    </motion.div>
  );
}
