import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  FileText,
  Plus,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
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

export default function Transactions({ onOpenQuickAdd }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ total_income: 0, total_expense: 0, net: 0, count: 0 });

  // Filter states
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [category, setCategory] = useState('');
  const [method, setMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('date_desc');

  // Edit modal state
  const [editingTx, setEditingTx] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editKind, setEditKind] = useState('expense');
  const [editCategory, setEditCategory] = useState('Food & Dining');
  const [editMethod, setEditMethod] = useState('UPI');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.list({
        q,
        kind,
        category,
        method,
        from_date: fromDate,
        to_date: toDate,
        sort,
      });
      if (res.success) {
        setTransactions(res.transactions);
        setStats({
          total_income: res.total_income,
          total_expense: res.total_expense,
          net: res.net,
          count: res.count,
        });
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, kind, category, method, fromDate, toDate, sort, addToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete '${title}'?`)) return;
    try {
      await api.transactions.delete(id);
      addToast('Transaction deleted.', 'info');
      fetchTransactions();
    } catch (err) {
      addToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  const openEditModal = (t) => {
    setEditingTx(t);
    setEditTitle(t.title);
    setEditAmount(t.amount);
    setEditKind(t.kind);
    setEditCategory(t.category);
    setEditMethod(t.payment_method);
    setEditDate(t.transaction_date);
    setEditNote(t.note || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || parseFloat(editAmount) <= 0) {
      addToast('Title and positive amount required.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      await api.transactions.update(editingTx.id, {
        title: editTitle.trim(),
        amount: parseFloat(editAmount),
        kind: editKind,
        category: editCategory,
        payment_method: editMethod,
        transaction_date: editDate,
        note: editNote.trim(),
      });
      addToast('Transaction updated successfully!', 'success');
      setEditingTx(null);
      fetchTransactions();
    } catch (err) {
      addToast(err.message || 'Failed to update transaction', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetFilters = () => {
    setQ('');
    setKind('');
    setCategory('');
    setMethod('');
    setFromDate('');
    setToDate('');
    setSort('date_desc');
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Financial Record Book</p>
          <h1>Transactions Ledger</h1>
          <p className="subtitle">Search, filter, manage, and export your entire financial history.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={api.exports.getCsvUrl({ q, kind, category, method, from_date: fromDate, to_date: toDate, sort })}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            title="Download CSV spreadsheet"
          >
            <Download size={14} />
            CSV Export
          </a>
          <a
            href={api.exports.getPdfUrl()}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            title="Download PDF statement"
          >
            <FileText size={14} />
            PDF Statement
          </a>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenQuickAdd('expense')}>
            <Plus size={15} strokeWidth={2.5} />
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Pills Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Showing <strong>{stats.count}</strong> transactions
        </span>
        <span className="badge badge-income" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Income: +{currency}{stats.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <span className="badge badge-expense" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Expenses: −{currency}{stats.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <span className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Net: <strong style={{ color: stats.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {currency}{stats.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
        </span>
      </div>

      {/* Advanced Filter Card */}
      <div className="filter-bar-card">
        <div className="filter-grid">
          <div className="search-wrap">
            <input
              className="input-field"
              placeholder="Search title or note..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <select className="select-field" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          <div className="filter-item">
            <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <select className="select-field" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <input
              className="input-field"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="From Date"
            />
          </div>

          <div className="filter-item">
            <input
              className="input-field"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="To Date"
            />
          </div>

          <div className="filter-item">
            <select className="select-field" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading transactions...
          </div>
        ) : transactions.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description & Notes</th>
                  <th>Category</th>
                  <th>Payment</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>
                      {t.transaction_date}
                    </td>
                    <td>
                      <div className="tx-title-meta">
                        <strong>{t.title}</strong>
                        {t.note && <small>{t.note}</small>}
                      </div>
                    </td>
                    <td>
                      <span className="cat-badge">{t.category}</span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{t.payment_method}</span>
                    </td>
                    <td>
                      <span className={`badge ${t.kind === 'income' ? 'badge-income' : 'badge-expense'}`}>
                        {t.kind.charAt(0).toUpperCase() + t.kind.slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong className={t.kind === 'income' ? 'amount-positive' : 'amount-negative'} style={{ fontSize: 15 }}>
                        {t.kind === 'income' ? '+' : '−'}{currency}{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(t)}
                          title="Edit transaction"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(t.id, t.title)}
                          title="Delete transaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '54px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 38, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
              No transactions match your search
            </h3>
            <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto 18px' }}>
              Try clearing filters or adjusting your date range to see more entries.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditingTx(null)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: 6 }}>Update Record</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>Edit Transaction</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setEditingTx(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="type-toggle-pills">
                <button
                  type="button"
                  className={editKind === 'expense' ? 'active-expense' : ''}
                  onClick={() => setEditKind('expense')}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={editKind === 'income' ? 'active-income' : ''}
                  onClick={() => setEditKind('income')}
                >
                  Income
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Title</label>
                <input
                  className="input-field"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    className="input-field"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="select-field"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
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
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  className="input-field"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTx(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
