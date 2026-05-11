import { motion } from 'framer-motion';
import { BarChart3, Receipt, Plane, Settings, Users, MapPin } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'expenses', label: 'Ausgaben', icon: Receipt },
  { id: 'destinations', label: 'Ziele', icon: MapPin },
  { id: 'vacations', label: 'Urlaube', icon: Plane },
  { id: 'shared', label: 'Gemeinsam', icon: Users, sharedOnly: true },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];

const INDICATOR_WIDTH = 40;

export default function TabBar({ activeTab, onTabChange, showShared }) {
  const visibleTabs = tabs.filter(t => !t.sharedOnly || showShared);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(22px) saturate(180%)',
      WebkitBackdropFilter: 'blur(22px) saturate(180%)',
      borderTop: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 -4px 24px -8px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 6,
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(6px, env(safe-area-inset-left))',
      paddingRight: 'max(6px, env(safe-area-inset-right))',
      zIndex: 1000,
    }}>
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileTap={{ scale: 0.92 }}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 2px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="tabIndicator"
                style={{
                  position: 'absolute',
                  top: -6,
                  left: `calc(50% - ${INDICATOR_WIDTH / 2}px)`,
                  width: INDICATOR_WIDTH,
                  height: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                  boxShadow: '0 1px 3px rgba(14,165,233,0.4)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <motion.div
              animate={{
                scale: isActive ? 1.12 : 1,
                y: isActive ? -1 : 0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Icon
                size={21}
                strokeWidth={isActive ? 2.5 : 1.9}
                color={isActive ? '#0ea5e9' : '#94a3b8'}
              />
            </motion.div>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0ea5e9' : '#94a3b8',
              letterSpacing: '0.01em',
              transition: 'color 0.2s',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
