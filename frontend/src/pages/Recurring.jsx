import React, { useState, useEffect, useCallback } from 'react';
import { Repeat, Calendar, Play, Pause, Trash2 } from 'lucide-react';
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

const PAYMENT_METHODS = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'];

export default function Recurring() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [monthlySum, setMonthlySum] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('expense');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Bills');
  const [method, setMethod] = useState('UPI');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecurring = useCallback(async () => {
    try {
      const res = await api.recurring.list();
      if (res.success) {
        setItems(res.items);
        setMonthlySum(res.monthly_recurring_sum);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load recurring items', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || parseFloat(amount) <= 0) {
      addToast('Title and positive amount required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.recurring.create({
        title: title.trim(),
        amount: parseFloat(amount),
        kind,
        frequency,
        next_due_date: nextDueDate,
        category,
        payment_method: method,
        note: note.trim(),
      });

      addToast(`Recurring schedule for '${title}' created!`, 'success');
      setTitle('');
      setAmount('');
      setNote('');
      fetchRecurring();
    } catch (err) {
      addToast(err.message || 'Failed to create recurring schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await api.recurring.toggle(id);
      addToast(`Schedule ${currentActive ? 'paused' : 'resumed'}.`, 'info');
      fetchRecurring();
    } catch (err) {
      addToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id, scheduleTitle) => {
    if (!window.confirm(`Delete recurring schedule '${scheduleTitle}'?`)) return;
    try {
      await api.recurring.delete(id);
      addToast('Recurring schedule removed.', 'info');
      fetchRecurring();
    } catch (err) {
      addToast(err.message || 'Failed to delete schedule', 'error');
    }
  };

  const activeCount = items.filter((i) => i.active).length;

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Automate Routine Finances</p>
          <h1>Recurring Bills & Subscriptions</h1>
          <p className="subtitle">Track rent, EMIs, software subscriptions, insurance, and repeat deposits automatically.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Estimated Monthly Commitments</span>
            <div className="stat-icon" style={{ background: 'var(--expense-subtle)', color: 'var(--expense)' }}>
              <Repeat size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--expense)' }}>
            {currency}{monthlySum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">Monthly recurring expense obligations</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Active Schedules</span>
            <div className="stat-icon"><Calendar size={18} /></div>
          </div>
          <div className="stat-value">
            {activeCount} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>/ {items.length} total</span>
          </div>
          <div className="stat-meta">Automatically recorded when due date arrives</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Create Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Add Recurring Schedule</h2>
              <p>Set up automatic expense or income</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="stack-form">
            <div className="form-group">
              <label className="form-label">Title / Description</label>
              <input
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Netflix, Gym, Apartment Rent, SIP"
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Amount ({currency})</label>
                <input
                  className="input-field"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Next Due Date</label>
                <input
                  className="input-field"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="select-field" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select className="select-field" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="select-field" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Note <span className="hint">(optional)</span></label>
              <input
                className="input-field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Renews every 5th of the month"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
              {submitting ? 'Creating...' : '+ Create Schedule'}
            </button>
          </form>
        </div>

        {/* Schedules List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-box">
              <h2>Your Recurring Entries</h2>
              <p>Active and paused repeating schedules</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
              Loading schedules...
            </div>
          ) : items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((i) => (
                <div
                  key={i.id}
                  style={{
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: i.active ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>{i.title}</strong>
                      <span className={`badge ${i.active ? 'badge-income' : 'badge-neutral'}`} style={{ fontSize: 10.5 }}>
                        {i.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Frequency: <b>{i.frequency.charAt(0).toUpperCase() + i.frequency.slice(1)}</b></span>
                      <span>Next due: <b>{i.next_due_date}</b></span>
                      <span className="cat-badge" style={{ padding: '2px 8px', fontSize: 11 }}>{i.category}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <strong className={i.kind === 'income' ? 'amount-positive' : 'amount-negative'} style={{ fontSize: 16 }}>
                      {i.kind === 'income' ? '+' : '−'}{currency}{Number(i.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggle(i.id, i.active)}
                        title={i.active ? 'Pause schedule' : 'Resume schedule'}
                      >
                        {i.active ? <Pause size={12} /> : <Play size={12} />}
                        {i.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(i.id, i.title)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>↻</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                No recurring items configured
              </h3>
              <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
                Add Netflix, SIP, rent, or utilities to automate repetitive transaction logging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
