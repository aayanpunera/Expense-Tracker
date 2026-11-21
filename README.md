# SpendWise — Personal Expense & Finance Tracker

SpendWise is a dynamic, full-stack personal finance application structured with dedicated **`frontend`** (React + Vite) and **`backend`** (Python + Flask REST API) architectures. It delivers instant expense insertion, automated recurring bills, category budget monitoring with health meters, milestones savings tracking, Chart.js analytics, and formatted statement exports (PDF & CSV).

---

## Architecture Overview

```
Expense Tracker/
├── backend/                   # Python / Flask REST API
│   ├── app.py                 # REST API endpoints, models & ReportLab PDF generator
│   ├── expenses.db            # Local SQLite database
│   └── requirements.txt       # Backend dependencies (Flask, Flask-CORS, ReportLab)
│
├── frontend/                  # React Multi-Page Application (React Router + Vite)
│   ├── package.json           # Dependencies (React 19, React Router 7, Lucide React, Chart.js)
│   ├── vite.config.js         # Vite configuration with /api proxy to backend
│   ├── src/
│   │   ├── api.js             # Centralized API service for backend communication
│   │   ├── App.jsx            # Multi-page BrowserRouter routes with protected Layout wrapper
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Token authentication & session state
│   │   │   ├── ThemeContext.jsx # Dark / Light mode toggle
│   │   │   └── ToastContext.jsx # Reactive notifications
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Shared layout shell with Outlet, Sidebar & Topbar
│   │   │   ├── Sidebar.jsx    # Responsive navigation sidebar with NavLink routes
│   │   │   ├── Topbar.jsx     # Navigation header with + Quick Add trigger & dynamic page title
│   │   │   └── QuickAddModal.jsx # Global fast expense inserter (Press 'N')
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Route `/` — Command center with 4 KPIs, AI Insight banner & Express Inserter
│   │       ├── Transactions.jsx     # Route `/transactions` — Ledger with search, multi-filters, CSV/PDF & OCR trigger
│   │       ├── NewTransaction.jsx   # Route `/transactions/new` — Dedicated insertion page with auto-fill from scanned receipts
│   │       ├── EditTransaction.jsx  # Route `/transactions/:id/edit` — Dedicated edit page with live DB sync
│   │       ├── Budgets.jsx          # Route `/budgets` — Category limits & health progress bars
│   │       ├── Goals.jsx            # Route `/goals` — Savings milestones & one-click deposits
│   │       ├── Recurring.jsx        # Route `/recurring` — Subscriptions with active/paused controls
│   │       ├── Groups.jsx           # Route `/groups` — Split bills & multi-member group expense dashboard
│   │       ├── GroupDetail.jsx      # Route `/groups/:id` — Group ledger with automated debt simplification & settlements
│   │       ├── Advisor.jsx          # Route `/advisor` — AI Financial Advisor chat, 50/30/20 check & burn rate runway
│   │       ├── Reports.jsx          # Route `/reports` — Category doughnut & cash flow charts
│   │       ├── Settings.jsx         # Route `/settings` — Currencies (₹, $, €, £), themes & DB backups
│   │       ├── Login.jsx            # Route `/login` — Dedicated sign-in page
│   │       └── Register.jsx         # Route `/register` — Dedicated user creation page
│   ├── public/
│   │   ├── manifest.webmanifest     # Progressive Web App manifest
│   │   └── sw.js                    # PWA Service Worker for offline caching & fast asset loading
│   └── dist/                  # Production build output
│
├── app.py                     # Root runner (serves backend & React build on port 5000)
├── requirements.txt           # Root dependencies
└── .gitignore                 # Ignores node_modules, .venv, and local databases
```

---

## Key Features

1. **Smart Receipt Scanning & OCR (Feature 1)**:
   - Drag & drop or take a photo of any receipt, invoice, or restaurant bill.
   - Client-side WebAssembly OCR via Tesseract.js with real-time progress.
   - Intelligent parser automatically extracts vendor name, total amount, purchase date, payment mode, and category.
   - Pre-fills into the transaction form or saves directly into SQLite with 1 click.
2. **Group Expense Splitting — Splitwise-style (Feature 2)**:
   - Create multi-member groups (e.g. *Goa Trip 2026*, *Apartment 304*, *Office Lunch*).
   - Record shared bills with payer information and equal/custom splits.
   - **Automated Debt Simplification**: Computes the minimum number of settlements needed (*e.g., "Rahul owes You ₹450"*).
   - In-app settlement tracking with one-click "Settle Up" payments.
3. **Smart Budget Alerts & Bill Reminders (Feature 5)**:
   - Dynamic Notification Bell in the header with unread badge counter.
   - Real-time alerts when category spending reaches &ge;80% (Warning) or &ge;100% (Exceeded).
   - Automated bill due date reminders (overdue, due today, or due within 3 days).
   - Savings goal completion and deadline milestones.
4. **AI Financial Advisor & Spending Insights (Feature 6)**:
   - 4 Dynamic analytical health cards: 50/30/20 Rule compliance, Month-End Burn runway, Major Cost Drivers, and Savings Acceleration.
   - Conversational AI Advisor answering real questions (*"Check my 50/30/20 rule"*, *"How much did I spend on food?"*, *"Can I afford this purchase?"*).
5. **Progressive Web App — PWA (Feature 9)**:
   - Web App Manifest (`manifest.webmanifest`) and dedicated Service Worker (`sw.js`).
   - Installable on Android, iPhone, Windows, and Mac as a native-like app icon.
   - Standalone window mode without browser URL bars, fast asset caching, and offline shell capability.
6. **Express & Global Expense Insertion**:
   - **Express Inserter** directly on the Dashboard with one-click presets (`+₹50`, `+₹100`, `+₹200`, `+₹500`, `+₹1,000`).
   - **Global Quick-Add Modal**: Hit `+ Quick Add` or press the **`N`** key anywhere in the app to open the modal without losing your current view.
7. **Dashboard Overview**:
   - 4 Live KPIs: Net Balance, Monthly Expenses (with daily average), Monthly Income, and Savings Rate.
   - Top spending category detection and upcoming recurring reminders for the next 14 days.
8. **Filterable Ledger**:
   - Real-time search by title or note.
   - Multi-filter by Category, Payment Method, Type (Income/Expense), Date Range, and Sorting.
   - Direct CSV and PDF statement downloads.
9. **Monthly Category Budgets**:
   - Category limits with Safe (&lt;75%), Warning (75–99%), and Exceeded (&ge;100%) color meters.
10. **Savings Milestones**:
    - Progress percentage tracking, target date countdowns, and inline deposits with celebration confetti.
11. **Recurring Schedules**:
    - Weekly and monthly repeat bills with auto-recorder and active/paused toggles.
12. **Visual Analytics**:
    - Chart.js category doughnut chart, monthly income vs. expense grouped bar chart, and payment methods breakdown.
13. **Multi-Currency & Themes**:
    - Support for ₹ (INR), $ (USD), € (EUR), £ (GBP), A$ (AUD), C$ (CAD), ¥ (JPY), and AED.
    - Persistent Dark Mode and Light Mode.

---

## How to Run the Application

### Option A: Complete App via Root Runner (Recommended)

1. Make sure Python virtual environment is activated:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
2. Start the application:
   ```powershell
   python app.py
   ```
3. Open your browser at:
   **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

### Option B: Independent Frontend & Backend (Development Mode)

#### 1. Start the Flask Backend (Terminal 1)
```powershell
cd backend
python app.py
```
*Backend runs on `http://127.0.0.1:5000` with CORS enabled.*

#### 2. Start the React Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```
*React app runs on `http://localhost:5173` with instant hot-reloading and automated API proxying.*

---

## Git Workflow & Remote Repository Sync

Your project is connected to GitHub at:
`https://github.com/aayanpunera/Expense-Tracker.git` on branch `main`.

### To sync updates to GitHub:
```powershell
git status
git add .
git commit -m "feat: your update message"
git push origin main
```
