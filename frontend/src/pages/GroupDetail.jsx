import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Plus,
  ArrowRight,
  CheckCircle2,
  Trash2,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Modals
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Add Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('');
  const [expCategory, setExpCategory] = useState('Food & Dining');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Settle form
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Add Member form
  const [newMemberName, setNewMemberName] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.groups.get(id);
      if (res.success) {
        setData(res);
        if (res.members?.length > 0 && !expPayer) {
          setExpPayer(res.members[0].id.toString());
        }
      } else {
        addToast('Group not found.', 'error');
        navigate('/groups');
      }
    } catch (err) {
      addToast(err.message || 'Failed to load group details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expTitle.trim() || parseFloat(expAmount) <= 0 || !expPayer) {
      addToast('Please enter title, valid amount, and payer.', 'error');
      return;
    }

    setSubmittingExpense(true);
    try {
      await api.groups.addExpense(id, {
        title: expTitle.trim(),
        amount: parseFloat(expAmount),
        paid_by_member_id: parseInt(expPayer, 10),
        category: expCategory,
        expense_date: expDate,
        split_type: 'equal',
      });

      addToast('Shared expense added to group!', 'success');
      setAddExpenseOpen(false);
      setExpTitle('');
      setExpAmount('');
      fetchGroup();
    } catch (err) {
      addToast(err.message || 'Failed to add expense', 'error');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId, title) => {
    if (!window.confirm(`Delete shared expense "${title}"?`)) return;
    try {
      await api.groups.deleteExpense(id, expenseId);
      addToast('Shared expense deleted.', 'info');
      fetchGroup();
    } catch (err) {
      addToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleFrom || !settleTo || parseFloat(settleAmount) <= 0) {
      addToast('Please select payer, receiver, and positive amount.', 'error');
      return;
    }
    if (settleFrom === settleTo) {
      addToast('Payer and recipient cannot be the same member.', 'error');
      return;
    }

    setSubmittingSettle(true);
    try {
      await api.groups.settle(id, {
        from_member_id: parseInt(settleFrom, 10),
        to_member_id: parseInt(settleTo, 10),
        amount: parseFloat(settleAmount),
        note: settleNote.trim(),
      });

      addToast('Settlement payment recorded successfully!', 'success');
      setSettleOpen(false);
      setSettleAmount('');
      setSettleNote('');
      fetchGroup();
    } catch (err) {
      addToast(err.message || 'Failed to record settlement', 'error');
    } finally {
      setSubmittingSettle(false);
    }
  };

  const handleQuickSettle = (debt) => {
    setSettleFrom(debt.from_member.id.toString());
    setSettleTo(debt.to_member.id.toString());
    setSettleAmount(debt.amount.toString());
    setSettleNote(`Settling simplified debt in ${data.group.name}`);
    setSettleOpen(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    setSubmittingMember(true);
    try {
      await api.groups.addMember(id, { name: newMemberName.trim() });
      addToast(`Added ${newMemberName} to the group!`, 'success');
      setAddMemberOpen(false);
      setNewMemberName('');
      fetchGroup();
    } catch (err) {
      addToast(err.message || 'Failed to add member', 'error');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${data.group.name}"?`)) return;
    try {
      await api.groups.delete(id);
      addToast('Group deleted.', 'info');
      navigate('/groups');
    } catch (err) {
      addToast(err.message || 'Failed to delete group', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading group ledger...
        </div>
      </div>
    );
  }

  if (!data || !data.group) return null;

  return (
    <div className="page-container">
      {/* Back Link */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/groups" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Groups
        </Link>
      </div>

      {/* Group Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="brand-logo" style={{ width: 38, height: 38, fontSize: 18 }}>
                <Users size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {data.group.name}
                </h1>
                {data.group.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{data.group.description}</p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-neutral" style={{ fontSize: 12 }}>
                {data.members.length} members
              </span>
              <span className="badge badge-income" style={{ fontSize: 12 }}>
                Total Spent: {currency}{data.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddMemberOpen(true)}>
              <UserPlus size={14} /> Add Member
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSettleOpen(true)}>
              <CheckCircle2 size={14} /> Settle Up
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setAddExpenseOpen(true)}>
              <Plus size={14} /> + Add Group Expense
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup} title="Delete Group">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.4fr)', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Simplified Debts & Member Balances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Who Owes Whom (Automated Debt Simplification) */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px', color: 'var(--text-main)' }}>
              ⚡ Simplified Settlement Plan
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Calculates the minimum number of transactions needed to settle all balances.
            </p>

            {data.simplified_debts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', background: 'var(--bg-card-secondary)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--success)', marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>All Settled Up!</p>
                <small style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Nobody owes money in this group.</small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.simplified_debts.map((debt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'var(--bg-card-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <strong style={{ color: 'var(--danger)' }}>{debt.from_member.name}</strong>
                      <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                      <strong style={{ color: 'var(--success)' }}>{debt.to_member.name}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                        {currency}{debt.amount.toFixed(2)}
                      </strong>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11.5 }}
                        onClick={() => handleQuickSettle(debt)}
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Net Balances */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-main)' }}>
              👥 Member Balances
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.members.map((m) => {
                const isPositive = m.balance > 0;
                const isNegative = m.balance < 0;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--bg-card-secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{m.name}</strong>
                      {m.is_owner === 1 && (
                        <span className="badge badge-neutral" style={{ fontSize: 10, marginLeft: 6 }}>
                          Owner (You)
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-muted)',
                      }}
                    >
                      {isPositive ? `+${currency}${m.balance.toFixed(2)} (gets back)` : isNegative ? `-${currency}${Math.abs(m.balance).toFixed(2)} (owes)` : 'Settled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Shared Expenses & Settlements Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Shared Expenses List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                🧾 Shared Expenses ({data.expenses.length})
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => setAddExpenseOpen(true)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {data.expenses.length === 0 ? (
              <div style={{ padding: 42, textAlign: 'center', color: 'var(--text-muted)' }}>
                No expenses recorded yet. Click <strong>+ Add Group Expense</strong> to split a bill.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Paid By</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {exp.expense_date}
                        </td>
                        <td>
                          <strong>{exp.title}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {exp.category} • Split {exp.split_type} among {exp.shares.length}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                            {exp.paid_by_name}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                            {currency}{exp.amount.toFixed(2)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Settlements History */}
          {data.settlements?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  ✅ Recorded Settlements ({data.settlements.length})
                </h3>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.settlements.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12.5,
                      padding: '8px 10px',
                      background: 'var(--bg-card-secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <strong>{s.from_member_name}</strong> paid <strong>{s.to_member_name}</strong>
                      {s.note && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({s.note})</span>}
                    </div>
                    <div style={{ color: 'var(--success)', fontWeight: 700 }}>
                      +{currency}{s.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {addExpenseOpen && (
        <div className="modal-backdrop" onClick={() => setAddExpenseOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 480, width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Add Shared Expense</h3>
              <button className="modal-close-btn" onClick={() => setAddExpenseOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="modal-body" style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Expense Description *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Dinner, Groceries, Hotel booking"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Total Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Who Paid? *</label>
                  <select className="select-field" value={expPayer} onChange={(e) => setExpPayer(e.target.value)}>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="select-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Travel">Travel</option>
                    <option value="Rent">Rent</option>
                    <option value="Bills">Bills</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-card-secondary)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                💡 Automatically split equally among all <strong>{data.members.length} members</strong> ({currency}
                {(parseFloat(expAmount || 0) / (data.members.length || 1)).toFixed(2)} per person).
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAddExpenseOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingExpense}>
                  {submittingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {settleOpen && (
        <div className="modal-backdrop" onClick={() => setSettleOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 460, width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Record Settlement Payment</h3>
              <button className="modal-close-btn" onClick={() => setSettleOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Who Paid? *</label>
                  <select className="select-field" value={settleFrom} onChange={(e) => setSettleFrom(e.target.value)} required>
                    <option value="">Select Member</option>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Paid To Whom? *</label>
                  <select className="select-field" value={settleTo} onChange={(e) => setSettleTo(e.target.value)} required>
                    <option value="">Select Member</option>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Amount Settled ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Note / Reference (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. Paid via GooglePay, UPI ref 9482"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSettleOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingSettle}>
                  {submittingSettle ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div className="modal-backdrop" onClick={() => setAddMemberOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 420, width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Add New Group Member</h3>
              <button className="modal-close-btn" onClick={() => setAddMemberOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="modal-body" style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Member Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Vikram, Anita"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAddMemberOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingMember}>
                  {submittingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
