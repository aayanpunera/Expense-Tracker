import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingDown, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Food & Dining',
  'Travel',
  'Rent',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Education',
  'Salary',
  'Freelance',
  'Investment',
  'Other',
];

export default function Budgets() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Form state
  const [category, setCategory] = useState('Food & Dining');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await api.budgets.list();
      if (res.success) {
        setBudgets(res.budgets);
        setTotalBudgeted(res.total_budgeted);
        setTotalSpent(res.total_spent);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || parseFloat(monthlyLimit) <= 0) {
      addToast('Please provide a category and positive budget limit.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.budgets.save(category, parseFloat(monthlyLimit));
      addToast(`Budget for '${category}' updated!`, 'success');
      setMonthlyLimit('');
      fetchBudgets();
    } catch (err) {
      addToast(err.message || 'Failed to save budget', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, cat) => {
    if (!window.confirm(`Delete budget for '${cat}'?`)) return;
    try {
      await api.budgets.delete(id);
      addToast(`Budget for '${cat}' removed.`, 'info');
      fetchBudgets();
    } catch (err) {
      addToast(err.message || 'Failed to delete budget', 'error');
    }
  };

  const remainingTotal = totalBudgeted - totalSpent;

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Smart Spending Limits</p>
          <h1>Monthly Category Budgets</h1>
          <p className="subtitle">Set spending limits for each category to maintain financial discipline.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Allocated</span>
            <div className="stat-icon"><Target size={18} /></div>
          </div>
          <div className="stat-value">{currency}{totalBudgeted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="stat-meta">Across all category limits</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Spent in Budgets</span>
            <div className="stat-icon" style={{ background: 'var(--expense-subtle)', color: 'var(--expense)' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--expense)' }}>
            {currency}{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">Spent in budgeted categories this month</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Remaining Safe Spend</span>
            <div className="stat-icon" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: remainingTotal >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {currency}{remainingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">{remainingTotal >= 0 ? 'Buffer remaining' : 'Over total budget limit'}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Set Budget Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Set Category Budget</h2>
              <p>Define or adjust monthly ceiling</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="stack-form">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Limit ({currency})</label>
              <input
                className="input-field"
                type="number"
                min="1"
                step="0.01"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="e.g. 8000"
                required
              />
            </div>

            <div className="quick-log-presets" style={{ marginBottom: 18 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)' }}>Suggestions:</span>
              {[2000, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="preset-chip"
                  onClick={() => setMonthlyLimit(val.toString())}
                >
                  {currency}{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Saving...' : 'Save Budget Limit'}
            </button>
          </form>
        </div>

        {/* Budgets List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-box">
              <h2>Active Category Budgets</h2>
              <p>Live tracking for current month</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
              Loading budgets...
            </div>
          ) : budgets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {budgets.map((b) => {
                const pct = Math.round((b.spent / b.monthly_limit) * 100);
                const remaining = b.monthly_limit - b.spent;
                const cappedPct = Math.min(pct, 100);

                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: 18,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span className="cat-badge" style={{ marginBottom: 6 }}>{b.category}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <strong style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                            {currency}{Number(b.spent).toLocaleString('en-IN')}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            spent of {currency}{Number(b.monthly_limit).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {pct >= 100 ? (
                          <span className="badge badge-expense" style={{ fontSize: 12, marginBottom: 4 }}>
                            Exceeded by {currency}{Number(b.spent - b.monthly_limit).toLocaleString('en-IN')}
                          </span>
                        ) : pct >= 80 ? (
                          <span className="badge badge-warning" style={{ fontSize: 12, marginBottom: 4 }}>
                            {pct}% consumed
                          </span>
                        ) : (
                          <span className="badge badge-income" style={{ fontSize: 12, marginBottom: 4 }}>
                            {currency}{Number(remaining).toLocaleString('en-IN')} left
                          </span>
                        )}

                        <div>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(b.id, b.category)}
                            style={{ color: 'var(--expense)', fontSize: 11.5, padding: '2px 6px' }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="progress-track" style={{ height: 10 }}>
                      <div
                        className={`progress-fill ${pct >= 100 ? 'progress-danger' : pct >= 80 ? 'progress-warning' : 'progress-safe'}`}
                        style={{ width: `${cappedPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                No budgets configured
              </h3>
              <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
                Set spending limits for Food, Travel, Shopping or Utilities using the form on the left.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
