import { motion } from 'framer-motion';

export default function Header({ vacationName }) {
  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 14,
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(135deg, rgba(14,165,233,0.92), rgba(6,182,212,0.92) 60%, rgba(13,148,136,0.92))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 4px 16px -8px rgba(14,165,233,0.4), inset 0 -1px 0 rgba(255,255,255,0.15)',
      }}
    >
      <motion.span
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
        style={{ fontSize: 28, lineHeight: 1 }}
      >
        🏝️
      </motion.span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}>
          Urlaubsausgaben
        </h1>
        {vacationName && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              margin: 0,
              fontSize: 13,
              opacity: 0.92,
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
    </motion.div>
  );
}
