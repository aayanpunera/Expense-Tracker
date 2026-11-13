import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import { FileText, TrendingDown, TrendingUp, BarChart2, Award } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Reports() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  const isDarkMode = theme === 'dark';
  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#24324f' : '#f1f5f9';

  const fetchReports = useCallback(async () => {
    try {
      const res = await api.reports.get();
      if (res.success) {
        setReport(res);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        Loading financial analytics...
      </div>
    );
  }

  const categories = report?.categories || [];
  const months = report?.months || [];
  const methods = report?.methods || [];
  const totalSpent = report?.total_spent || 0;
  const totalEarned = report?.total_earned || 0;
  const avgTx = report?.avg_transaction || 0;
  const biggest = report?.biggest_expense;

  const categoryPalette = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
    '#e11d48', '#64748b'
  ];

  // Doughnut Chart Data
  const doughnutData = {
    labels: categories.map((c) => c.category),
    datasets: [
      {
        data: categories.map((c) => c.total),
        backgroundColor: categoryPalette.slice(0, categories.length),
        borderWidth: 2,
        borderColor: isDarkMode ? '#131c31' : '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  // Bar Chart Data
  const barData = {
    labels: months.map((m) => m.month),
    datasets: [
      {
        label: 'Income',
        data: months.map((m) => m.income),
        backgroundColor: '#10b981',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: months.map((m) => m.expense),
        backgroundColor: '#f43f5e',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  // Pie Chart Data for Methods
  const pieData = {
    labels: methods.map((m) => m.payment_method),
    datasets: [
      {
        data: methods.map((m) => m.total),
        backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#64748b'],
        borderWidth: 2,
        borderColor: isDarkMode ? '#131c31' : '#ffffff',
      },
    ],
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Financial Analytics</p>
          <h1>Insights & Visual Reports</h1>
          <p className="subtitle">Understand where your money goes, track cash flows, and make better decisions.</p>
        </div>
        <a
          href={api.exports.getPdfUrl()}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <FileText size={15} />
          Download PDF Statement
        </a>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Outflow</span>
            <div className="stat-icon" style={{ background: 'var(--expense-subtle)', color: 'var(--expense)' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--expense)' }}>
            {currency}{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">Lifetime total expenditures</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Inflow</span>
            <div className="stat-icon" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--income)' }}>
            {currency}{totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">Lifetime total income logged</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Average Expense</span>
            <div className="stat-icon"><BarChart2 size={18} /></div>
          </div>
          <div className="stat-value">{currency}{avgTx.toFixed(2)}</div>
          <div className="stat-meta">Mean expenditure ticket size</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Largest Expense</span>
            <div className="stat-icon"><Award size={18} /></div>
          </div>
          <div className="stat-value">
            {biggest ? `${currency}${Number(biggest.amount).toLocaleString('en-IN')}` : `${currency}0`}
          </div>
          <div className="stat-meta">
            {biggest ? `${biggest.title} (${biggest.category})` : 'No expenses logged'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        {/* Category Doughnut */}
        <div className="card" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Expenses by Category</h2>
              <p>Distribution of your expenditures</p>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 280 }}>
            {categories.length > 0 ? (
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: textColor, padding: 14, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${currency}${Number(ctx.raw).toLocaleString('en-IN')}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No expense data to display.</p>
            )}
          </div>
        </div>

        {/* Monthly Cash Flow Bar */}
        <div className="card" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Cash Flow Comparison</h2>
              <p>Monthly Income vs Expenses</p>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 280 }}>
            {months.length > 0 ? (
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      align: 'end',
                      labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${currency}${Number(ctx.raw).toLocaleString('en-IN')}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif" } },
                    },
                    y: {
                      grid: { color: gridColor },
                      ticks: {
                        color: textColor,
                        font: { family: "'Plus Jakarta Sans', sans-serif" },
                        callback: (v) => `${currency}${Number(v).toLocaleString('en-IN')}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>No monthly trend data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts & Category Table */}
      <div className="dashboard-grid">
        {/* Payment Methods */}
        <div className="card" style={{ minHeight: 360, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Payment Methods</h2>
              <p>Channels used for expenses</p>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
            {methods.length > 0 ? (
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: textColor, padding: 12, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${currency}${Number(ctx.raw).toLocaleString('en-IN')}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No method data.</p>
            )}
          </div>
        </div>

        {/* Category Share Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-box">
              <h2>Category Share Breakdown</h2>
              <p>Spending ranked by volume and share</p>
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th style={{ textAlign: 'right' }}>Total Spent</th>
                    <th style={{ textAlign: 'right' }}>Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const share = totalSpent > 0 ? ((cat.total / totalSpent) * 100).toFixed(1) : 0;
                    return (
                      <tr key={cat.category}>
                        <td>
                          <span className="cat-badge">{cat.category}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{cat.count} tx</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                          {currency}{Number(cat.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                            {share}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '42px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 13 }}>Log your first expenses to view category breakdown metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
