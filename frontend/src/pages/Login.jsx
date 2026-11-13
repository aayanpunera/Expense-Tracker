import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      addToast('Welcome back to SpendWise!', 'success');
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Invalid email or password', 'error');
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
          <p className="eyebrow">WELCOME BACK</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', marginBottom: 6 }}>
            Sign in to SpendWise
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Enter your credentials to access your real-time financial database.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="stack-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: 12, fontSize: 15, marginTop: 10 }}
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
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
          Don't have an account yet?{' '}
          <Link to="/register" style={{ fontWeight: 700, color: 'var(--primary)' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
