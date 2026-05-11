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
        paddingBottom: 16,
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 55%, #0d9488 100%)',
        boxShadow: '0 8px 24px -10px rgba(14,165,233,0.45)',
        overflow: 'hidden',
      }}
    >
      {/* soft frosted highlight overlay for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(140% 80% at 0% -20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%), radial-gradient(80% 60% at 110% 110%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%)',
        pointerEvents: 'none',
      }} />
      <motion.div
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
        style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.28)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
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
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}>
          Urlaubsausgaben
        </h1>
        {vacationName && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              margin: '2px 0 0',
              fontSize: 13,
              opacity: 0.95,
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
