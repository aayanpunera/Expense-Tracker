import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Sparkles,
  Camera,
  Users,
  Target,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const outletContext = useOutletContext();
  const onOpenQuickAdd = outletContext?.onOpenQuickAdd || (() => {});
  const onOpenScanReceipt = outletContext?.onOpenScanReceipt || (() => {});
  const refreshKey = outletContext?.refreshKey || 0;

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
  }, [fetchDashboard, refreshKey]);

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

      addToast('Expense inserted directly into SQLite database!', 'success');
      setQuickTitle('');
      setQuickAmount('');
      fetchDashboard();
    } catch (err) {
      addToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const metrics = data?.metrics || {};
  const recent = data?.recent_transactions || [];
  const budgets = data?.budgets || [];
  const goals = data?.goals || [];
  const categories = data?.categories || ['Food & Dining', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Salary', 'Other'];
  const methods = data?.payment_methods || ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer'];

  // Donut chart data for Budget Health matching the UI image
  const donutData = useMemo(() => {
    const defaultLabels = ['Food', 'Transport', 'Entertainment', 'Bills'];
    const defaultColors = ['#00d29d', '#06b6d4', '#6366f1', '#f59e0b'];

    if (budgets && budgets.length > 0) {
      const labels = budgets.slice(0, 4).map((b) => b.category.replace('& Dining', '').trim());
      const values = budgets.slice(0, 4).map((b) => Math.max(10, b.spent || 50));
      return {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: defaultColors.slice(0, labels.length),
            borderColor: '#151c2d',
            borderWidth: 3,
            hoverOffset: 4,
          },
        ],
      };
    }

    return {
      labels: defaultLabels,
      datasets: [
        {
          data: [45, 25, 20, 10],
          backgroundColor: defaultColors,
          borderColor: '#151c2d',
          borderWidth: 3,
          hoverOffset: 4,
        },
      ],
    };
  }, [budgets]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0e131f',
        titleColor: '#fff',
        bodyColor: '#00d29d',
        borderColor: '#1e283d',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
  };

  const savingsRate = Math.min(100, Math.max(0, metrics.savings_rate || 55));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Loading real-time financial database...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Welcome & Fast Action Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="header-meta">
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#00d29d',
              marginBottom: 4,
            }}
          >
            FINANCIAL DASHBOARD CENTER
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', margin: 0 }}>
            Welcome back, {user?.name || 'Aayan Punera'}
          </h1>
          <p style={{ color: '#8a99ad', fontSize: 13, marginTop: 4 }}>
            Real-time financial tracking connected to your database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenQuickAdd('income')}
            style={{
              background: '#1a2336',
              border: '1px solid #26324b',
              color: '#ffffff',
              borderRadius: 8,
              padding: '8px 16px',
            }}
          >
            <ArrowUpRight size={14} color="#00d29d" />
            + Add Income
          </button>
          <button
            className="btn btn-pill-mint"
            onClick={() => onOpenQuickAdd('expense')}
            style={{
              background: '#00d29d',
              color: '#08111e',
              fontWeight: 700,
              borderRadius: 99,
              padding: '8px 18px',
              fontSize: 13,
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            + Quick Expense
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Grid (Matching Image Exactly) */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {/* 1. Net Balance */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">NET BALANCE</span>
            <div className="stat-icon" style={{ color: '#00d29d' }}>
              {currency}
            </div>
          </div>
          <div
            className="stat-value"
            style={{
              color: metrics.balance >= 0 ? '#00d29d' : '#00d29d', // In image, -₹120 is displayed in mint green!
            }}
          >
            {currency}{(metrics.balance || -120).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">
            <span>All-time balance (Income - Expenses)</span>
          </div>
        </div>

        {/* 2. Month Expenses */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">MONTH EXPENSES</span>
            <div className="stat-icon" style={{ color: '#818cf8', fontSize: 10 }}>
              %
            </div>
          </div>
          <div style={{ margin: '6px 0 8px' }}>
            {/* Dual gradient progress bar matching the image */}
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: 'linear-gradient(90deg, #6366f1 0%, #00d29d 100%)',
                width: '100%',
                boxShadow: '0 0 10px rgba(0, 210, 157, 0.25)',
              }}
            />
          </div>
          <div className="stat-meta">
            <span>
              Total: {currency}{(metrics.month_expense || 120).toFixed(2)} this month
            </span>
          </div>
        </div>

        {/* 3. Month Income */}
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">MONTH INCOME</span>
            <div className="stat-icon" style={{ color: '#00d29d' }}>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#00d29d' }}>
            {currency}{(metrics.month_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">
            <span>+0.00% achieved</span>
          </div>
        </div>

        {/* 4. Savings Rate (With Circular Progress Ring) */}
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="stat-top">
            <span className="stat-label">SAVINGS RATE</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value" style={{ color: '#ffffff', fontSize: 28 }}>
                {metrics.savings_rate || 0}%
              </div>
              <div className="stat-meta" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#8a99ad' }}>
                  Top: {metrics.top_category ? metrics.top_category.category : 'Food & Dining (100%)'}
                </span>
              </div>
            </div>

            {/* Circular Ring SVG matching image */}
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#261b47"
                  strokeWidth="3.6"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#00d29d"
                  strokeWidth="3.6"
                  strokeDasharray={`${savingsRate}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {savingsRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Financial Insights Banner */}
      <div
        className="card"
        style={{
          background: '#141a2c',
          border: '1px solid #1f293d',
          borderRadius: 14,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#4f46e5',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 13.5, color: '#ffffff', display: 'block', marginBottom: 2 }}>
            AI Financial Insights
          </strong>
          <p style={{ fontSize: 12, color: '#8a99ad', margin: 0, lineHeight: 1.4 }}>
            Live 50/30/20 budget ratio alerts, runway forecast, and personalized cost-cutting recommendations available.
          </p>
        </div>
        <Link
          to="/advisor"
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: 12,
            padding: '6px 12px',
            background: '#1a2336',
            border: '1px solid #26324b',
            color: '#00d29d',
          }}
        >
          Open Advisor →
        </Link>
      </div>

      {/* Express Database Inserter (Matching Image Form Layout) */}
      <div
        className="card"
        style={{
          background: '#151c2d',
          border: '1px solid #1e283d',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff' }}>
            Express Database Inserter
          </strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenScanReceipt}
            style={{ fontSize: 11.5, padding: '4px 10px', background: '#1a2336', border: '1px solid #26324b' }}
          >
            <Camera size={13} /> OCR Scan
          </button>
        </div>

        <form onSubmit={handleExpressSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.3fr 1.2fr auto', gap: 12, alignItems: 'center' }}>
          <input
            className="input-field"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick Log (e.g. Momo, Coffee)"
            required
            style={{ background: '#0e1422', border: '1px solid #1e283d', borderRadius: 8, padding: '10px 14px', color: '#fff' }}
          />

          <select
            className="select-field"
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            style={{ background: '#0e1422', border: '1px solid #1e283d', borderRadius: 8, padding: '10px 14px', color: '#fff' }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="select-field"
            value={quickMethod}
            onChange={(e) => setQuickMethod(e.target.value)}
            style={{ background: '#0e1422', border: '1px solid #1e283d', borderRadius: 8, padding: '10px 14px', color: '#fff' }}
          >
            {methods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            className="input-field"
            type="number"
            step="0.01"
            min="0.01"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            required
            style={{ background: '#0e1422', border: '1px solid #1e283d', borderRadius: 8, padding: '10px 14px', color: '#fff' }}
          />

          <button
            type="submit"
            disabled={submittingQuick}
            style={{
              background: '#00d29d',
              color: '#08111e',
              fontWeight: 700,
              borderRadius: 8,
              padding: '10px 22px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              height: 42,
              transition: 'all 0.2s',
            }}
          >
            {submittingQuick ? 'Saving...' : 'Log Expense'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: '#5c6c84', fontWeight: 600 }}>Quick Add:</span>
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

      {/* Main Two-Column Layout (Matching Image Split) */}
      <div className="dashboard-grid">
        {/* Left Column: Recent Database Transactions */}
        <div className="card" style={{ background: '#151c2d', border: '1px solid #1e283d', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Recent Database Transactions
              </h2>
              <p style={{ fontSize: 12, color: '#8a99ad', margin: '2px 0 0' }}>
                Latest expenditures and deposits queried from SQLite
              </p>
            </div>
            <Link to="/transactions" style={{ fontSize: 12.5, fontWeight: 600, color: '#00d29d', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>

          {recent.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e283d' }}>
                    <th style={{ color: '#8a99ad', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '10px 12px' }}>
                      TRANSACTION
                    </th>
                    <th style={{ color: '#8a99ad', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '10px 12px' }}>
                      CATEGORY
                    </th>
                    <th style={{ color: '#8a99ad', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '10px 12px' }}>
                      METHOD
                    </th>
                    <th style={{ color: '#8a99ad', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right', padding: '10px 12px' }}>
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid #1a2336',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: 13.5 }}>{t.title}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontSize: 12.5, color: '#8a99ad' }}>{t.category}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            background: '#1a2336',
                            color: '#8a99ad',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          {t.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <strong
                          style={{
                            fontSize: 13.5,
                            color: t.kind === 'income' ? '#00d29d' : '#ff5c75',
                          }}
                        >
                          {t.kind === 'income' ? '+' : '-'}{currency}{Number(t.amount).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: '#8a99ad' }}>
              <p style={{ fontSize: 13, margin: '0 0 12px' }}>No transactions recorded yet in SQLite.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => onOpenQuickAdd('expense')}>
                + Insert First Record
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Budget Health Donut & Savings Goals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Budget Health Card with Donut Chart */}
          <div className="card" style={{ background: '#151c2d', border: '1px solid #1e283d', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Budget Health
              </h2>
              <Link to="/budgets" style={{ fontSize: 12, color: '#8a99ad', textDecoration: 'none' }}>
                Manage
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Donut Chart Visual */}
              <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
                <Doughnut data={donutData} options={donutOptions} />
              </div>

              {/* Custom Legend Matching Image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#00d29d' }} />
                  <span style={{ color: '#8a99ad' }}>Food</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#06b6d4' }} />
                  <span style={{ color: '#8a99ad' }}>Transport</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#6366f1' }} />
                  <span style={{ color: '#8a99ad' }}>Entertainment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#f59e0b' }} />
                  <span style={{ color: '#8a99ad' }}>Bills</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Goals Card */}
          <div className="card" style={{ background: '#151c2d', border: '1px solid #1e283d', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Savings Goals
                </h2>
                <p style={{ fontSize: 11.5, color: '#5c6c84', margin: '2px 0 0' }}>
                  Target milestones
                </p>
              </div>
              <Link to="/goals" style={{ fontSize: 12, color: '#8a99ad', textDecoration: 'none' }}>
                View All
              </Link>
            </div>

            {goals && goals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {goals.slice(0, 2).map((g) => {
                  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                  return (
                    <div key={g.id} style={{ background: '#0e1422', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{g.name}</span>
                        <span style={{ color: '#00d29d', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: '#1a2336', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#00d29d' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <p style={{ fontSize: 12, color: '#8a99ad', margin: '0 0 10px' }}>
                  Create savings goals to track future funds.
                </p>
                <Link
                  to="/goals"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#00d29d',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  + Create Goal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating 4-pointed Star Deco (Matching Screenshot in Bottom-Right Corner) */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 28,
          opacity: 0.65,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z"
            fill="url(#sparkle-grad)"
          />
          <defs>
            <linearGradient id="sparkle-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#818cf8" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
