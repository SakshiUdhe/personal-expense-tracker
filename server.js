const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form submissions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: 'expense-tracker-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Friendly page route shortcuts
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication guard middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// Register a new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, full_name, password } = req.body;

    if (!username || !full_name || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const trimmedUser = username.trim().toLowerCase();
    const trimmedName = full_name.trim();

    if (trimmedUser.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const checkUser = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmedUser);
    if (checkUser) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);

    const insertStmt = db.prepare(`
      INSERT INTO users (username, full_name, password_hash)
      VALUES (?, ?, ?)
    `);
    const result = insertStmt.run(trimmedUser, trimmedName, password_hash);

    const newUserId = Number(result.lastInsertRowid);
    req.session.userId = newUserId;
    req.session.username = trimmedUser;
    req.session.fullName = trimmedName;

    return res.status(201).json({
      message: 'Registration successful!',
      user: {
        id: newUserId,
        username: trimmedUser,
        fullName: trimmedName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register user. Please try again.' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const trimmedUser = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmedUser);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;

    return res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// Get current session user
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        fullName: req.session.fullName
      }
    });
  }
  return res.json({ loggedIn: false });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully.' });
  });
});

// -------------------------------------------------------------
// Transactions Endpoints
// -------------------------------------------------------------

// Get transactions with filtering (search, category, type, date range, id)
app.get('/api/transactions', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { id, search, category, type, startDate, endDate, month } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (id) {
      query += ' AND id = ?';
      params.push(parseInt(id, 10));
    }

    if (search && search.trim()) {
      query += ' AND (title LIKE ? OR notes LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (type && (type === 'income' || type === 'expense')) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      params.push(month);
    }

    query += ' ORDER BY date DESC, id DESC';

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// Get a single transaction by ID
app.get('/api/transactions/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const txId = parseInt(req.params.id, 10);
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(txId, userId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    res.json(tx);
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve transaction.' });
  }
});

// Add a new transaction
app.post('/api/transactions', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, amount, type, category, date, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Transaction title is required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "income" or "expense".' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    if (!date || !date.trim()) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO transactions (user_id, title, amount, type, category, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      userId,
      title.trim(),
      parsedAmount,
      type,
      category.trim(),
      date.trim(),
      notes ? notes.trim() : ''
    );

    const createdTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({
      message: 'Transaction added successfully!',
      transaction: createdTx
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction.' });
  }
});

// Update an existing transaction
app.put('/api/transactions/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const txId = parseInt(req.params.id, 10);
    const { title, amount, type, category, date, notes } = req.body;

    const existingTx = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(txId, userId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Transaction title is required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "income" or "expense".' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    if (!date || !date.trim()) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const updateStmt = db.prepare(`
      UPDATE transactions
      SET title = ?, amount = ?, type = ?, category = ?, date = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);

    updateStmt.run(
      title.trim(),
      parsedAmount,
      type,
      category.trim(),
      date.trim(),
      notes ? notes.trim() : '',
      txId,
      userId
    );

    const updatedTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
    return res.json({
      message: 'Transaction updated successfully!',
      transaction: updatedTx
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const txId = parseInt(req.params.id, 10);

    const existingTx = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(txId, userId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized.' });
    }

    db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(txId, userId);
    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

// -------------------------------------------------------------
// Budgets & Alerts Endpoints
// -------------------------------------------------------------

// Get monthly budgets with current spending & alert status
app.get('/api/budgets', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const currentMonth = req.query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Fetch user budgets for the specified month
    const budgets = db.prepare(`
      SELECT * FROM budgets
      WHERE user_id = ? AND month = ?
      ORDER BY category ASC
    `).all(userId, currentMonth);

    // Calculate actual spending for each category in this month
    const expensesByCategory = db.prepare(`
      SELECT category, SUM(amount) AS total_spent
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?
      GROUP BY category
    `).all(userId, currentMonth);

    const spendingMap = {};
    for (const exp of expensesByCategory) {
      spendingMap[exp.category] = Number(exp.total_spent);
    }

    const budgetStatusList = budgets.map((b) => {
      const spent = spendingMap[b.category] || 0;
      const limit = Number(b.amount_limit);
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'safe'; // Green: < 80%
      let alertMessage = 'Spending within safe limit.';

      if (percentage >= 100) {
        status = 'danger'; // Red: >= 100%
        alertMessage = `Budget exceeded by $${(spent - limit).toFixed(2)} (${percentage}%)!`;
      } else if (percentage >= 80) {
        status = 'warning'; // Yellow: 80% to 99%
        alertMessage = `Warning: ${percentage}% of budget used. Only $${remaining.toFixed(2)} left.`;
      }

      return {
        id: b.id,
        category: b.category,
        month: b.month,
        amount_limit: limit,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        status: status,
        alertMessage: alertMessage
      };
    });

    res.json({
      month: currentMonth,
      budgets: budgetStatusList
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets.' });
  }
});

// Set or update a monthly budget
app.post('/api/budgets', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { category, month, amount_limit } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month.trim())) {
      return res.status(400).json({ error: 'Valid month (YYYY-MM) is required.' });
    }

    const limit = parseFloat(amount_limit);
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Budget limit must be greater than zero.' });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO budgets (user_id, category, month, amount_limit)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, category, month)
      DO UPDATE SET amount_limit = excluded.amount_limit
    `);

    upsertStmt.run(userId, category.trim(), month.trim(), limit);

    return res.status(200).json({ message: 'Budget set successfully!' });
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({ error: 'Failed to set budget.' });
  }
});

// Delete a budget
app.delete('/api/budgets/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const budgetId = parseInt(req.params.id, 10);

    db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(budgetId, userId);
    return res.json({ message: 'Budget deleted successfully.' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

// -------------------------------------------------------------
// Dashboard & Analytics Endpoints
// -------------------------------------------------------------

// Dashboard summary data (totals, category breakdown, active alerts)
app.get('/api/dashboard', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const currentMonth = req.query.month || new Date().toISOString().slice(0, 7);

    // Total income and expenses for selected month
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `).get(userId, currentMonth);

    // Lifetime totals
    const lifetimeTotals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS lifetime_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS lifetime_expense
      FROM transactions
      WHERE user_id = ?
    `).get(userId);

    const totalIncome = Number(totals.total_income);
    const totalExpense = Number(totals.total_expense);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    // Category breakdown for expenses in this month (for Pie/Donut Chart)
    const categoryBreakdown = db.prepare(`
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(userId, currentMonth);

    // Recent 5 transactions
    const recentTransactions = db.prepare(`
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY date DESC, id DESC
      LIMIT 5
    `).all(userId);

    // Check budget alerts
    const budgets = db.prepare(`
      SELECT * FROM budgets
      WHERE user_id = ? AND month = ?
    `).all(userId, currentMonth);

    const alerts = [];
    for (const b of budgets) {
      const match = categoryBreakdown.find((c) => c.category === b.category);
      const spent = match ? Number(match.total) : 0;
      const limit = Number(b.amount_limit);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      if (pct >= 100) {
        alerts.push({
          category: b.category,
          status: 'danger',
          limit: limit,
          spent: spent,
          percentage: pct,
          message: `🚨 Over budget in ${b.category}! Spent $${spent.toFixed(2)} of $${limit.toFixed(2)} limit (${pct}%).`
        });
      } else if (pct >= 80) {
        alerts.push({
          category: b.category,
          status: 'warning',
          limit: limit,
          spent: spent,
          percentage: pct,
          message: `⚠️ High spending in ${b.category}: ${pct}% of $${limit.toFixed(2)} budget reached ($${(limit - spent).toFixed(2)} remaining).`
        });
      }
    }

    res.json({
      month: currentMonth,
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      lifetimeIncome: Number(lifetimeTotals.lifetime_income),
      lifetimeExpense: Number(lifetimeTotals.lifetime_expense),
      lifetimeBalance: Number(lifetimeTotals.lifetime_income) - Number(lifetimeTotals.lifetime_expense),
      categoryBreakdown,
      recentTransactions,
      alerts
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

// 6-Month Income vs Expense Trend for Chart
app.get('/api/reports/trends', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;

    // Get last 6 calendar months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const trends = months.map((m) => {
      const row = db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
        FROM transactions
        WHERE user_id = ? AND strftime('%Y-%m', date) = ?
      `).get(userId, m);

      // Month label like "Jan 2025"
      const [year, mon] = m.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[parseInt(mon, 10) - 1]} ${year}`;

      return {
        month: m,
        label: label,
        income: Number(row.income),
        expense: Number(row.expense),
        savings: Number(row.income) - Number(row.expense)
      };
    });

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to retrieve trend reports.' });
  }
});

// CSV Export Endpoint
app.get('/api/export/csv', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { category, type, startDate, endDate, month } = req.query;

    let query = 'SELECT date, type, category, title, amount, notes FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (type && (type === 'income' || type === 'expense')) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    if (month) {
      query += ' AND strftime("%Y-%m", date) = ?';
      params.push(month);
    }

    query += ' ORDER BY date DESC, id DESC';

    const transactions = db.prepare(query).all(...params);

    // Generate CSV content
    const csvRows = [];
    csvRows.push(['ID', 'Date', 'Type', 'Category', 'Title', 'Amount ($)', 'Notes'].join(','));

    transactions.forEach((tx, index) => {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      csvRows.push([
        index + 1,
        escape(tx.date),
        escape(tx.type.toUpperCase()),
        escape(tx.category),
        escape(tx.title),
        Number(tx.amount).toFixed(2),
        escape(tx.notes || '')
      ].join(','));
    });

    const csvData = csvRows.join('\r\n');
    const filename = `expense_tracker_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export transactions to CSV.' });
  }
});

// -------------------------------------------------------------
// Sample Data Seeder (Perfect for presentation and demonstration)
// -------------------------------------------------------------
app.post('/api/seed-sample-data', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const day = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${currentMonth}-${pad(d)}`;
    };

    // Delete existing records for fresh demo state
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);

    const sampleTransactions = [
      { title: 'College Part-time Job', amount: 1400.0, type: 'income', category: 'Salary', date: day(1), notes: 'Bi-weekly campus stipend' },
      { title: 'Freelance Web Design', amount: 650.0, type: 'income', category: 'Freelance', date: day(5), notes: 'Client logo & UI work' },
      { title: 'Semester Textbooks & Supplies', amount: 185.5, type: 'expense', category: 'Education', date: day(2), notes: 'Algorithms and DB books' },
      { title: 'Campus Cafeteria & Snacks', amount: 48.0, type: 'expense', category: 'Food', date: day(3), notes: 'Weekly cafeteria card reload' },
      { title: 'Grocery Supermarket Run', amount: 135.25, type: 'expense', category: 'Food', date: day(4), notes: 'Fruits, milk, bread, cereal' },
      { title: 'Monthly Metro & Bus Pass', amount: 75.0, type: 'expense', category: 'Travel', date: day(6), notes: 'Public transit card' },
      { title: 'Apartment Wi-Fi & Mobile Bill', amount: 85.0, type: 'expense', category: 'Bills', date: day(7), notes: 'Split 50% with roommate' },
      { title: 'Electric & Utility Bill', amount: 65.0, type: 'expense', category: 'Bills', date: day(8), notes: 'Power & water' },
      { title: 'Online Learning Platform Subscription', amount: 30.0, type: 'expense', category: 'Education', date: day(10), notes: 'Coursera / Udemy' },
      { title: 'Weekend Outing with Friends', amount: 72.0, type: 'expense', category: 'Food', date: day(12), notes: 'Dinner and pizza' },
      { title: 'New Running Shoes & T-Shirt', amount: 120.0, type: 'expense', category: 'Shopping', date: day(14), notes: 'Weekend discount sale' },
      { title: 'Ride share / Uber to Exam Hall', amount: 24.5, type: 'expense', category: 'Travel', date: day(15), notes: 'Exam morning commute' }
    ];

    const insertTx = db.prepare(`
      INSERT INTO transactions (user_id, title, amount, type, category, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tx of sampleTransactions) {
      insertTx.run(userId, tx.title, tx.amount, tx.type, tx.category, tx.date, tx.notes);
    }

    // Set sample budgets to demonstrate alerts
    const sampleBudgets = [
      { category: 'Food', limit: 250.0 },       // Spent: ~255 -> 102% => RED ALERT (Over budget)
      { category: 'Education', limit: 250.0 },  // Spent: 215.5 -> 86% => YELLOW ALERT (Warning)
      { category: 'Travel', limit: 150.0 },     // Spent: ~99.5 -> 66% => GREEN (Safe)
      { category: 'Shopping', limit: 150.0 },   // Spent: 120.0 -> 80% => YELLOW ALERT
      { category: 'Bills', limit: 200.0 }       // Spent: 150.0 -> 75% => GREEN (Safe)
    ];

    const insertBudget = db.prepare(`
      INSERT INTO budgets (user_id, category, month, amount_limit)
      VALUES (?, ?, ?, ?)
    `);

    for (const b of sampleBudgets) {
      insertBudget.run(userId, b.category, currentMonth, b.limit);
    }

    return res.json({
      message: 'Sample demo data seeded successfully with realistic income, expenses, and budget alerts!'
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    res.status(500).json({ error: 'Failed to seed sample data.' });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Personal Expense Tracker & Budget Management System`);
  console.log(` Running locally at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

module.exports = { app, server };
