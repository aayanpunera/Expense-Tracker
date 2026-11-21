import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Users, Plus, ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronRight, X, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Groups() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const outletContext = useOutletContext();
  const refreshKey = outletContext?.refreshKey || 0;
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [memberInputs, setMemberInputs] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.groups.list();
      if (res.success && Array.isArray(res.groups)) {
        setGroups(res.groups);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, refreshKey]);

  const handleAddMemberField = () => {
    setMemberInputs((prev) => [...prev, '']);
  };

  const handleMemberChange = (index, value) => {
    setMemberInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveMemberField = (index) => {
    if (memberInputs.length <= 1) return;
    setMemberInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      addToast('Group name is required.', 'error');
      return;
    }

    const cleanMembers = memberInputs.map((m) => m.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      const res = await api.groups.create({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        members: cleanMembers,
      });

      if (res.success) {
        addToast(`Group "${newGroupName}" created successfully!`, 'success');
        setCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setMemberInputs(['', '']);
        fetchGroups();
      }
    } catch (err) {
      addToast(err.message || 'Failed to create group', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregated totals
  const totalSpentAcrossGroups = groups.reduce((acc, g) => acc + (g.total_expenses || 0), 0);
  const totalUserBalance = groups.reduce((acc, g) => acc + (g.user_net_balance || 0), 0);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
            Split Bills & Group Expenses
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            Track shared spending with roommates, trips, and friends with automated debt simplification.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} />
          + Create New Group
        </button>
      </div>

      {/* KPI Overview */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="card kpi-card">
          <div className="kpi-meta">
            <span className="kpi-label">Active Groups</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">{groups.length}</div>
          <span className="kpi-trend" style={{ color: 'var(--text-muted)' }}>Shared expense pools</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-meta">
            <span className="kpi-label">Total Shared Spend</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">
            {currency}{totalSpentAcrossGroups.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-trend" style={{ color: 'var(--text-muted)' }}>Across all group ledgers</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-meta">
            <span className="kpi-label">Your Overall Position</span>
            <div
              className="kpi-icon-wrap"
              style={{
                background: totalUserBalance >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: totalUserBalance >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {totalUserBalance >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
          </div>
          <div
            className="kpi-value"
            style={{ color: totalUserBalance > 0 ? 'var(--success)' : totalUserBalance < 0 ? 'var(--danger)' : 'var(--text-main)' }}
          >
            {totalUserBalance > 0 ? '+' : ''}{currency}{Math.abs(totalUserBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="kpi-trend" style={{ color: totalUserBalance > 0 ? 'var(--success)' : totalUserBalance < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {totalUserBalance > 0 ? 'You are owed in total' : totalUserBalance < 0 ? 'You owe in total' : 'All balances settled up'}
          </span>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your split groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 99, background: 'rgba(79, 70, 229, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)' }}>
            No groups created yet
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 20px' }}>
            Split rent with roommates, dining with friends, or travel expenses for a holiday trip. Create your first group in seconds!
          </p>
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            Create Your First Group
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {groups.map((group) => {
            const balance = group.user_net_balance || 0;
            return (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
                        {group.name}
                      </h3>
                      {group.description && (
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineClamp: 2 }}>
                          {group.description}
                        </p>
                      )}
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ margin: '18px 0', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Group Spend:</span>
                      <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>
                        {currency}{group.total_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Position:</span>
                      <strong
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: balance > 0 ? 'var(--success)' : balance < 0 ? 'var(--danger)' : 'var(--text-muted)',
                        }}
                      >
                        {balance > 0 ? `+${currency}${balance.toFixed(2)} (owed to you)` : balance < 0 ? `-${currency}${Math.abs(balance).toFixed(2)} (you owe)` : 'Settled up'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    View Ledger <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 520, width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="brand-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Create Split Expense Group
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Add friends or roommates to start recording shared costs
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="modal-body" style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Group Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g., Goa Trip 2026, Apartment 302, Office Lunch"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Description (Optional)</label>
                <input
                  className="input-field"
                  placeholder="Brief note about this group"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Group Members (You are automatically included)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMemberField}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Member
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {memberInputs.map((val, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input-field"
                        placeholder={`Member ${idx + 2} name (e.g. Rahul, Priya)`}
                        value={val}
                        onChange={(e) => handleMemberChange(idx, e.target.value)}
                      />
                      {memberInputs.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveMemberField(idx)}
                          title="Remove"
                          style={{ padding: '6px 8px' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Group...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
