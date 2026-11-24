import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Repeat,
  BarChart3,
  Users,
  Sparkles,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/budgets', label: 'Monthly budgets', icon: PieChart, hasBadge: true },
    { to: '/goals', label: 'Savings Goals', icon: Target },
    { to: '/recurring', label: 'Recurring bills', icon: Repeat },
    { to: '/groups', label: 'Split Bills & Groups', icon: Users },
    { to: '/advisor', label: 'AI Financial Advisor', icon: Sparkles },
    { to: '/reports', label: 'Insights & Reports', icon: BarChart3 },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <Link to="/" className="brand-badge" onClick={() => setIsOpen(false)}>
        <div className="brand-logo">
          <Wallet size={19} color="#0b101b" strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <h2>SpendWise</h2>
          <span>EXPENSE TRACKER</span>
        </div>
      </Link>

      <div className="nav-group-title">MAIN MENU</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>
                {item.hasBadge && (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <span style={{ width: 14, height: 4, borderRadius: 2, background: '#00d29d' }} />
                    <span style={{ width: 8, height: 4, borderRadius: 2, background: 'rgba(0, 210, 157, 0.35)' }} />
                  </div>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AP'}</div>
          <div className="user-meta">
            <strong>{user?.name || 'Aayan Profile'}</strong>
            <small>{user?.email || 'Connected'}</small>
          </div>
        </div>
        <div className="sidebar-actions">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            title="Settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Settings size={13} />
            <span>Settings</span>
          </NavLink>
          <button onClick={logout} title="Log Out">
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
