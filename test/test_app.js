// Automated Verification Test Suite
// Personal Expense Tracker & Budget Management System
const assert = require('assert');
const http = require('http');
const { app, server } = require('../server');
const { db } = require('../database');

let cookie = '';
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    if (cookie) {
      reqHeaders['Cookie'] = cookie;
    }
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        if (res.headers['set-cookie']) {
          const rawCookies = res.headers['set-cookie'];
          cookie = rawCookies.map((c) => c.split(';')[0]).join('; ');
        }
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting Automated Test Suite: Expense Tracker');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(` ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(` ❌ FAIL: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  const testUser = {
    username: 'teststudent_' + Date.now(),
    full_name: 'Test Student User',
    password: 'securePassword123'
  };

  let createdTxId = null;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  // 1. User Registration
  await test('1. User Registration with valid credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/register', testUser);
    assert.strictEqual(res.status, 201, `Expected status 201, got ${res.status}`);
    assert.strictEqual(res.body.user.username, testUser.username);
  });

  // 2. Reject duplicate registration
  await test('2. Duplicate username registration rejected', async () => {
    const res = await makeRequest('POST', '/api/auth/register', testUser);
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('taken'));
  });

  // 3. User Login
  await test('3. User Login with valid credentials', async () => {
    cookie = ''; // Clear cookie
    const res = await makeRequest('POST', '/api/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    assert.strictEqual(res.status, 200);
    assert(cookie.includes('connect.sid'), 'Expected session cookie');
  });

  // 4. Reject invalid login
  await test('4. Reject invalid login password', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      username: testUser.username,
      password: 'wrongPassword'
    });
    assert.strictEqual(res.status, 401);
  });

  // 5. Session me verification
  await test('5. Authenticated session check (/api/auth/me)', async () => {
    // Re-login
    await makeRequest('POST', '/api/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    const res = await makeRequest('GET', '/api/auth/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.loggedIn, true);
    assert.strictEqual(res.body.user.username, testUser.username);
  });

  // 6. Add Income Transaction
  await test('6. Add Income Transaction (Salary)', async () => {
    const res = await makeRequest('POST', '/api/transactions', {
      title: 'College Tutor Stipend',
      amount: 1500.0,
      type: 'income',
      category: 'Salary',
      date: today,
      notes: 'Monthly tutoring income'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.transaction.title, 'College Tutor Stipend');
    assert.strictEqual(res.body.transaction.amount, 1500.0);
  });

  // 7. Add Expense Transaction (Food)
  await test('7. Add Expense Transaction (Food)', async () => {
    const res = await makeRequest('POST', '/api/transactions', {
      title: 'Supermarket Groceries',
      amount: 85.5,
      type: 'expense',
      category: 'Food',
      date: today,
      notes: 'Weekly pantry shopping'
    });
    assert.strictEqual(res.status, 201);
    createdTxId = res.body.transaction.id;
    assert.ok(createdTxId > 0);
  });

  // 8. Add Other Category Expenses (Travel, Education, Bills, Shopping)
  await test('8. Add Diverse Category Expenses (Travel, Education, Bills, Shopping)', async () => {
    const expenses = [
      { title: 'Subway Pass', amount: 45.0, type: 'expense', category: 'Travel', date: today },
      { title: 'Computer Science Book', amount: 120.0, type: 'expense', category: 'Education', date: today },
      { title: 'Dorm Internet Bill', amount: 50.0, type: 'expense', category: 'Bills', date: today },
      { title: 'Winter Jacket', amount: 95.0, type: 'expense', category: 'Shopping', date: today }
    ];

    for (const exp of expenses) {
      const res = await makeRequest('POST', '/api/transactions', exp);
      assert.strictEqual(res.status, 201);
    }
  });

  // 9. Fetch Transactions with Search & Category Filter
  await test('9. Search and Filter Transactions', async () => {
    const searchRes = await makeRequest('GET', '/api/transactions?search=Groceries');
    assert.strictEqual(searchRes.status, 200);
    assert(searchRes.body.length >= 1);
    assert.strictEqual(searchRes.body[0].category, 'Food');

    const catRes = await makeRequest('GET', '/api/transactions?category=Education');
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catRes.body[0].title, 'Computer Science Book');
  });

  // 10. Edit Transaction
  await test('10. Edit Transaction details', async () => {
    const res = await makeRequest('PUT', `/api/transactions/${createdTxId}`, {
      title: 'Supermarket Groceries & Fruits',
      amount: 95.0,
      type: 'expense',
      category: 'Food',
      date: today,
      notes: 'Updated total with fruits'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.transaction.title, 'Supermarket Groceries & Fruits');
    assert.strictEqual(res.body.transaction.amount, 95.0);
  });

  // 11. Set Monthly Budgets and Test Alert Triggers
  await test('11. Set Monthly Budgets & Validate Alert Statuses (Safe, Warning, Danger)', async () => {
    // Food spending is currently $95.00
    // Limit = $100 -> Spent 95% -> should trigger 'warning' (>=80%)
    await makeRequest('POST', '/api/budgets', {
      category: 'Food',
      month: currentMonth,
      amount_limit: 100.0
    });

    // Education spending is currently $120.00
    // Limit = $100 -> Spent 120% -> should trigger 'danger' (>=100%)
    await makeRequest('POST', '/api/budgets', {
      category: 'Education',
      month: currentMonth,
      amount_limit: 100.0
    });

    // Travel spending is currently $45.00
    // Limit = $100 -> Spent 45% -> should be 'safe' (<80%)
    await makeRequest('POST', '/api/budgets', {
      category: 'Travel',
      month: currentMonth,
      amount_limit: 100.0
    });

    const budgetRes = await makeRequest('GET', `/api/budgets?month=${currentMonth}`);
    assert.strictEqual(budgetRes.status, 200);

    const foodBudget = budgetRes.body.budgets.find((b) => b.category === 'Food');
    const eduBudget = budgetRes.body.budgets.find((b) => b.category === 'Education');
    const travelBudget = budgetRes.body.budgets.find((b) => b.category === 'Travel');

    assert.strictEqual(foodBudget.status, 'warning', `Expected Food to be warning, got ${foodBudget.status}`);
    assert.strictEqual(eduBudget.status, 'danger', `Expected Education to be danger, got ${eduBudget.status}`);
    assert.strictEqual(travelBudget.status, 'safe', `Expected Travel to be safe, got ${travelBudget.status}`);
  });

  // 12. Dashboard Metrics and Alert Banners
  await test('12. Verify Dashboard Calculations & Alert Notifications', async () => {
    const res = await makeRequest('GET', `/api/dashboard?month=${currentMonth}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalIncome, 1500.0);
    assert(res.body.totalExpense > 0);
    assert(res.body.balance === res.body.totalIncome - res.body.totalExpense);
    assert(res.body.alerts.length >= 2, 'Expected at least 2 budget alerts (Food & Education)');
  });

  // 13. Trend Chart Data
  await test('13. 6-Month Trend Data Endpoint', async () => {
    const res = await makeRequest('GET', '/api/reports/trends');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 6, 'Should return exactly 6 months of data');
  });

  // 14. CSV Export
  await test('14. CSV Export Format & Headers', async () => {
    const res = await makeRequest('GET', '/api/export/csv');
    assert.strictEqual(res.status, 200);
    assert(res.headers['content-type'].includes('text/csv'));
    assert(res.body.includes('ID,Date,Type,Category,Title,Amount ($),Notes'));
    assert(res.body.includes('College Tutor Stipend'));
  });

  // 15. Delete Transaction
  await test('15. Delete Transaction permanently', async () => {
    const res = await makeRequest('DELETE', `/api/transactions/${createdTxId}`);
    assert.strictEqual(res.status, 200);

    const verify = await makeRequest('GET', `/api/transactions?search=Groceries%20%26%20Fruits`);
    assert.strictEqual(verify.body.length, 0);
  });

  // 16. Permanent Database File Verification
  await test('16. Verify SQLite Database File on Disk', async () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get(testUser.username);
    assert.strictEqual(row.count, 1, 'User persisted in SQLite database file');
  });

  console.log('\n====================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  // Close server and exit with proper code
  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
