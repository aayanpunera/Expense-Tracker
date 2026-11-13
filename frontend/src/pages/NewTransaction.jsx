import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
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

export default function NewTransaction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [kind, setKind] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddPreset = (val) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || parseFloat(amount) <= 0) {
      addToast('Please enter a description and valid amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.transactions.create({
        title: title.trim(),
        amount: parseFloat(amount),
        kind,
        category,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        note: note.trim(),
      });

      addToast(`${kind === 'expense' ? 'Expense' : 'Income'} recorded in database!`, 'success');
      navigate('/transactions');
    } catch (err) {
      addToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">NEW ENTRY</p>
          <h1>Log New Transaction</h1>
          <p className="subtitle">Insert an expenditure or income deposit directly into your database ledger.</p>
        </div>
        <Link to="/transactions" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back to Ledger
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="stack-form">
          {/* Type Toggle Pills */}
          <div className="type-toggle-pills">
            <button
              type="button"
              className={kind === 'expense' ? 'active-expense' : ''}
              onClick={() => setKind('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={kind === 'income' ? 'active-income' : ''}
              onClick={() => setKind('income')}
            >
              Income
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              Description / Title
              <span className="hint">What was this transaction for?</span>
            </label>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Supermarket grocery run, Monthly salary, Uber ride"
              required
              autoFocus
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Amount ({currency})</label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="input-field"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: 18 }}>
            <small style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              Add quick amount:
            </small>
            <div className="quick-log-presets" style={{ marginTop: 0 }}>
              {[100, 200, 500, 1000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="preset-chip"
                  onClick={() => handleAddPreset(val)}
                >
                  +{currency}{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="select-field"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Notes & Tags <span className="hint">(optional)</span>
            </label>
            <input
              className="input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add extra details, tags or reminders"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
            <Link to="/transactions" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Check size={16} />
              {submitting ? 'Saving to Database...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
