import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

export default function QuickAddModal({ isOpen, onClose, defaultType = 'expense', onTransactionAdded }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [kind, setKind] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setKind(defaultType);
  }, [defaultType]);

  // Global 'n' key shortcut to open modal
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        // Trigger modal opening handled in parent or here
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

      addToast(`${kind === 'expense' ? 'Expense' : 'Income'} recorded successfully!`, 'success');
      setTitle('');
      setAmount('');
      setNote('');
      onClose();
      if (onTransactionAdded) onTransactionAdded();
    } catch (err) {
      addToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <span className="badge badge-neutral" style={{ marginBottom: 6 }}>Instant Log</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>New Transaction</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label className="form-label">Description / Title</label>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grocery store, Uber ride, Freelance payment"
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

          {/* Quick Amount Presets */}
          <div style={{ marginBottom: 16 }}>
            <small style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              Quick Presets:
            </small>
            <div className="quick-log-presets" style={{ marginTop: 0 }}>
              {[100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="preset-chip"
                  onClick={() => handleAddPreset(val)}
                >
                  +{currency}{val}
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
            <label className="form-label">Note <span className="hint">(optional)</span></label>
            <input
              className="input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add extra details, tags or reminders"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
