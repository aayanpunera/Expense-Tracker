import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
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

export default function EditTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionDate, setTransactionDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTransaction() {
      try {
        const res = await api.transactions.getById(id);
        if (res.success && res.transaction) {
          const t = res.transaction;
          setTitle(t.title);
          setAmount(t.amount.toString());
          setKind(t.kind);
          setCategory(t.category);
          setPaymentMethod(t.payment_method);
          setTransactionDate(t.transaction_date);
          setNote(t.note || '');
        } else {
          addToast('Transaction not found in database.', 'error');
          navigate('/transactions');
        }
      } catch (err) {
        addToast(err.message || 'Failed to load transaction', 'error');
        navigate('/transactions');
      } finally {
        setLoading(false);
      }
    }
    loadTransaction();
  }, [id, navigate, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || parseFloat(amount) <= 0) {
      addToast('Please enter a description and valid amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.transactions.update(id, {
        title: title.trim(),
        amount: parseFloat(amount),
        kind,
        category,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        note: note.trim(),
      });

      addToast('Transaction updated in database successfully!', 'success');
      navigate('/transactions');
    } catch (err) {
      addToast(err.message || 'Failed to update transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete '${title}'?`)) return;
    try {
      await api.transactions.delete(id);
      addToast('Transaction deleted from database.', 'info');
      navigate('/transactions');
    } catch (err) {
      addToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Loading record from database...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">UPDATE ENTRY</p>
          <h1>Edit Transaction</h1>
          <p className="subtitle">Modify financial details saved in your database.</p>
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
            <label className="form-label">Description / Title</label>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
              <Trash2 size={14} /> Delete Entry
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/transactions" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Check size={16} />
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
