import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Repeat,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'budgets', label: 'Monthly Budgets', icon: PieChart },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'recurring', label: 'Recurring Bills', icon: Repeat },
    { id: 'reports', label: 'Insights & Charts', icon: BarChart3 },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand-badge" onClick={() => setCurrentPage('dashboard')}>
        <div className="brand-logo">₹</div>
        <div className="brand-text">
          <h2>SpendWise</h2>
          <span>Expense Tracker</span>
        </div>
      </div>

      <div className="nav-group-title">Main Menu</div>
      <ul className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <li key={item.id} className="nav-item">
              <button
                className={isActive ? 'active' : ''}
                onClick={() => {
                  setCurrentPage(item.id);
                  setIsOpen(false);
                }}
              >
                <Icon size={18} opacity={isActive ? 1 : 0.8} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AP'}</div>
          <div className="user-meta">
            <strong>{user?.name || 'Aayan Punera'}</strong>
            <small>{user?.email || 'aayanpunera108@gmail.com'}</small>
          </div>
        </div>
        <div className="sidebar-actions">
          <button
            onClick={() => {
              setCurrentPage('settings');
              setIsOpen(false);
            }}
            title="Settings"
          >
            <Settings size={14} />
            Settings
          </button>
          <button onClick={logout} title="Log Out">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
