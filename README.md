# Personal Expense Tracker and Budget Management System
### College Field Project Report & Documentation

A modern, responsive, and secure full-stack web application designed for personal financial management, expense tracking, monthly budgeting, and analytics.

---

## 🌟 Key Features

1. **Executive Financial Dashboard**
   - Real-time KPI summary cards: **Total Income**, **Total Expenses**, **Net Balance**, and **Savings Rate %**.
   - Automatic cashflow status indicators (*Surplus* vs. *Deficit*).
   - Instant budget alert banners for categories reaching critical spending thresholds.

2. **Transaction Management (CRUD)**
   - **Add**: Create income or expense transactions with amount, date, category, and notes.
   - **Edit**: Modify existing transactions anytime via a modal.
   - **Delete**: Remove transactions with permanent database cleanup.
   - **Multi-Category Support**: Pre-configured categories including *Food*, *Travel*, *Shopping*, *Education*, *Bills*, *Healthcare*, *Salary*, *Freelance*, and *Other*.

3. **Monthly Budgeting & Alert Engine**
   - Set monthly spending limits per category.
   - Real-time progress bars with dynamic color-coding:
     - 🟢 **Safe (< 80%)**: Healthy spending pace.
     - 🟡 **Warning (80% - 99%)**: Approaching maximum threshold.
     - 🔴 **Danger (≥ 100%)**: Over budget alert with exact overspend amount.

4. **Interactive Visual Analytics**
   - **Expenses by Category**: Interactive Doughnut chart (Chart.js) showing percentage breakdown.
   - **Cashflow Trends**: 6-Month Income vs. Expense comparative bar chart.
   - Lifetime financial overview statistics.

5. **Search, Filter & CSV Export**
   - Live real-time search across transaction titles and notes.
   - Filter by **Category**, **Transaction Type** (Income/Expense), and custom **Date Ranges**.
   - **1-Click CSV Export**: Downloads formatted financial records compatible with Microsoft Excel and Google Sheets.

6. **Authentication & Multi-User Security**
   - User registration and login portal.
   - Industry-standard password hashing using **Bcrypt** (`bcryptjs`).
   - Secure HTTP session management with cookies (`express-session`).
   - Individual user data isolation (each user only sees their own transactions and budgets).

7. **Permanent SQLite Database**
   - Built-in zero-configuration SQLite database (`expenses.db`).
   - All transactions, budgets, and users persist permanently across system restarts.

8. **Presentation-Ready Demo Seeder**
   - Built-in **"Demo Data"** button to instantly populate realistic student transactions and budget alerts for college presentations.

---

## 💻 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js (v24 LTS) | Fast, modern JavaScript runtime already installed on Windows. |
| **Backend** | Express.js | Standard, lightweight web application framework. |
| **Database** | SQLite (`expenses.db`) | Zero-configuration file database; no external database server setup required. |
| **Security** | Bcrypt.js & Express-Session | Pure JavaScript secure password encryption and session management. |
| **Frontend** | HTML5, Bootstrap 5, Bootstrap Icons | Clean, responsive, mobile-friendly interface. |
| **Data Viz** | Chart.js | Hardware-accelerated, responsive charts for reports. |

---

## 📁 Project Structure

```text
ExpenseTracker/
├── database.js          # SQLite database connection and table schema creation
├── server.js            # Express server, authentication middleware, and REST API routes
├── package.json         # Project metadata and dependencies
├── start.bat            # 1-Click Windows launcher script
├── expenses.db          # Persistent SQLite database file (created automatically)
├── public/              # Frontend web application
│   ├── index.html       # Main application dashboard, tabs, and modals
│   ├── login.html       # User authentication portal (Login & Register)
│   ├── css/
│   │   └── style.css    # Custom responsive styling and theme variables
│   └── js/
│       ├── app.js       # Client dashboard, transactions CRUD, Chart.js, and CSV export
│       └── auth.js      # Client authentication handling
└── test/
    └── test_app.js      # Automated test suite (16 comprehensive test cases)
```

---

## 🚀 How to Run the Application (Windows)

### Method 1: 1-Click Launcher (Easiest for Beginners)
1. Open your project folder: `c:\Users\udhes\OneDrive\Desktop\ExpenseTracker`
2. **Double-click** the file named **`start.bat`**.
3. It will automatically launch the server and open the application in your default browser at `http://localhost:3000`.

---

### Method 2: Using the Command Prompt / PowerShell
1. Open **Command Prompt** or **PowerShell**.
2. Navigate to the project directory:
   ```powershell
   cd c:\Users\udhes\OneDrive\Desktop\ExpenseTracker
   ```
3. Start the application:
   ```powershell
   npm start
   ```
   *(Or alternatively: `node server.js`)*
4. Open your web browser and go to:
   ```text
   http://localhost:3000
   ```

---

## 🎓 College Viva & Demo Guide

1. **Sign In**:
   - Go to `http://localhost:3000/login`.
   - Click the **"Quick Demo Sign-in"** button (or create a custom account).
2. **Load Demo Data**:
   - Click the yellow **"Demo Data"** button in the top navigation bar.
   - Notice the instant population of:
     - Income ($2,050.00) vs Expenses.
     - Budget alert banners (e.g., *Food Budget Exceeded* and *Education Warning*).
     - Category donut chart and monthly cash flow bar chart.
3. **Add a Transaction**:
   - Click **"Add Transaction"**.
   - Enter a title (e.g., *College Library Books*), amount (e.g., *45.00*), choose category *Education*, and click **Save**.
   - Notice the dashboard totals update instantly.
4. **Test Filtering & CSV Export**:
   - Switch to the **Transactions** tab.
   - Type in the search bar or select category *Food*.
   - Click **"Export to CSV"** to download the spreadsheet file.
5. **Budget Control**:
   - Switch to the **Monthly Budgets** tab.
   - Observe the green, yellow, and red progress bars illustrating budget adherence.

---

## 🧪 Automated Testing

To run the automated test suite verifying all 16 test cases:
```powershell
npm test
```
All 16 test cases test authentication, transaction CRUD, budget alert logic, reporting endpoints, and database persistence.
