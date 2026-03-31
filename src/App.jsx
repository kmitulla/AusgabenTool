import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { VacationProvider, useVacation } from './contexts/VacationContext';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Overview from './pages/Overview';
import Expenses from './pages/Expenses';
import Vacations from './pages/Vacations';
import Settings from './pages/Settings';
import SharedVacation from './pages/SharedVacation';
import TabBar from './components/TabBar';
import Header from './components/Header';

function AppContent() {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdmin, setShowAdmin] = useState(false);

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 50%, #134e4a 100%)',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#0ea5e9',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (showAdmin && currentUser.isAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  return (
    <VacationProvider>
      <MainApp
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAdminPanel={() => setShowAdmin(true)}
        onLogout={logout}
      />
    </VacationProvider>
  );
}

function MainApp({ activeTab, setActiveTab, onAdminPanel, onLogout }) {
  const { currentVacation, loading } = useVacation();
  const showShared = currentVacation?.settings?.sharedMode;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f0f9ff',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#0ea5e9',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  // If shared tab is selected but shared mode is off, switch to overview
  if (activeTab === 'shared' && !showShared) {
    setActiveTab('overview');
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview key="overview" />;
      case 'expenses':
        return <Expenses key="expenses" />;
      case 'vacations':
        return <Vacations key="vacations" />;
      case 'shared':
        return showShared ? <SharedVacation key="shared" /> : <Overview key="overview" />;
      case 'settings':
        return <Settings key="settings" onAdminPanel={onAdminPanel} onLogout={onLogout} />;
      default:
        return <Overview key="overview" />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f9ff',
      paddingBottom: '80px',
    }}>
      <Header vacationName={currentVacation?.name} />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showShared={showShared}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
