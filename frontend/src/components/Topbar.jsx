import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Plus, Sun, Moon, Bell, Camera, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight, X, Search, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';

export default function Topbar({ onOpenQuickAdd, onOpenScanReceipt, toggleMobileMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('spendwise_dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef(null);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time notifications from backend
  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.get();
      if (res.success && Array.isArray(res.alerts)) {
        setNotifications(res.alerts);
        const unread = res.alerts.filter((a) => !dismissedIds.includes(a.id));
        setUnreadCount(unread.length);
      }
    } catch (err) {
      // Background poll failure should stay quiet
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [dismissedIds]);

  const handleDismissAlert = (id, e) => {
    e.stopPropagation();
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem('spendwise_dismissed_alerts', JSON.stringify(next));
    setUnreadCount(notifications.filter((a) => !next.includes(a.id)).length);
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map((a) => a.id);
    setDismissedIds(allIds);
    localStorage.setItem('spendwise_dismissed_alerts', JSON.stringify(allIds));
    setUnreadCount(0);
  };

  const getPageTitle = (pathname) => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/transactions') return 'Transactions Ledger';
    if (pathname === '/transactions/new') return 'New Transaction';
    if (pathname.startsWith('/transactions/') && pathname.endsWith('/edit')) return 'Edit Transaction';
    if (pathname === '/budgets') return 'Monthly Budgets';
    if (pathname === '/goals') return 'Savings Goals';
    if (pathname === '/recurring') return 'Recurring Bills';
    if (pathname === '/reports') return 'Insights & Analytics';
    if (pathname === '/groups') return 'Split Bills & Groups';
    if (pathname.startsWith('/groups/')) return 'Group Expenses & Settlement';
    if (pathname === '/advisor') return 'AI Financial Advisor & Insights';
    if (pathname === '/settings') return 'Settings & Workspace';
    return 'SpendWise';
  };

  const monthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'danger':
        return <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
      case 'warning':
        return <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />;
      case 'success':
        return <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />;
      default:
        return <Info size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />;
    }
  };

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
        {/* Search shortcut button */}
        <button
          className="topbar-round-btn"
          onClick={() => navigate('/transactions')}
          title="Search transactions"
        >
          <Search size={16} />
        </button>

        {/* Smart Notifications Bell */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="topbar-round-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            title="Smart Budget & Bill Alerts"
            style={{ position: 'relative' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  width: 15,
                  height: 15,
                  borderRadius: 99,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 0 0 2px var(--bg-card)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 360,
                maxWidth: '90vw',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'slideUp 0.15s ease-out',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-card-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={15} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>Alerts & Reminders</strong>
                  {unreadCount > 0 && (
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--success)', marginBottom: 8, opacity: 0.8 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>All caught up!</p>
                    <small style={{ fontSize: 11.5 }}>No active budget warnings or overdue bills.</small>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const isDismissed = dismissedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setDropdownOpen(false);
                          if (item.link) navigate(item.link);
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          background: isDismissed ? 'transparent' : 'rgba(79, 70, 229, 0.04)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-secondary)')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isDismissed ? 'transparent' : 'rgba(79, 70, 229, 0.04)')
                        }
                      >
                        {getSeverityIcon(item.severity)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 12.5, color: 'var(--text-main)' }}>{item.title}</strong>
                            <button
                              onClick={(e) => handleDismissAlert(item.id, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: 2,
                              }}
                              title="Dismiss"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <p
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              margin: '3px 0 0',
                              lineHeight: 1.4,
                            }}
                          >
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div
                  style={{
                    padding: '8px 16px',
                    textAlign: 'center',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-card-secondary)',
                  }}
                >
                  <Link
                    to="/budgets"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View All Budget Meters <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Add Button */}
        <button
          className="btn btn-pill-dark btn-sm"
          onClick={() => onOpenQuickAdd('expense')}
          title="Press 'N' anytime to add an expense"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>+ Quick Add</span>
        </button>

        {/* Settings Button */}
        <button
          className="topbar-round-btn"
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Theme Toggle Button */}
        <button
          className="topbar-round-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
