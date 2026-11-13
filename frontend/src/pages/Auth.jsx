import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Auth() {
  const { login, register } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password);
        addToast('Welcome back to SpendWise!', 'success');
      } else {
        await register(name.trim(), email.trim().toLowerCase(), password, currency);
        addToast('Welcome to SpendWise! Your account is created.', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Authentication error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div className="brand-logo" style={{ width: 42, height: 42, fontSize: 22 }}>₹</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>SpendWise</h2>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Smart Expense Manager
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow">{mode === 'register' ? 'GET STARTED TODAY' : 'WELCOME BACK'}</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', marginBottom: 6 }}>
            {mode === 'register' ? 'Create your account' : 'Sign in to SpendWise'}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            {mode === 'register'
              ? 'Take full control of your expenses, budgets, and savings.'
              : 'Enter your credentials to access your financial dashboard.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="stack-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aayan Punera"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input-field"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Preferred Currency</label>
              <select
                className="select-field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="₹">₹ — INR (Indian Rupee)</option>
                <option value="$">$ — USD (US Dollar)</option>
                <option value="€">€ — EUR (Euro)</option>
                <option value="£">£ — GBP (British Pound)</option>
                <option value="A$">A$ — AUD (Australian Dollar)</option>
                <option value="¥">¥ — JPY (Japanese Yen)</option>
                <option value="AED">AED — Dirham</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: 12, fontSize: 15, marginTop: 10 }}
          >
            {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--border-color)',
            fontSize: 13.5,
            color: 'var(--text-muted)',
          }}
        >
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
