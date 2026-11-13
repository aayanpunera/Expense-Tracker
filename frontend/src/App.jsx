import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import QuickAddModal from './components/QuickAddModal';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Recurring from './pages/Recurring';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('expense');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global 'N' keyboard shortcut for Quick Add
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setQuickAddType('expense');
        setQuickAddOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-app)', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Loading SpendWise...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  const handleOpenQuickAdd = (type = 'expense') => {
    setQuickAddType(type);
    setQuickAddOpen(true);
  };

  const handleTransactionAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Container */}
      <div className="app-container">
        <Topbar
          currentPage={currentPage}
          onOpenQuickAdd={handleOpenQuickAdd}
          toggleMobileMenu={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="main-wrapper">
          {currentPage === 'dashboard' && (
            <Dashboard
              key={refreshTrigger}
              onOpenQuickAdd={handleOpenQuickAdd}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage === 'transactions' && (
            <Transactions
              key={refreshTrigger}
              onOpenQuickAdd={handleOpenQuickAdd}
            />
          )}
          {currentPage === 'budgets' && (
            <Budgets key={refreshTrigger} />
          )}
          {currentPage === 'goals' && (
            <Goals key={refreshTrigger} />
          )}
          {currentPage === 'recurring' && (
            <Recurring key={refreshTrigger} />
          )}
          {currentPage === 'reports' && (
            <Reports key={refreshTrigger} />
          )}
          {currentPage === 'settings' && (
            <Settings />
          )}
        </main>
      </div>

      {/* Global Quick-Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        defaultType={quickAddType}
        onTransactionAdded={handleTransactionAdded}
      />
    </div>
  );
}
