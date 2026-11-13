import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  FileText,
  Plus,
  Trash2,
  Edit3,
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

export default function Transactions() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const outletContext = useOutletContext();
  const onOpenQuickAdd = outletContext?.onOpenQuickAdd || (() => {});
  const refreshKey = outletContext?.refreshKey || 0;

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
      addToast(err.message || 'Failed to fetch transactions from database', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, kind, category, method, fromDate, toDate, sort, addToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete '${title}' from the database?`)) return;
    try {
      await api.transactions.delete(id);
      addToast('Transaction deleted from database.', 'info');
      fetchTransactions();
    } catch (err) {
      addToast(err.message || 'Failed to delete transaction', 'error');
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
          <p className="eyebrow">Database Ledger</p>
          <h1>Transactions Ledger</h1>
          <p className="subtitle">Real-time database queries with live search, filters, and downloads.</p>
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
          <Link to="/transactions/new" className="btn btn-primary btn-sm">
            <Plus size={15} strokeWidth={2.5} />
            + Add Transaction Page
          </Link>
        </div>
      </div>

      {/* Summary Pills Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Showing <strong>{stats.count}</strong> transactions in database
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
              placeholder="Search title or note in database..."
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
            Loading transactions from database...
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
                        <Link
                          to={`/transactions/${t.id}/edit`}
                          className="btn btn-secondary btn-sm"
                          title="Edit transaction page"
                        >
                          <Edit3 size={13} />
                          Edit
                        </Link>
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
              Try clearing filters or inserting a new transaction into your database.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Clear All Filters
              </button>
              <Link to="/transactions/new" className="btn btn-primary btn-sm">
                + Insert New Expense
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
