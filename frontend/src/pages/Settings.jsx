import React, { useState, useEffect } from 'react';
import { Download, FileText, Sparkles, Trash2, Check } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const CURRENCIES = [
  { symbol: '₹', name: 'INR - Indian Rupee' },
  { symbol: '$', name: 'USD - US Dollar' },
  { symbol: '€', name: 'EUR - Euro' },
  { symbol: '£', name: 'GBP - British Pound' },
  { symbol: 'A$', name: 'AUD - Australian Dollar' },
  { symbol: 'C$', name: 'CAD - Canadian Dollar' },
  { symbol: '¥', name: 'JPY - Japanese Yen' },
  { symbol: 'AED', name: 'AED - UAE Dirham' },
];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || '₹');
  const [selectedTheme, setSelectedTheme] = useState(theme || 'light');
  const [saving, setSaving] = useState(false);
  const [loadingSeed, setLoadingSeed] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCurrency(user.currency || '₹');
    }
  }, [user]);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.settings.update({
        name: name.trim(),
        currency,
        theme: selectedTheme,
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setTheme(selectedTheme);
        addToast('Preferences updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoadingSeed(true);
    try {
      await api.settings.seedDemo();
      addToast('Sample financial data pack loaded!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to seed demo data', 'error');
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL your transactions, budgets, and goals. Are you sure?')) {
      return;
    }
    try {
      await api.settings.clearData();
      addToast('All financial records have been cleared.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to clear data', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Preferences & Workspace</p>
          <h1>Settings & Data Management</h1>
          <p className="subtitle">Customize your currency, visual theme, and manage account backups.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Profile & Display */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-box">
              <h2>Profile & Display</h2>
              <p>Personalize how SpendWise looks and displays currency</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="stack-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="input-field"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 4 }}>
                Email cannot be modified.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Default Currency Symbol</label>
              <select
                className="select-field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Interface Appearance</label>
              <select
                className="select-field"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 10 }}>
              <Check size={16} />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>

        {/* Data Tools, Backups & Danger Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Backup */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-box">
                <h2>Data Export & Backup</h2>
                <p>Download your complete financial records</p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              Export all your transactions, budgets, goals, and recurring entries in JSON or CSV format.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={api.exports.getJsonUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Download size={14} />
                Download JSON Backup
              </a>
              <a
                href={api.exports.getCsvUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <FileText size={14} />
                Download CSV Ledger
              </a>
            </div>
          </div>

          {/* Demo Seeder */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-box">
                <h2>Demo / Sample Data</h2>
                <p>Quickly preview the app with realistic data</p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              Populate your account with realistic sample expenses, income, monthly budgets, and savings goals to immediately see the charts and dashboards in action.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSeedDemo}
              disabled={loadingSeed}
            >
              <Sparkles size={14} />
              {loadingSeed ? 'Loading Pack...' : '⚡ Load Sample Data Pack'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            <div className="card-header">
              <div className="card-title-box">
                <h2 style={{ color: 'var(--expense)' }}>Danger Zone</h2>
                <p>Reset or erase records</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Permanently delete all your transaction entries, budgets, and savings goals to start fresh.
            </p>
            <button className="btn btn-danger btn-sm" onClick={handleClearData}>
              <Trash2 size={14} />
              Clear All Financial Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
