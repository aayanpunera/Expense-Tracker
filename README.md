# SpendWise — Personal Expense & Finance Tracker

SpendWise is a full-stack personal finance and expense tracking web application built with **Python (Flask)**, **SQLite**, and a modern, responsive design system. It enables effortless logging of daily expenditures and deposits, automated recurring schedules, monthly category budget tracking with visual health meters, long-term savings goals, interactive Chart.js analytics, and automated PDF & CSV export generation.

---

## Key Features

### 1. Fast & Effortless Expense Insertion
- **Express Dashboard Inserter**: Log any spend directly from your overview homepage in a single click with preset quick-amounts (+₹50, +₹100, +₹200, +₹500, +₹1,000).
- **Global Quick-Add Modal**: Hit `+ Quick Add` or press the keyboard shortcut **`N`** anywhere in the application to immediately log an expense without navigating away.
- **Dedicated Transaction Studio**: Comprehensive form with expense/income toggle, amount inputs, date selection, categorized icons, payment methods, and notes.

### 2. Comprehensive Financial Tracking & Record Management
- **Dashboard Command Center**:
  - Live Net Balance, Monthly Expenses, Monthly Income, and Savings Rate percentage.
  - Average Daily Spend metric and top spending category detection.
  - Recent transactions list with color-coded amount badges (`+` income, `−` expense).
  - Upcoming recurring bill alerts due within the next 14 days.
- **Transactions Ledger**:
  - Real-time search across titles and notes.
  - Multi-criteria filtering by Type (Income/Expense), Category, Payment Method, Date Range, and Amount Range.
  - Dynamic sort order (Newest, Oldest, Highest, Lowest, Title).
  - Summary metrics bar showing filtered totals, income, expenses, and net cash flow.
  - Edit and delete records with safety confirmation dialogs.
- **Monthly Category Budgets**:
  - Set customized spending limits for each category (Food, Travel, Bills, Shopping, etc.).
  - Visual status progress bars with dynamic color transitions (Safe Green &lt; 75%, Warning Amber 75–99%, Over-Budget Red &ge; 100%).
  - Remaining buffer and over-budget calculations.
- **Savings Goals**:
  - Track progress toward savings milestones (Emergency Fund, Vacation, Gadgets).
  - Milestone countdown, percentage completion, and one-click deposit/contribution forms.
- **Recurring Transactions & Subscriptions**:
  - Automates repeat expenses (Rent, Netflix, Gym, EMIs, Broadband) on weekly or monthly schedules.
  - Auto-records entries when their due date arrives.
  - Active and Paused status toggles.
- **Visual Insights & Reports**:
  - Interactive Doughnut Chart showing spending distribution across categories.
  - Grouped Bar Chart comparing monthly Income vs Expenses.
  - Payment Method breakdown chart (UPI, Cards, Cash, Bank Transfer).
  - Category ranking table with exact percentage shares of total outflow.

### 3. Exports, Backups & Tools
- **PDF Statements**: Formatted statement generation via ReportLab including summary statistics and ledger tables.
- **CSV Ledger Export**: Standard spreadsheet-compatible transaction history export.
- **JSON Backup & Restore**: One-click full data export for portability and safety.
- **Demo Data Seeder**: Built-in 1-click sample data generator in Settings to quickly preview charts and analytics.

### 4. Modern UI & Aesthetics
- Responsive dual-theme design system (**Light Mode** and **Dark Mode**) with instant switching.
- Refined typography using *Plus Jakarta Sans* and *Inter*.
- Clean card elevations, smooth micro-interactions, and mobile-friendly navigation.
- Multi-currency support (₹ INR, $ USD, € EUR, £ GBP, A$ AUD, C$ CAD, ¥ JPY, AED).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.10+, Flask 3.0+ |
| **Database** | SQLite3 (thread-local with foreign keys enabled) |
| **Document Generation** | ReportLab 4.0+ (PDF statements), Python `csv` |
| **Frontend UI** | Modern HTML5, Vanilla CSS3 (Custom Properties & Responsive Grid), Vanilla JavaScript |
| **Charts & Visualization** | Chart.js 4.4+ |
| **Authentication** | Werkzeug Security (Scrypt password hashing), Session-based auth |

---

## Quick Start & Installation

### 1. Clone & Enter Project Directory
```powershell
git clone https://github.com/aayanpunera/Expense-Tracker.git
cd "Expense-Tracker"
```

### 2. Set Up Python Virtual Environment
```powershell
# Create virtual environment
python -m venv .venv

# Activate on Windows PowerShell
.\.venv\Scripts\Activate.ps1

# (Or on Command Prompt: .\.venv\Scripts\activate.bat)
# (Or on macOS/Linux: source .venv/bin/activate)
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Run the Application
```powershell
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000
```
- Sign up for a new account or sign in to start tracking your finances!
- You can also go to **Settings** and click **"Load Sample Data Pack"** to populate realistic preview records immediately.

---

## Project Structure

```
Expense Tracker/
├── .gitignore              # Ignores .venv, cache, and local databases
├── app.py                  # Core Flask application, DB models, API & controllers
├── expenses.db             # Local SQLite database (auto-generated on launch)
├── requirements.txt        # Python package dependencies
├── README.md               # Project documentation
├── static/
│   ├── css/
│   │   └── style.css       # Full design system (Light & Dark themes, responsive layout)
│   └── js/
│       ├── app.js          # Theme switcher, modals, keyboard shortcuts, toasts
│       └── reports.js      # Chart.js analytics visualizations
└── templates/
    ├── base.html           # Master layout, navigation sidebar, quick-add modal
    ├── auth.html           # Authentication card (Login / Register)
    ├── dashboard.html      # Overview cockpit, express inserter, KPI cards
    ├── transactions.html   # Full filterable ledger, CSV/PDF actions
    ├── transaction_form.html # Dedicated add/edit transaction form
    ├── budgets.html        # Category budget limits and health meters
    ├── goals.html          # Savings milestones with progress trackers
    ├── recurring.html      # Subscriptions and recurring bills
    ├── reports.html        # Visual analytics, charts, and breakdown tables
    └── settings.html       # Profile preferences, currency, and data backups
```

---

## Git Workflow & Remote Repository Sync

Your local repository is connected to GitHub at:
`https://github.com/aayanpunera/Expense-Tracker.git` (tracking branch: `origin/main`).

### How to update and push changes to GitHub:

Whenever you make improvements or updates to your project, run:

```powershell
# 1. Check status of modified files
git status

# 2. Stage changes (excluding ignored .venv and local databases)
git add .

# 3. Commit with a descriptive message
git commit -m "feat: description of your updates"

# 4. Push to GitHub
git push origin main
```

To fetch any remote changes:
```powershell
git pull origin main
```
