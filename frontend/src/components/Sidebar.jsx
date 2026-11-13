import React from 'react';
import { NavLink, Link } from 'react-router-dom';
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

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/budgets', label: 'Monthly Budgets', icon: PieChart },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    { to: '/recurring', label: 'Recurring Bills', icon: Repeat },
    { to: '/reports', label: 'Insights & Charts', icon: BarChart3 },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <Link to="/" className="brand-badge" onClick={() => setIsOpen(false)}>
        <div className="brand-logo">₹</div>
        <div className="brand-text">
          <h2>SpendWise</h2>
          <span>Expense Tracker</span>
        </div>
      </Link>

      <div className="nav-group-title">Main Menu</div>
      <ul className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="nav-item">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AP'}</div>
          <div className="user-meta">
            <strong>{user?.name || 'User'}</strong>
            <small>{user?.email || ''}</small>
          </div>
        </div>
        <div className="sidebar-actions">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            title="Settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Settings size={14} />
            Settings
          </NavLink>
          <button onClick={logout} title="Log Out">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
