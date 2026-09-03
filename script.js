/**
 * SmartExpense - Client Application Logic
 * MCA Assignment: Modern Vanilla JavaScript + Chart.js + Fetch API
 */

// --- API Configuration ---
// When served by Flask on http://127.0.0.1:5000, relative URL works directly.
// If opened via file:// or another static server, fallback to default Flask address.
const API_BASE_URL = (window.location.origin.startsWith('http')) 
  ? `${window.location.origin}/api/expenses` 
  : 'http://127.0.0.1:5000/api/expenses';

// --- Category Colors and Icons Mapping ---
const CATEGORY_META = {
  Food: {
    color: '#f59e0b',
    icon: 'fa-burger',
    badgeClass: 'cat-badge-food'
  },
  Transport: {
    color: '#3b82f6',
    icon: 'fa-car-side',
    badgeClass: 'cat-badge-transport'
  },
  Utilities: {
    color: '#a855f7',
    icon: 'fa-bolt',
    badgeClass: 'cat-badge-utilities'
  },
  Entertainment: {
    color: '#ec4899',
    icon: 'fa-film',
    badgeClass: 'cat-badge-entertainment'
  },
  Other: {
    color: '#64748b',
    icon: 'fa-box-archive',
    badgeClass: 'cat-badge-other'
  }
};

// --- Application State ---
let expensesState = [];
let categoryChart = null;
let pendingDeleteId = null;

// --- DOM Elements ---
const expenseForm = document.getElementById('expenseForm');
const descInput = document.getElementById('expenseDescription');
const amountInput = document.getElementById('expenseAmount');
const categorySelect = document.getElementById('expenseCategory');
const dateInput = document.getElementById('expenseDate');
const submitBtn = document.getElementById('submitExpenseBtn');

const descError = document.getElementById('descError');
const amountError = document.getElementById('amountError');
const categoryError = document.getElementById('categoryError');

const kpiTotalAmount = document.getElementById('kpiTotalAmount');
const kpiTotalCount = document.getElementById('kpiTotalCount');
const kpiTopCategory = document.getElementById('kpiTopCategory');
const kpiTopCategoryAmount = document.getElementById('kpiTopCategoryAmount');
const kpiAverageAmount = document.getElementById('kpiAverageAmount');

const expenseList = document.getElementById('expenseList');
const listEmptyState = document.getElementById('listEmptyState');
const emptyStateMessage = document.getElementById('emptyStateMessage');
const listLoadingState = document.getElementById('listLoadingState');
const filterResultsCount = document.getElementById('filterResultsCount');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterCategory = document.getElementById('filterCategory');
const sortBy = document.getElementById('sortBy');
const exportCsvBtn = document.getElementById('exportCsvBtn');

const chartCanvas = document.getElementById('categoryChart');
const chartEmptyState = document.getElementById('chartEmptyState');
const categoryLegend = document.getElementById('categoryLegend');

const toastContainer = document.getElementById('toastContainer');
const deleteModal = document.getElementById('deleteModal');
const deleteModalItemName = document.getElementById('deleteModalItemName');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const apiStatusBadge = document.getElementById('apiStatusBadge');
const headerCurrentDate = document.getElementById('headerCurrentDate');

// --- Helper Utilities ---

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  if (!dateString) return 'Today';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {
    // Fallback
  }
  return dateString;
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark"></i>';

  toast.innerHTML = `
    ${iconHtml}
    <div style="flex: 1; word-break: break-word;">${message}</div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// --- API Client Layer ---

async function fetchExpenses() {
  setLoadingState(true);
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    if (data.success && Array.isArray(data.expenses)) {
      expensesState = data.expenses;
      updateStatusBadge(true);
      renderAll();
    } else {
      throw new Error('Unexpected response format.');
    }
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    updateStatusBadge(false);
    showToast('Cannot connect to Flask server. Please make sure app.py is running.', 'error');
  } finally {
    setLoadingState(false);
  }
}

async function addExpenseApi(payload) {
  setSubmitButtonLoading(true);
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add expense.');
    }

    // Add locally to state
    expensesState.push(data.expense);
    showToast('Expense recorded successfully!', 'success');
    expenseForm.reset();
    dateInput.value = getTodayISODate();
    clearErrors();
    renderAll();
    return true;
  } catch (error) {
    console.error('Error adding expense:', error);
    showToast(error.message || 'Error adding expense.', 'error');
    return false;
  } finally {
    setSubmitButtonLoading(false);
  }
}

async function deleteExpenseApi(expenseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${expenseId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete expense.');
    }

    expensesState = expensesState.filter(item => item.id !== expenseId);
    showToast('Expense deleted successfully.', 'success');
    renderAll();
  } catch (error) {
    console.error('Error deleting expense:', error);
    showToast(error.message || 'Could not delete item.', 'error');
  }
}

// --- UI Rendering Functions ---

function renderAll() {
  updateKPIs();
  updateChart();
  renderExpenseList();
}

function updateKPIs() {
  const count = expensesState.length;
  const total = expensesState.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const average = count > 0 ? (total / count) : 0;

  kpiTotalAmount.textContent = formatCurrency(total);
  kpiTotalCount.textContent = count;
  kpiAverageAmount.textContent = formatCurrency(average);

  // Determine top category
  if (count === 0) {
    kpiTopCategory.textContent = 'None';
    kpiTopCategoryAmount.textContent = '$0.00 spent';
  } else {
    const catTotals = {};
    expensesState.forEach(item => {
      const cat = item.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + (Number(item.amount) || 0);
    });

    let topCat = 'None';
    let maxSpent = 0;
    for (const [cat, spent] of Object.entries(catTotals)) {
      if (spent > maxSpent) {
        maxSpent = spent;
        topCat = cat;
      }
    }

    kpiTopCategory.textContent = topCat;
    kpiTopCategoryAmount.textContent = `${formatCurrency(maxSpent)} spent`;
  }
}

function getFilteredAndSortedExpenses() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = filterCategory.value;
  const sortMode = sortBy.value;

  let filtered = expensesState.filter(item => {
    const matchesSearch = !searchTerm || item.description.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortMode === 'date-desc') {
      return new Date(b.date || 0) - new Date(a.date || 0);
    } else if (sortMode === 'date-asc') {
      return new Date(a.date || 0) - new Date(b.date || 0);
    } else if (sortMode === 'amount-desc') {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    } else if (sortMode === 'amount-asc') {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    return 0;
  });

  return filtered;
}

function renderExpenseList() {
  const filtered = getFilteredAndSortedExpenses();
  expenseList.innerHTML = '';

  filterResultsCount.textContent = `Showing ${filtered.length} of ${expensesState.length} transactions`;

  if (filtered.length === 0) {
    listEmptyState.classList.remove('hidden');
    if (expensesState.length === 0) {
      emptyStateMessage.textContent = 'Your expense history is empty. Add your first expense using the form on the left!';
    } else {
      emptyStateMessage.textContent = 'No expenses match the current filter or search criteria.';
    }
    return;
  }

  listEmptyState.classList.add('hidden');

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.dataset.id = item.id;

    const meta = CATEGORY_META[item.category] || CATEGORY_META.Other;
    const formattedAmount = formatCurrency(item.amount);
    const displayDate = formatDate(item.date);

    li.innerHTML = `
      <div class="expense-item-main">
        <div class="category-badge-icon ${meta.badgeClass}">
          <i class="fa-solid ${meta.icon}"></i>
        </div>
        <div class="expense-item-info">
          <span class="expense-item-title" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</span>
          <div class="expense-item-details">
            <span class="category-tag ${meta.badgeClass}">${item.category}</span>
            <span>&bull;</span>
            <span><i class="fa-regular fa-calendar-days"></i> ${displayDate}</span>
          </div>
        </div>
      </div>
      <div class="expense-item-actions">
        <span class="expense-item-amount">${formattedAmount}</span>
        <button class="btn-delete" title="Delete expense" data-id="${item.id}" data-desc="${escapeHtml(item.description)}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;

    expenseList.appendChild(li);
  });

  // Attach delete handlers
  expenseList.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = button.dataset.id;
      const desc = button.dataset.desc || 'this item';
      promptDeleteModal(id, desc);
    });
  });
}

function updateChart() {
  const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];
  const totals = { Food: 0, Transport: 0, Utilities: 0, Entertainment: 0, Other: 0 };
  let grandTotal = 0;

  expensesState.forEach(item => {
    const cat = item.category in totals ? item.category : 'Other';
    const amt = Number(item.amount) || 0;
    totals[cat] += amt;
    grandTotal += amt;
  });

  const chartData = categories.map(cat => totals[cat]);
  const backgroundColors = categories.map(cat => CATEGORY_META[cat].color);

  // Render Legend
  categoryLegend.innerHTML = '';
  categories.forEach(cat => {
    const amt = totals[cat];
    const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : '0.0';

    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-left">
        <span class="legend-color-dot" style="background: ${CATEGORY_META[cat].color};"></span>
        <span>${cat}</span>
        <span class="legend-percent">(${pct}%)</span>
      </div>
      <span class="legend-amount">${formatCurrency(amt)}</span>
    `;
    categoryLegend.appendChild(item);
  });

  if (grandTotal === 0) {
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    chartCanvas.style.display = 'none';
    chartEmptyState.classList.remove('hidden');
    return;
  }

  chartCanvas.style.display = 'block';
  chartEmptyState.classList.add('hidden');

  if (categoryChart) {
    categoryChart.data.datasets[0].data = chartData;
    categoryChart.update();
  } else {
    const ctx = chartCanvas.getContext('2d');
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: chartData,
          backgroundColor: backgroundColors,
          borderColor: '#151c2e',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 6,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }
}

// --- Delete Modal Dialog ---

function promptDeleteModal(id, desc) {
  pendingDeleteId = id;
  deleteModalItemName.textContent = `"${desc}"`;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.add('hidden');
}

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', async () => {
  if (pendingDeleteId) {
    const idToDelete = pendingDeleteId;
    closeDeleteModal();
    await deleteExpenseApi(idToDelete);
  }
});

// Close modal on outside click
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    closeDeleteModal();
  }
});

// --- Form Validation & Submission ---

function clearErrors() {
  descError.textContent = '';
  amountError.textContent = '';
  categoryError.textContent = '';
  descInput.style.borderColor = '';
  amountInput.style.borderColor = '';
  categorySelect.style.borderColor = '';
}

function validateForm() {
  clearErrors();
  let isValid = true;

  const desc = descInput.value.trim();
  const amt = parseFloat(amountInput.value);
  const cat = categorySelect.value;

  if (!desc) {
    descError.textContent = 'Please enter a description.';
    descInput.style.borderColor = '#fb7185';
    isValid = false;
  } else if (desc.length < 2) {
    descError.textContent = 'Description must be at least 2 characters.';
    descInput.style.borderColor = '#fb7185';
    isValid = false;
  }

  if (isNaN(amt) || amt <= 0) {
    amountError.textContent = 'Please enter a valid amount greater than 0.';
    amountInput.style.borderColor = '#fb7185';
    isValid = false;
  }

  if (!cat) {
    categoryError.textContent = 'Please select an expense category.';
    categorySelect.style.borderColor = '#fb7185';
    isValid = false;
  }

  return isValid;
}

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    description: descInput.value.trim(),
    amount: parseFloat(amountInput.value),
    category: categorySelect.value,
    date: dateInput.value || getTodayISODate()
  };

  await addExpenseApi(payload);
});

// --- Search, Filters & Export ---

searchInput.addEventListener('input', () => {
  if (searchInput.value.length > 0) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderExpenseList();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  renderExpenseList();
});

filterCategory.addEventListener('change', renderExpenseList);
sortBy.addEventListener('change', renderExpenseList);

// Export CSV Feature
exportCsvBtn.addEventListener('click', () => {
  if (expensesState.length === 0) {
    showToast('No expenses available to export.', 'error');
    return;
  }

  const headers = ['ID', 'Date', 'Description', 'Category', 'Amount'];
  const rows = expensesState.map(exp => [
    `"${exp.id}"`,
    `"${exp.date}"`,
    `"${exp.description.replace(/"/g, '""')}"`,
    `"${exp.category}"`,
    exp.amount
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `expenses_${getTodayISODate()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Expenses exported to CSV!', 'success');
});

// --- Loading State and Helpers ---

function setLoadingState(isLoading) {
  if (isLoading) {
    listLoadingState.classList.remove('hidden');
    listEmptyState.classList.add('hidden');
  } else {
    listLoadingState.classList.add('hidden');
  }
}

function setSubmitButtonLoading(isLoading) {
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>';
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-arrow-down-to-bracket"></i> <span>Add Expense</span>';
  }
}

function updateStatusBadge(isOnline) {
  if (isOnline) {
    apiStatusBadge.className = 'status-badge';
    apiStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Backend Connected</span>';
  } else {
    apiStatusBadge.className = 'status-badge error';
    apiStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Backend Offline</span>';
  }
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Set default date input to today
  dateInput.value = getTodayISODate();

  // Set header display date
  const now = new Date();
  headerCurrentDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Fetch initial expenses
  fetchExpenses();
});
