import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Topbar({ onOpenQuickAdd, toggleMobileMenu }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = (pathname) => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/transactions') return 'Transactions Ledger';
    if (pathname === '/transactions/new') return 'New Transaction';
    if (pathname.startsWith('/transactions/') && pathname.endsWith('/edit')) return 'Edit Transaction';
    if (pathname === '/budgets') return 'Monthly Budgets';
    if (pathname === '/goals') return 'Savings Goals';
    if (pathname === '/recurring') return 'Recurring Bills';
    if (pathname === '/reports') return 'Insights & Analytics';
    if (pathname === '/settings') return 'Settings & Workspace';
    return 'SpendWise';
  };

  const monthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-trigger" onClick={toggleMobileMenu} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div className="page-title-box">
          <h1>{getPageTitle(location.pathname)}</h1>
          <p>{monthStr}</p>
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onOpenQuickAdd('expense')}
          title="Press 'N' anytime to add an expense"
        >
          <Plus size={16} strokeWidth={2.5} />
          + Quick Add
        </button>

        <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
