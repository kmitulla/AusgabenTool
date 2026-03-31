import { motion } from 'framer-motion';
import { BarChart3, Receipt, Plane, Settings, Users } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'expenses', label: 'Ausgaben', icon: Receipt },
  { id: 'vacations', label: 'Urlaube', icon: Plane },
  { id: 'shared', label: 'Gemeinsam', icon: Users, sharedOnly: true },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];

export default function TabBar({ activeTab, onTabChange, showShared }) {
  const visibleTabs = tabs.filter(t => !t.sharedOnly || showShared);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '6px 0 max(6px, env(safe-area-inset-bottom))',
      zIndex: 1000,
      boxShadow: '0 -2px 20px rgba(0,0,0,0.06)',
    }}>
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
              minWidth: '60px',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="tabIndicator"
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '30px',
                  height: '3px',
                  borderRadius: '3px',
                  background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <motion.div
              animate={{
                scale: isActive ? 1.15 : 1,
                y: isActive ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? '#0ea5e9' : '#94a3b8'}
              />
            </motion.div>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0ea5e9' : '#94a3b8',
              letterSpacing: '0.02em',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
