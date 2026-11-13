import React from 'react';
import { Menu, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Topbar({ currentPage, onOpenQuickAdd, toggleMobileMenu }) {
  const { theme, toggleTheme } = useTheme();

  const titleMap = {
    dashboard: 'Dashboard',
    transactions: 'Transactions Ledger',
    budgets: 'Monthly Budgets',
    goals: 'Savings Goals',
    recurring: 'Recurring Bills',
    reports: 'Insights & Analytics',
    settings: 'Settings & Workspace',
  };

  const monthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-trigger" onClick={toggleMobileMenu} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div className="page-title-box">
          <h1>{titleMap[currentPage] || 'Overview'}</h1>
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
