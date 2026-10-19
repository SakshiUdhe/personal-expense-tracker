// ============================================================
// Personal Expense Tracker & Budget Management System
// Client-side Application Logic
// ============================================================

let currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
let categoryChartInstance = null;
let trendChartInstance = null;
let currentUser = null;

// Initialize on Document Ready
document.addEventListener('DOMContentLoaded', async () => {
  // Check user authentication status first
  const authenticated = await checkAuth();
  if (!authenticated) return;

  // Initialize UI controls
  initDateDefaults();
  initEventListeners();

  // Load Initial Data
  await refreshAllData();
});

// -------------------------------------------------------------
// Authentication Check
// -------------------------------------------------------------
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = '/login.html';
      return false;
    }

    currentUser = data.user;
    const navUserName = document.getElementById('navUserName');
    const navUserHeader = document.getElementById('navUserHeader');
    if (navUserName) navUserName.textContent = currentUser.fullName || currentUser.username;
    if (navUserHeader) navUserHeader.textContent = `@${currentUser.username}`;

    return true;
  } catch (err) {
    console.error('Auth verification error:', err);
    window.location.href = '/login.html';
    return false;
  }
}

// -------------------------------------------------------------
// Initialization & Events
// -------------------------------------------------------------
function initDateDefaults() {
  const monthPicker = document.getElementById('globalMonthPicker');
  const budgetMonth = document.getElementById('budgetMonth');
  const addDate = document.getElementById('addDate');
  const editDate = document.getElementById('editDate');

  const today = new Date().toISOString().slice(0, 10);
  if (monthPicker) monthPicker.value = currentMonth;
  if (budgetMonth) budgetMonth.value = currentMonth;
  if (addDate) addDate.value = today;
  if (editDate) editDate.value = today;
}

function initEventListeners() {
  // Global Month Picker change
  const monthPicker = document.getElementById('globalMonthPicker');
  if (monthPicker) {
    monthPicker.addEventListener('change', (e) => {
      currentMonth = e.target.value;
      const budgetMonth = document.getElementById('budgetMonth');
      if (budgetMonth) budgetMonth.value = currentMonth;
      refreshAllData();
    });
  }

  // Logout button
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  // Quick Demo Data Seeder Button
  const btnSeedData = document.getElementById('btnSeedData');
  if (btnSeedData) {
    btnSeedData.addEventListener('click', async () => {
      if (!confirm('This will load realistic demo transactions and budgets for your presentation. Continue?')) {
        return;
      }
      btnSeedData.disabled = true;
      btnSeedData.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading...';

      try {
        const res = await fetch('/api/seed-sample-data', { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Demo data loaded successfully!', 'success');
        await refreshAllData();
      } catch (err) {
        showToast('Failed to seed demo data.', 'danger');
      } finally {
        btnSeedData.disabled = false;
        btnSeedData.innerHTML = '<i class="bi bi-magic me-1"></i> Demo Data';
      }
    });
  }

  // Add Transaction Form
  const addForm = document.getElementById('addTransactionForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.querySelector('input[name="txType"]:checked').value;
      const title = document.getElementById('addTitle').value;
      const amount = document.getElementById('addAmount').value;
      const category = document.getElementById('addCategory').value;
      const date = document.getElementById('addDate').value;
      const notes = document.getElementById('addNotes').value;

      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title, amount, category, date, notes })
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to add transaction.', 'danger');
          return;
        }

        // Close modal and reset form
        const modalEl = document.getElementById('addTransactionModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        addForm.reset();
        initDateDefaults();

        showToast('Transaction added successfully!', 'success');
        await refreshAllData();
      } catch (err) {
        console.error('Error adding transaction:', err);
        showToast('Failed to connect to server.', 'danger');
      }
    });
  }

  // Edit Transaction Form
  const editForm = document.getElementById('editTransactionForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editTxId').value;
      const type = document.querySelector('input[name="editTxType"]:checked').value;
      const title = document.getElementById('editTitle').value;
      const amount = document.getElementById('editAmount').value;
      const category = document.getElementById('editCategory').value;
      const date = document.getElementById('editDate').value;
      const notes = document.getElementById('editNotes').value;

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title, amount, category, date, notes })
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to update transaction.', 'danger');
          return;
        }

        const modalEl = document.getElementById('editTransactionModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        showToast('Transaction updated successfully!', 'success');
        await refreshAllData();
      } catch (err) {
        console.error('Error updating transaction:', err);
        showToast('Failed to connect to server.', 'danger');
      }
    });
  }

  // Set Budget Form
  const budgetForm = document.getElementById('setBudgetForm');
  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = document.getElementById('budgetCategory').value;
      const month = document.getElementById('budgetMonth').value;
      const amount_limit = document.getElementById('budgetLimit').value;

      try {
        const res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, month, amount_limit })
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to set budget.', 'danger');
          return;
        }

        const modalEl = document.getElementById('setBudgetModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        budgetForm.reset();
        initDateDefaults();

        showToast('Budget saved successfully!', 'success');
        await refreshAllData();
      } catch (err) {
        console.error('Error setting budget:', err);
        showToast('Failed to connect to server.', 'danger');
      }
    });
  }

  // Filter Listeners in Transactions Tab
  const filterSearch = document.getElementById('filterSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterType = document.getElementById('filterType');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const btnResetFilters = document.getElementById('btnResetFilters');

  [filterSearch, filterCategory, filterType, filterStartDate, filterEndDate].forEach((el) => {
    if (el) {
      el.addEventListener('input', () => loadFullTransactions());
      el.addEventListener('change', () => loadFullTransactions());
    }
  });

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (filterSearch) filterSearch.value = '';
      if (filterCategory) filterCategory.value = 'All';
      if (filterType) filterType.value = 'All';
      if (filterStartDate) filterStartDate.value = '';
      if (filterEndDate) filterEndDate.value = '';
      loadFullTransactions();
    });
  }

  // Export CSV Buttons
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportCSVReports = document.getElementById('btnExportCSVReports');

  const triggerExport = () => {
    let url = '/api/export/csv?';
    if (filterCategory && filterCategory.value !== 'All') url += `category=${encodeURIComponent(filterCategory.value)}&`;
    if (filterType && filterType.value !== 'All') url += `type=${encodeURIComponent(filterType.value)}&`;
    if (filterStartDate && filterStartDate.value) url += `startDate=${encodeURIComponent(filterStartDate.value)}&`;
    if (filterEndDate && filterEndDate.value) url += `endDate=${encodeURIComponent(filterEndDate.value)}&`;
    window.location.href = url;
  };

  if (btnExportCSV) btnExportCSV.addEventListener('click', triggerExport);
  if (btnExportCSVReports) btnExportCSVReports.addEventListener('click', () => {
    window.location.href = '/api/export/csv';
  });

  // Switch to Transactions Tab button
  const btnViewAll = document.getElementById('btnViewAllTransactions');
  if (btnViewAll) {
    btnViewAll.addEventListener('click', () => {
      const txTab = document.getElementById('transactions-tab');
      if (txTab) {
        const tabTrigger = new bootstrap.Tab(txTab);
        tabTrigger.show();
      }
    });
  }
}

// -------------------------------------------------------------
// Master Refresh
// -------------------------------------------------------------
async function refreshAllData() {
  await Promise.all([
    loadDashboardMetrics(),
    loadFullTransactions(),
    loadBudgets(),
    loadTrendsReport()
  ]);
}

// -------------------------------------------------------------
// 1. Dashboard Metrics & Charts
// -------------------------------------------------------------
async function loadDashboardMetrics() {
  try {
    const res = await fetch(`/api/dashboard?month=${currentMonth}`);
    const data = await res.json();

    // Summary Cards
    const dashIncome = document.getElementById('dashIncome');
    const dashExpense = document.getElementById('dashExpense');
    const dashBalance = document.getElementById('dashBalance');
    const dashSavingsRate = document.getElementById('dashSavingsRate');
    const dashBalanceBadge = document.getElementById('dashBalanceBadge');

    if (dashIncome) dashIncome.textContent = `$${data.totalIncome.toFixed(2)}`;
    if (dashExpense) dashExpense.textContent = `$${data.totalExpense.toFixed(2)}`;
    if (dashBalance) dashBalance.textContent = `$${data.balance.toFixed(2)}`;
    if (dashSavingsRate) dashSavingsRate.textContent = `${data.savingsRate}%`;

    if (dashBalanceBadge) {
      if (data.balance >= 0) {
        dashBalanceBadge.className = 'badge bg-success-subtle text-success';
        dashBalanceBadge.textContent = 'Surplus Cashflow';
      } else {
        dashBalanceBadge.className = 'badge bg-danger-subtle text-danger';
        dashBalanceBadge.textContent = 'Deficit (Spending > Income)';
      }
    }

    // Lifetime values for Reports Tab
    const repLifeInc = document.getElementById('reportLifeIncome');
    const repLifeExp = document.getElementById('reportLifeExpense');
    const repLifeBal = document.getElementById('reportLifeBalance');
    if (repLifeInc) repLifeInc.textContent = `$${data.lifetimeIncome.toFixed(2)}`;
    if (repLifeExp) repLifeExp.textContent = `$${data.lifetimeExpense.toFixed(2)}`;
    if (repLifeBal) repLifeBal.textContent = `$${data.lifetimeBalance.toFixed(2)}`;

    // Render Alerts
    renderDashboardAlerts(data.alerts);

    // Render Donut Chart
    renderCategoryDonutChart(data.categoryBreakdown);

    // Render Recent 5 Transactions
    renderRecentTransactions(data.recentTransactions);

  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

// Render Dashboard Alerts
function renderDashboardAlerts(alerts) {
  const container = document.getElementById('dashboardAlertsContainer');
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = alerts
    .map(
      (a) => `
      <div class="alert-custom-${a.status} d-flex align-items-center justify-content-between mb-2">
        <div class="d-flex align-items-center gap-2">
          <i class="bi ${a.status === 'danger' ? 'bi-exclamation-triangle-fill fs-5' : 'bi-exclamation-circle-fill fs-5'}"></i>
          <div>
            <strong>${a.category} Budget Alert:</strong> ${a.message}
          </div>
        </div>
        <span class="badge ${a.status === 'danger' ? 'bg-danger' : 'bg-warning text-dark'} fs-6">${a.percentage}%</span>
      </div>
    `
    )
    .join('');
}

// Render Donut Chart (Chart.js)
function renderCategoryDonutChart(breakdown) {
  const ctx = document.getElementById('categoryDonutChart');
  const noDataEl = document.getElementById('noDataCategory');
  const chartMonthLabel = document.getElementById('chartMonthLabel');

  if (chartMonthLabel) chartMonthLabel.textContent = currentMonth;

  if (!ctx) return;

  if (!breakdown || breakdown.length === 0) {
    ctx.style.display = 'none';
    if (noDataEl) noDataEl.classList.remove('d-none');
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    return;
  }

  ctx.style.display = 'block';
  if (noDataEl) noDataEl.classList.add('d-none');

  const labels = breakdown.map((b) => b.category);
  const dataValues = breakdown.map((b) => Number(b.total));

  const palette = [
    '#f97316', '#0284c7', '#ec4899', '#8b5cf6', '#14b8a6',
    '#ef4444', '#10b981', '#eab308', '#64748b'
  ];

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 14,
            padding: 12,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.parsed || 0;
              return ` $${val.toFixed(2)}`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// Render Recent 5 Transactions
function renderRecentTransactions(list) {
  const tbody = document.getElementById('recentTransactionsTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          No transactions yet. Click <strong>Add Transaction</strong> or <strong>Demo Data</strong> to get started!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list
    .map((tx) => {
      const isExp = tx.type === 'expense';
      return `
      <tr>
        <td class="text-nowrap text-muted small">${tx.date}</td>
        <td><span class="badge-category badge-${tx.category}">${tx.category}</span></td>
        <td class="fw-medium">${escapeHtml(tx.title)}</td>
        <td>
          <span class="badge ${isExp ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}">
            ${isExp ? 'Expense' : 'Income'}
          </span>
        </td>
        <td class="text-end fw-bold ${isExp ? 'text-danger' : 'text-success'}">
          ${isExp ? '-' : '+'}$${Number(tx.amount).toFixed(2)}
        </td>
      </tr>
    `;
    })
    .join('');
}

// -------------------------------------------------------------
// 2. Full Transactions List & Filter Manager
// -------------------------------------------------------------
async function loadFullTransactions() {
  const tbody = document.getElementById('fullTransactionsTableBody');
  const countBadge = document.getElementById('transactionsCountBadge');
  if (!tbody) return;

  const search = document.getElementById('filterSearch')?.value || '';
  const category = document.getElementById('filterCategory')?.value || 'All';
  const type = document.getElementById('filterType')?.value || 'All';
  const startDate = document.getElementById('filterStartDate')?.value || '';
  const endDate = document.getElementById('filterEndDate')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'All') params.append('category', category);
  if (type && type !== 'All') params.append('type', type);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  try {
    const res = await fetch(`/api/transactions?${params.toString()}`);
    const transactions = await res.json();

    if (countBadge) {
      countBadge.textContent = `Showing ${transactions.length} record${transactions.length === 1 ? '' : 's'}`;
    }

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-2"></i>
            No transactions match the selected criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions
      .map((tx) => {
        const isExp = tx.type === 'expense';
        return `
        <tr>
          <td class="text-nowrap small text-muted">${tx.date}</td>
          <td>
            <span class="badge ${isExp ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}">
              ${isExp ? '<i class="bi bi-arrow-down-right"></i> Expense' : '<i class="bi bi-arrow-up-right"></i> Income'}
            </span>
          </td>
          <td>
            <span class="badge-category badge-${tx.category}">${tx.category}</span>
          </td>
          <td class="fw-semibold">${escapeHtml(tx.title)}</td>
          <td class="text-muted small">${escapeHtml(tx.notes || '-')}</td>
          <td class="text-end fw-bold ${isExp ? 'text-danger' : 'text-success'}">
            ${isExp ? '-' : '+'}$${Number(tx.amount).toFixed(2)}
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-secondary py-0 px-2 me-1" onclick="openEditModal(${tx.id})" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteTransaction(${tx.id})" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching transactions:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Failed to load transactions.</td></tr>`;
  }
}

// Open Edit Transaction Modal
window.openEditModal = async function (id) {
  try {
    const res = await fetch(`/api/transactions/${id}`);
    let tx = null;
    if (res.ok) {
      tx = await res.json();
    } else {
      const allRes = await fetch(`/api/transactions?id=${id}`);
      const list = await allRes.json();
      tx = list.find((t) => t.id === id);
    }

    if (!tx) {
      showToast('Transaction not found.', 'danger');
      return;
    }

    document.getElementById('editTxId').value = tx.id;
    document.getElementById('editTitle').value = tx.title;
    document.getElementById('editAmount').value = tx.amount;
    document.getElementById('editCategory').value = tx.category;
    document.getElementById('editDate').value = tx.date;
    document.getElementById('editNotes').value = tx.notes || '';

    if (tx.type === 'expense') {
      document.getElementById('editTypeExpense').checked = true;
    } else {
      document.getElementById('editTypeIncome').checked = true;
    }

    const modal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
    modal.show();
  } catch (err) {
    console.error('Error loading transaction for edit:', err);
  }
};

// Delete Transaction
window.deleteTransaction = async function (id) {
  if (!confirm('Are you sure you want to permanently delete this transaction?')) {
    return;
  }

  try {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to delete transaction.', 'danger');
      return;
    }

    showToast('Transaction deleted successfully.', 'success');
    await refreshAllData();
  } catch (err) {
    console.error('Error deleting transaction:', err);
    showToast('Failed to delete transaction.', 'danger');
  }
};

// -------------------------------------------------------------
// 3. Budgets & Alert Management
// -------------------------------------------------------------
async function loadBudgets() {
  const container = document.getElementById('budgetsListContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/budgets?month=${currentMonth}`);
    const data = await res.json();
    const budgets = data.budgets;

    if (!budgets || budgets.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-piggy-bank fs-1 d-block mb-2"></i>
          No monthly budgets configured for ${currentMonth}.
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#setBudgetModal">
              <i class="bi bi-plus-circle me-1"></i> Add Category Budget
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = budgets
      .map((b) => {
        let barColor = 'bg-success';
        let statusBadge = '<span class="badge bg-success-subtle text-success">Safe</span>';

        if (b.status === 'danger') {
          barColor = 'bg-danger';
          statusBadge = '<span class="badge bg-danger">Over Budget!</span>';
        } else if (b.status === 'warning') {
          barColor = 'bg-warning';
          statusBadge = '<span class="badge bg-warning text-dark">Warning (Near Limit)</span>';
        }

        const pct = Math.min(b.percentage, 100);

        return `
        <div class="budget-item budget-${b.status}">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="d-flex align-items-center gap-2">
              <span class="badge-category badge-${b.category}">${b.category}</span>
              ${statusBadge}
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted small">Limit: <strong>$${b.amount_limit.toFixed(2)}</strong></span>
              <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteBudget(${b.id})" title="Delete budget">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <div class="progress progress-custom">
            <div class="progress-bar ${barColor} progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${pct}%"></div>
          </div>

          <div class="d-flex justify-content-between align-items-center small text-muted">
            <span>Spent: <strong>$${b.spent.toFixed(2)}</strong> (${b.percentage}%)</span>
            <span>${b.status === 'danger' ? `<strong class="text-danger">Exceeded by $${(b.spent - b.amount_limit).toFixed(2)}</strong>` : `Remaining: <strong>$${b.remaining.toFixed(2)}</strong>`}</span>
          </div>
        </div>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching budgets:', err);
    container.innerHTML = `<div class="text-danger py-3 text-center">Failed to load budget data.</div>`;
  }
}

// Delete Budget
window.deleteBudget = async function (id) {
  if (!confirm('Remove this category budget limit?')) return;

  try {
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Budget limit removed.', 'success');
      await refreshAllData();
    }
  } catch (err) {
    console.error('Error deleting budget:', err);
  }
};

// -------------------------------------------------------------
// 4. Analytics & Trends Report (Chart.js Bar Chart & Table)
// -------------------------------------------------------------
async function loadTrendsReport() {
  try {
    const res = await fetch('/api/reports/trends');
    const trends = await res.json();

    // Render Table in Reports Tab
    const tbody = document.getElementById('trendsTableBody');
    if (tbody) {
      tbody.innerHTML = trends
        .map((t) => {
          const isProfitable = t.savings >= 0;
          return `
          <tr>
            <td class="fw-semibold">${t.label}</td>
            <td class="text-success">$${t.income.toFixed(2)}</td>
            <td class="text-danger">$${t.expense.toFixed(2)}</td>
            <td class="fw-bold ${isProfitable ? 'text-primary' : 'text-danger'}">
              ${isProfitable ? '+' : ''}$${t.savings.toFixed(2)}
            </td>
            <td>
              <span class="badge ${isProfitable ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
                ${isProfitable ? 'Surplus' : 'Deficit'}
              </span>
            </td>
          </tr>
        `;
        })
        .join('');
    }

    // Render Trend Bar Chart
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    const labels = trends.map((t) => t.label);
    const incomeData = trends.map((t) => t.income);
    const expenseData = trends.map((t) => t.expense);

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: $${Number(c.raw).toFixed(2)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error loading trends report:', err);
  }
}

// -------------------------------------------------------------
// Toast Helper
// -------------------------------------------------------------
function showToast(message, type = 'primary') {
  const toastEl = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toastEl || !msgEl) return;

  toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
  msgEl.textContent = message;

  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}

// HTML Escaper for security
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
