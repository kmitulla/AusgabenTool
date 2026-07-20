import { motion } from 'framer-motion';
import { BarChart3, Receipt, Plane, Settings, Users, MapPin } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'expenses', label: 'Ausgaben', icon: Receipt },
  { id: 'destinations', label: 'Ziele', icon: MapPin },
  { id: 'vacations', label: 'Urlaube', icon: Plane },
  { id: 'shared', label: 'Gruppe', icon: Users, sharedOnly: true },
  { id: 'settings', label: 'Optionen', icon: Settings },
];

export default function TabBar({ activeTab, onTabChange, showShared }) {
  const visibleTabs = tabs.filter(t => !t.sharedOnly || showShared);
  // With all 6 tabs visible the labels get tight on narrow phones
  const labelSize = visibleTabs.length > 5 ? 9.5 : 10;

  return (
    // Positioning shell: keeps the floating pill centered and clear of the safe area
    <div style={{
      position: 'fixed',
      bottom: 'max(10px, env(safe-area-inset-bottom))',
      left: 'max(10px, env(safe-area-inset-left))',
      right: 'max(10px, env(safe-area-inset-right))',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        padding: '6px 4px',
        borderRadius: 32,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 12px 32px -12px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* specular sheen across the pill */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(130% 100% at 15% -40%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 55%)',
          pointerEvents: 'none',
        }} />
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
                justifyContent: 'center',
                gap: 3,
                padding: '8px 1px 7px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                position: 'relative',
                borderRadius: 26,
              }}
            >
              {/* Liquid-Glass bubble that slides to the active tab */}
              {isActive && (
                <motion.div
                  layoutId="tabBubble"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 26,
                    background: 'linear-gradient(160deg, rgba(14,165,233,0.2) 0%, rgba(6,182,212,0.12) 100%)',
                    border: '1px solid rgba(255,255,255,0.75)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 12px -6px rgba(14,165,233,0.45)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex' }}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.9}
                  color={isActive ? '#0284c7' : '#64748b'}
                />
              </motion.div>
              <span style={{
                position: 'relative',
                zIndex: 1,
                fontSize: labelSize,
                fontWeight: isActive ? 650 : 500,
                color: isActive ? '#0284c7' : '#64748b',
                letterSpacing: 0,
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
    </div>
  );
}
