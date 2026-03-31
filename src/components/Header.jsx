import { motion } from 'framer-motion';
import { Palmtree } from 'lucide-react';

export default function Header({ vacationName }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4, #0d9488)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3)',
      }}
    >
      <motion.span
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
        style={{ fontSize: '28px' }}
      >
        🏝️
      </motion.span>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}>
          Urlaubsausgaben
        </h1>
        {vacationName && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              margin: 0,
              fontSize: '13px',
              opacity: 0.85,
              fontWeight: 500,
            }}
          >
            {vacationName}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
