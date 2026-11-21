import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Advisor() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const currency = user?.currency || '₹';

  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insights, setInsights] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        `👋 Hello **${user?.name || 'there'}**! I am your **SpendWise AI Financial Advisor**.\n\n` +
        `I continuously analyze your live transactions, budgets, recurring bills, and savings goals to give you actionable financial strategies.\n\n` +
        `Ask me anything about your finances, or click one of the quick analysis prompts below!`,
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await api.ai.insights();
      if (res.success && Array.isArray(res.insights)) {
        setInsights(res.insights);
      }
    } catch (err) {
      console.warn('Failed to fetch AI insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleSend = async (questionText) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || asking) return;

    setInputQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setAsking(true);

    try {
      const res = await api.ai.ask(q);
      if (res.success && res.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
      } else {
        throw new Error(res.error || 'No answer received');
      }
    } catch (err) {
      addToast(err.message || 'AI Advisor failed to answer. Try again.', 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ I encountered an issue analyzing your financial records. Please try asking again in a moment.',
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const quickPrompts = [
    '📊 Check my 50/30/20 rule',
    '🍔 How much did I spend on Food & Dining?',
    '💳 Can I afford a big purchase this month?',
    '💡 Give me tips to save more',
    '📈 Overall monthly financial health check',
  ];

  const renderSimpleMarkdown = (text) => {
    // Basic Markdown conversion for bold, lists, and headers
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} style={{ fontSize: 16, fontWeight: 800, margin: '14px 0 8px', color: 'var(--text-main)' }}>
            {trimmed.slice(4)}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} style={{ fontSize: 18, fontWeight: 800, margin: '16px 0 8px', color: 'var(--text-main)' }}>
            {trimmed.slice(3)}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} style={{ marginLeft: 18, marginBottom: 4, lineHeight: 1.5 }}>
            {formatInlineStyles(trimmed.slice(2))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li key={idx} style={{ marginLeft: 18, marginBottom: 4, lineHeight: 1.5, listStyleType: 'decimal' }}>
            {formatInlineStyles(trimmed.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Simple table line display
        return (
          <div key={idx} style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 0', opacity: 0.9 }}>
            {trimmed}
          </div>
        );
      }
      if (!trimmed) {
        return <div key={idx} style={{ height: 6 }} />;
      }
      return (
        <p key={idx} style={{ margin: '4px 0', lineHeight: 1.5 }}>
          {formatInlineStyles(trimmed)}
        </p>
      );
    });
  };

  const formatInlineStyles = (str) => {
    // Bold **text**
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
              <Sparkles size={18} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              AI Financial Advisor & Insights
            </h1>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Intelligent spending analysis, 50/30/20 budget compliance, cash burn forecast, and personalized financial coaching.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchInsights} title="Refresh Analysis">
          <RefreshCw size={14} className={loadingInsights ? 'spin-icon' : ''} />
          Refresh Insights
        </button>
      </div>

      {/* Top 4 AI Analytic Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 28 }}>
        {loadingInsights
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ height: 140, opacity: 0.6 }}>
                Loading AI insight...
              </div>
            ))
          : insights.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--primary)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {item.title}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: 11, fontWeight: 700 }}>
                      {item.grade}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {item.summary}
                  </p>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                  💡 {item.recommendation}
                </div>
              </div>
            ))}
      </div>

      {/* Interactive AI Chat Box */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 560, overflow: 'hidden' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: 'var(--gradient-primary)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>SpendWise Financial Intelligence</strong>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Real-time database sync enabled</div>
            </div>
          </div>
          <span className="badge badge-income" style={{ fontSize: 11 }}>
            ● Online & Active
          </span>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '80%' : '88%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 99,
                      background: 'var(--bg-card-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--primary)',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-lg)',
                    background: isUser ? 'var(--primary)' : 'var(--bg-card-secondary)',
                    color: isUser ? '#fff' : 'var(--text-main)',
                    fontSize: 13.5,
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {isUser ? m.content : renderSimpleMarkdown(m.content)}
                </div>

                {isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 99,
                      background: 'var(--primary-dark)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
              </div>
            );
          })}

          {asking && (
            <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  background: 'var(--bg-card-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--primary)',
                }}
              >
                <Bot size={16} />
              </div>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-card-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                }}
              >
                <Sparkles size={16} className="spin-icon" style={{ color: 'var(--primary)' }} />
                Analyzing your financial snapshot and computing statistics...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-card-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={asking}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 99,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: 10,
            background: 'var(--bg-card)',
          }}
        >
          <input
            className="input-field"
            placeholder="Ask anything about your spending, budgets, savings or financial tips..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={asking}
            style={{ fontSize: 13.5 }}
          />
          <button type="submit" className="btn btn-primary" disabled={asking || !inputQuestion.trim()}>
            <Send size={15} />
            <span>Ask Advisor</span>
          </button>
        </form>
      </div>
    </div>
  );
}
