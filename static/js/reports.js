/**
 * SpendWise - Reports & Analytics Controller
 * Modern Chart.js configurations for spending breakdown and cash flow.
 */

document.addEventListener('DOMContentLoaded', () => {
  const dataElement = document.querySelector('#report-data');
  if (!dataElement) return;

  let reportData;
  try {
    reportData = JSON.parse(dataElement.textContent);
  } catch (e) {
    console.error('Failed to parse report data', e);
    return;
  }

  const currency = dataElement.getAttribute('data-currency') || '₹';
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#24324f' : '#f1f5f9';

  // Palette for categories
  const categoryPalette = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
    '#e11d48', '#64748b'
  ];

  // 1. Expenses by Category (Doughnut Chart)
  const categoryCanvas = document.querySelector('#category-chart');
  if (categoryCanvas && reportData.categories && reportData.categories.length > 0) {
    new Chart(categoryCanvas, {
      type: 'doughnut',
      data: {
        labels: reportData.categories.map(c => c.category),
        datasets: [{
          data: reportData.categories.map(c => c.total),
          backgroundColor: categoryPalette.slice(0, reportData.categories.length),
          borderWidth: 2,
          borderColor: isDarkMode ? '#131c31' : '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              color: textColor,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: '600'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = Number(context.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                return ` ${context.label}: ${currency}${val}`;
              }
            }
          }
        }
      }
    });
  }

  // 2. Monthly Income vs Expenses (Bar Chart)
  const monthlyCanvas = document.querySelector('#monthly-chart');
  if (monthlyCanvas && reportData.months && reportData.months.length > 0) {
    new Chart(monthlyCanvas, {
      type: 'bar',
      data: {
        labels: reportData.months.map(m => m.month),
        datasets: [
          {
            label: 'Income',
            data: reportData.months.map(m => m.income),
            backgroundColor: '#10b981',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Expenses',
            data: reportData.months.map(m => m.expense),
            backgroundColor: '#f43f5e',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              color: textColor,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                weight: '600'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = Number(context.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                return ` ${context.dataset.label}: ${currency}${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif" }
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif" },
              callback: (value) => `${currency}${Number(value).toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  // 3. Payment Methods Breakdown (Polar/Pie Chart)
  const methodCanvas = document.querySelector('#method-chart');
  if (methodCanvas && reportData.methods && reportData.methods.length > 0) {
    new Chart(methodCanvas, {
      type: 'pie',
      data: {
        labels: reportData.methods.map(m => m.payment_method),
        datasets: [{
          data: reportData.methods.map(m => m.total),
          backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#64748b'],
          borderWidth: 2,
          borderColor: isDarkMode ? '#131c31' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 12,
              color: textColor,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = Number(context.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                return ` ${context.label}: ${currency}${val}`;
              }
            }
          }
        }
      }
    });
  }
});
