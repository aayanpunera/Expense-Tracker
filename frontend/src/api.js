/**
 * Central API Client for SpendWise Backend REST API
 */

const BASE_URL = '/api';

function getHeaders() {
  const token = localStorage.getItem('spendwise_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error! Status: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name, email, password, currency) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, currency }),
      }),
    getMe: () => request('/auth/me'),
  },

  // Dashboard
  dashboard: {
    get: () => request('/dashboard'),
  },

  // Transactions
  transactions: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, v);
        }
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request(`/transactions${query}`);
    },
    create: (data) =>
      request('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      request(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      request(`/transactions/${id}`, {
        method: 'DELETE',
      }),
  },

  // Budgets
  budgets: {
    list: () => request('/budgets'),
    save: (category, monthly_limit) =>
      request('/budgets', {
        method: 'POST',
        body: JSON.stringify({ category, monthly_limit }),
      }),
    delete: (id) =>
      request(`/budgets/${id}`, {
        method: 'DELETE',
      }),
  },

  // Goals
  goals: {
    list: () => request('/goals'),
    create: (data) =>
      request('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    contribute: (id, amount) =>
      request(`/goals/${id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    delete: (id) =>
      request(`/goals/${id}`, {
        method: 'DELETE',
      }),
  },

  // Recurring
  recurring: {
    list: () => request('/recurring'),
    create: (data) =>
      request('/recurring', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggle: (id) =>
      request(`/recurring/${id}/toggle`, {
        method: 'POST',
      }),
    delete: (id) =>
      request(`/recurring/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reports
  reports: {
    get: () => request('/reports'),
  },

  // Settings & Tools
  settings: {
    get: () => request('/settings'),
    update: (data) =>
      request('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    seedDemo: () =>
      request('/settings/seed-demo', {
        method: 'POST',
      }),
    clearData: () =>
      request('/settings/clear-data', {
        method: 'POST',
      }),
  },

  // Export URLs with current auth token
  exports: {
    getCsvUrl: (params = {}) => {
      const qs = new URLSearchParams(params);
      const token = localStorage.getItem('spendwise_token');
      if (token) qs.append('token', token);
      return `/api/export/csv?${qs.toString()}`;
    },
    getPdfUrl: () => {
      const token = localStorage.getItem('spendwise_token');
      return `/api/export/pdf?token=${encodeURIComponent(token || '')}`;
    },
    getJsonUrl: () => {
      const token = localStorage.getItem('spendwise_token');
      return `/api/export/json?token=${encodeURIComponent(token || '')}`;
    },
  },
};
