import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Dashboard({ onOpenQuickAdd, onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Express inserter local state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState('Food & Dining');
  const [quickMethod, setQuickMethod] = useState('UPI');
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.dashboard.get();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleQuickAddPreset = (val) => {
    const current = parseFloat(quickAmount) || 0;
    setQuickAmount((current + val).toFixed(2));
  };

  const handleExpressSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || parseFloat(quickAmount) <= 0) {
      addToast('Please enter what you bought and a positive amount.', 'error');
      return;
    }

    setSubmittingQuick(true);
    try {
      await api.transactions.create({
        title: quickTitle.trim(),
        amount: parseFloat(quickAmount),
        kind: 'expense',
        category: quickCategory,
        payment_method: quickMethod,
        transaction_date: new Date().toISOString().slice(0, 10),
      });

      addToast('Expense logged successfully!', 'success');
      setQuickTitle('');
      setQuickAmount('');
      fetchDashboard();
    } catch (err) {
      addToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setSubmittingQuick(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Loading financial overview...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recent = data?.recent_transactions || [];
  const budgets = data?.budgets || [];
  const goals = data?.goals || [];
  const recurring = data?.upcoming_recurring || [];
  const categories = data?.categories || ['Food & Dining', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Salary', 'Other'];
  const methods = data?.payment_methods || ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer'];

  return (
    <div>
      {/* Welcome & Fast Action Header */}
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Financial Command Center</p>
          <h1>Welcome back, {user?.name || 'Aayan'}</h1>
          <p className="subtitle">Here is what is happening with your money this month.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenQuickAdd('income')}>
            <ArrowUpRight size={15} color="var(--income)" />
            + Add Income
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenQuickAdd('expense')}>
            <Plus size={15} strokeWidth={2.5} />
            + Add Expense
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Grid */}
      <div className="stat-grid">
        {/* Net Balance */}
        <div className="stat-card featured">
          <div className="stat-top">
            <span className="stat-label">Net Balance</span>
            <div className="stat-icon">{currency}</div>
          </div>
          <div className="stat-value">{currency}{(metrics.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-meta">
            <span>All-time balance (Income − Expenses)</span>
          </div>
        </div>

        {/* Month Expenses */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Month Expenses</span>
            <div className="stat-icon" style={{ background: 'var(--expense-subtle)', color: 'var(--expense)' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--expense)' }}>
            {currency}{(metrics.month_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">
            <span className="stat-pill badge-expense">Avg {currency}{(metrics.avg_daily_spend || 0).toFixed(0)}/day</span>
            <span>this month</span>
          </div>
        </div>

        {/* Month Income */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Month Income</span>
            <div className="stat-icon" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--income)' }}>
            {currency}{(metrics.month_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">
            <span className="stat-pill badge-income">+{currency}{(metrics.month_net || 0).toFixed(0)} net</span>
            <span>retained</span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Savings Rate</span>
            <div className="stat-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="stat-value">{metrics.savings_rate || 0}%</div>
          <div className="stat-meta">
            {metrics.top_category ? (
              <span>Top: <b>{metrics.top_category.category}</b> ({currency}{Number(metrics.top_category.total).toFixed(0)})</span>
            ) : (
              <span>Track savings vs spending</span>
            )}
          </div>
        </div>
      </div>

      {/* Express Expense Inserter (Directly on Dashboard) */}
      <div className="quick-log-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Express Expense Inserter
            </strong>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quickly log a spend right here without leaving your overview</p>
          </div>
          <span className="badge badge-neutral">Quick Log</span>
        </div>

        <form onSubmit={handleExpressSubmit} className="quick-log-form">
          <input
            className="input-field"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="What did you buy? (e.g. Coffee, Lunch)"
            required
          />

          <input
            className="input-field"
            type="number"
            step="0.01"
            min="0.01"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            required
          />

          <select
            className="select-field"
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="select-field"
            value={quickMethod}
            onChange={(e) => setQuickMethod(e.target.value)}
          >
            {methods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button type="submit" className="btn btn-primary" disabled={submittingQuick} style={{ height: 42 }}>
            {submittingQuick ? 'Logging...' : '+ Log Expense'}
          </button>
        </form>

        <div className="quick-log-presets">
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Quick Add Amount:</span>
          {[50, 100, 200, 500, 1000].map((val) => (
            <button
              key={val}
              type="button"
              className="preset-chip"
              onClick={() => handleQuickAddPreset(val)}
            >
              +{currency}{val}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="dashboard-grid">
        {/* Left Column: Recent Activity */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-box">
              <h2>Recent Transactions</h2>
              <p>Latest expenditures and deposits</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('transactions')}>
              View All →
            </button>
          </div>

          {recent.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="tx-title-meta">
                          <strong>{t.title}</strong>
                          <small>{t.transaction_date}{t.note ? ` · ${t.note}` : ''}</small>
                        </div>
                      </td>
                      <td>
                        <span className="cat-badge">{t.category}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{t.payment_method}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={t.kind === 'income' ? 'amount-positive' : 'amount-negative'}>
                          {t.kind === 'income' ? '+' : '−'}{currency}{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                No transactions recorded yet
              </h3>
              <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto 18px' }}>
                Start inserting your daily expenses above or load demo data in Settings to preview your financial insights.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => onOpenQuickAdd('expense')}>
                + Log First Expense
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Budgets & Goals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Monthly Budgets Progress */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-box">
                <h2>Budget Health</h2>
                <p>Current month spending caps</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('budgets')}>
                Manage
              </button>
            </div>

            {budgets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {budgets.map((b) => {
                  const pct = Math.round((b.spent / b.monthly_limit) * 100);
                  const cappedPct = Math.min(pct, 100);
                  return (
                    <div key={b.id} className="budget-card-item">
                      <div className="budget-meta-row">
                        <div>
                          <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{b.category}</strong>
                          <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11.5 }}>
                            {currency}{Number(b.spent).toLocaleString('en-IN')} of {currency}{Number(b.monthly_limit).toLocaleString('en-IN')}
                          </small>
                        </div>
                        <div>
                          {pct >= 100 ? (
                            <span className="badge badge-expense" style={{ fontSize: 11 }}>Exceeded ({pct}%)</span>
                          ) : pct >= 80 ? (
                            <span className="badge badge-warning" style={{ fontSize: 11 }}>{pct}%</span>
                          ) : (
                            <span className="badge badge-income" style={{ fontSize: 11 }}>{pct}%</span>
                          )}
                        </div>
                      </div>
                      <div className="progress-track">
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
              <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 13, marginBottom: 14 }}>No category limits configured for this month.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('budgets')}>
                  + Set Monthly Budget
                </button>
              </div>
            )}
          </div>

          {/* Active Goals Preview */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-box">
                <h2>Savings Goals</h2>
                <p>Target milestones</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('goals')}>
                View All
              </button>
            </div>

            {goals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {goals.map((g) => {
                  const pct = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
                  return (
                    <div
                      key={g.id}
                      style={{
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 14,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{g.name}</strong>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{pct}%</span>
                      </div>
                      <div className="progress-track" style={{ marginBottom: 8, height: 7 }}>
                        <div className="progress-fill progress-safe" style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
                        <span>{currency}{Number(g.current_amount).toLocaleString('en-IN')} saved</span>
                        <span>Target: {currency}{Number(g.target_amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 13, marginBottom: 12 }}>Create savings goals to track future funds.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('goals')}>
                  + Create Goal
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Recurring */}
          {recurring.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 14 }}>
                <div className="card-title-box">
                  <h2>Upcoming Due Dates</h2>
                  <p>Next 14 days schedules</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('recurring')}>
                  All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recurring.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--text-main)', display: 'block' }}>{item.title}</strong>
                      <small style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Due: {item.next_due_date} ({item.frequency})
                      </small>
                    </div>
                    <strong style={{ fontSize: 13, color: 'var(--expense)' }}>
                      {currency}{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
