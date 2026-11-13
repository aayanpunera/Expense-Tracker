import React, { useState, useEffect, useCallback } from 'react';
import { Target, Flag, Sparkles, Plus, Trash2, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Goals() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [totalTarget, setTotalTarget] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Contribution inputs per goal id
  const [contributions, setContributions] = useState({});

  const fetchGoals = useCallback(async () => {
    try {
      const res = await api.goals.list();
      if (res.success) {
        setGoals(res.goals);
        setTotalTarget(res.total_target);
        setTotalSaved(res.total_saved);
        setOverallProgress(res.overall_progress);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || parseFloat(targetAmount) <= 0) {
      addToast('Please enter a goal name and positive target amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.goals.create({
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate || null,
      });

      addToast(`Goal '${name}' created!`, 'success');
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetDate('');
      fetchGoals();
    } catch (err) {
      addToast(err.message || 'Failed to create goal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (goalId, goalName, targetAmt, currentAmt) => {
    const val = parseFloat(contributions[goalId] || 0);
    if (val <= 0) {
      addToast('Please enter a positive contribution amount.', 'error');
      return;
    }

    try {
      await api.goals.contribute(goalId, val);
      addToast(`Added ${currency}${val} to '${goalName}'!`, 'success');

      // Check if this contribution completes the goal!
      if (currentAmt + val >= targetAmt) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        addToast(`🎉 Congratulations! You reached your goal for '${goalName}'!`, 'success');
      }

      setContributions((prev) => ({ ...prev, [goalId]: '' }));
      fetchGoals();
    } catch (err) {
      addToast(err.message || 'Failed to add funds', 'error');
    }
  };

  const handleDelete = async (id, goalName) => {
    if (!window.confirm(`Delete savings goal '${goalName}'?`)) return;
    try {
      await api.goals.delete(id);
      addToast(`Goal '${goalName}' deleted.`, 'info');
      fetchGoals();
    } catch (err) {
      addToast(err.message || 'Failed to delete goal', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-meta">
          <p className="eyebrow">Milestones & Targets</p>
          <h1>Savings Goals</h1>
          <p className="subtitle">Turn your dreams and safety nets into measurable milestones.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Target</span>
            <div className="stat-icon"><Flag size={18} /></div>
          </div>
          <div className="stat-value">{currency}{totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="stat-meta">Combined target milestones</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Saved</span>
            <div className="stat-icon" style={{ background: 'var(--income-subtle)', color: 'var(--income)' }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--income)' }}>
            {currency}{totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-meta">Accumulated across all goals</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Overall Completion</span>
            <div className="stat-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="stat-value">{overallProgress}%</div>
          <div className="stat-meta">{currency}{Math.max(totalTarget - totalSaved, 0).toLocaleString('en-IN')} remaining</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Create Goal Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <div className="card-title-box">
              <h2>Create Savings Goal</h2>
              <p>Set a new financial target</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="stack-form">
            <div className="form-group">
              <label className="form-label">Goal Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emergency Fund, New Laptop, Japan Trip"
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Target Amount ({currency})</label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  step="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="50000"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Already Saved ({currency})</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Date <span className="hint">(optional)</span></label>
              <input
                className="input-field"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
              {submitting ? 'Creating...' : '+ Create Savings Goal'}
            </button>
          </form>
        </div>

        {/* Goal Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading goals...
            </div>
          ) : goals.length > 0 ? (
            goals.map((g) => {
              const pct = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
              const remaining = Math.max(g.target_amount - g.current_amount, 0);

              return (
                <div key={g.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      {g.target_date && (
                        <span className="badge badge-neutral" style={{ marginBottom: 6, fontSize: 11 }}>
                          Due: {g.target_date}
                        </span>
                      )}
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                        {g.name}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {pct >= 100 ? (
                        <span className="badge badge-income">🎉 Achieved!</span>
                      ) : (
                        <span className="badge badge-neutral">{pct}% Complete</span>
                      )}

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(g.id, g.name)}
                        style={{ color: 'var(--text-dim)', padding: 4 }}
                        title="Delete goal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    <strong style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                      {currency}{Number(g.current_amount).toLocaleString('en-IN')}
                    </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
                      of {currency}{Number(g.target_amount).toLocaleString('en-IN')}
                    </span>
                    <small style={{ color: 'var(--text-dim)', marginLeft: 'auto', fontSize: 12 }}>
                      {currency}{remaining.toLocaleString('en-IN')} to go
                    </small>
                  </div>

                  <div className="progress-track" style={{ height: 11, marginBottom: 16 }}>
                    <div className="progress-fill progress-safe" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Inline Deposit / Contribution */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-card-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      + Deposit:
                    </span>
                    <input
                      className="input-field"
                      type="number"
                      step="0.01"
                      min="1"
                      value={contributions[g.id] || ''}
                      onChange={(e) => setContributions((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      placeholder={`Amount (${currency})`}
                      style={{ height: 36, padding: '6px 12px', fontSize: 13 }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleContribute(g.id, g.name, g.target_amount, g.current_amount)}
                      style={{ height: 36 }}
                    >
                      Add Funds
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌟</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                No goals added yet
              </h3>
              <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto' }}>
                Create your first milestone using the form on the left to start tracking your savings progress.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
