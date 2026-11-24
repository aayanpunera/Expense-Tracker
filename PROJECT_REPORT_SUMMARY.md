# SpendWise — Full-Stack Personal Finance & Expense Tracker
## Comprehensive Project Summary & Architecture Reference for Project Report Generation

> **Usage Note for ChatGPT / Report Generator**:  
> Use the structured information in this document to generate an academic, technical, or professional Project Report. It contains the complete system architecture, database schema, REST API endpoints, frontend component structure, security protocols, algorithms, and cloud deployment details of the **SpendWise** application.

---

## 1. Project Overview & Abstract

### 1.1 Project Title
**SpendWise — Smart Full-Stack Personal Finance & Expense Management System**

### 1.2 Abstract
Managing personal finances, budgeting, and recurring financial liabilities across multiple payment channels is a major challenge for modern individuals and households. **SpendWise** is a full-stack, responsive web application designed to track real-time income and expenditures, automate budget monitoring, manage recurring bills, facilitate shared group expense splitting (Splitwise model), and provide automated AI-driven financial health diagnostics. Built on a decoupled client-server architecture featuring a **React (Vite)** single-page frontend, a **Python (Flask)** RESTful API, and an **SQLite** relational database, SpendWise incorporates smart features including **Receipt OCR processing**, **50/30/20 budgeting rule analysis**, **automated debt settlement algorithms**, and **ReportLab-powered PDF financial statements**. The system has been deployed to production with a global CDN frontend on **Vercel** and an elastic containerized backend on **Render.com**.

### 1.3 Key Objectives
- **Centralized Ledger**: Consolidate multi-currency income and expenses with categories, payment modes, tags, and notes.
- **Budgeting & Alerting**: Real-time spending threshold indicators (Safe, Warning, Exceeded) to prevent overspending.
- **Group Expense Splitting**: Collaborative expense sharing among friends/roommates with automated net-debt calculation and settlement tracking.
- **Smart Receipt Scanning**: Automated extraction of transaction details from physical receipts using client/server optical character processing.
- **AI Financial Advisor**: Algorithmic financial diagnostics implementing the 50/30/20 budget framework, monthly runway forecasts, and spending anomaly alerts.
- **Dual Theme Experience**: High-contrast, dark fintech aesthetic matching modern financial dashboards, alongside a crisp modern Light mode.
- **Reporting & Export**: Instant generation of downloadable monthly PDF statements and CSV exports.

---

## 2. Technology Stack & System Architecture

### 2.1 Architecture Pattern
- **Pattern**: Decoupled Client-Server / RESTful API / Single Page Application (SPA).
- **Communication Protocol**: HTTP/HTTPS with JSON payloads; JWT-style secure token authorization via HTTP headers (`Authorization: Bearer <token>`).
- **CORS Handling**: `Flask-CORS` enabling cross-origin resource sharing between the Vercel frontend and Render backend with complete credential support.

### 2.2 Technology Breakdown

| Tier | Technology / Library | Version / Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | 18+ | Component-based dynamic user interface |
| **Build Tool & Bundler** | **Vite** | 5.x / 8.x | High-speed module bundling and optimized production build |
| **Routing** | **React Router DOM** | 6.x | Client-side routing, protected and public route guards |
| **Icons & Visuals** | **Lucide React** | Latest | Modern SVG icon set |
| **Data Visualization** | **Chart.js** & **react-chartjs-2** | Latest | Doughnut, line, and bar charts for analytics |
| **Backend Framework** | **Python / Flask** | 3.0+ | Lightweight RESTful backend microservices |
| **Production WSGI** | **Gunicorn** | 21.2+ | Production-grade WSGI HTTP server for Linux cloud runtime |
| **Database** | **SQLite3** | Integrated | Lightweight, ACID-compliant relational persistence engine |
| **Security & Auth** | **Werkzeug Security** & **ItsDangerous** | Latest | PBKDF2:SHA256 password hashing & timed URL-safe token signing |
| **PDF Generation** | **ReportLab** | 4.x | Programmatic A4 PDF document formatting and table generation |
| **Frontend Deployment** | **Vercel** | Global CDN | Optimized static hosting with SPA routing rewrite rules |
| **Backend Deployment** | **Render.com** | Linux Web Service | Containerized cloud Python environment with continuous deployment from GitHub |

---

## 3. Database Architecture (Entity-Relationship Model)

The SQLite database (`expenses.db`) enforces relational integrity using foreign keys (`PRAGMA foreign_keys = ON`).

### 3.1 Table Schemas

#### 1. `users`
Stores user profile, authentication credentials, and personal display preferences.
- `id` (INTEGER, Primary Key, Auto Increment)
- `name` (TEXT, Not Null): Full user name
- `email` (TEXT, Not Null, Unique): Unique email login
- `password_hash` (TEXT, Not Null): Werkzeug PBKDF2 password hash
- `currency` (TEXT, Default '₹'): Preferred currency symbol (`₹`, `$`, `€`, `£`, `A$`, `C$`, `¥`, `AED`)
- `theme` (TEXT, Default 'dark'): UI theme preference (`dark` or `light`)
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 2. `transactions`
The central financial ledger recording all inflows and outflows.
- `id` (INTEGER, Primary Key, Auto Increment)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `title` (TEXT, Not Null): Short description of transaction
- `amount` (REAL, Not Null): Decimal transaction amount
- `kind` (TEXT, Not Null): `'income'` or `'expense'`
- `category` (TEXT, Not Null): Category name (e.g., Food & Dining, Travel, Rent, Bills, Salary, etc.)
- `payment_method` (TEXT, Not Null): Mode of transaction (Cash, UPI, Credit Card, Debit Card, Bank Transfer, Other)
- `transaction_date` (TEXT, Not Null): YYYY-MM-DD formatted date
- `note` (TEXT): Optional user notes and tags
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 3. `budgets`
Category-specific spending ceilings with recurrence periods.
- `id` (INTEGER, Primary Key, Auto Increment)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `category` (TEXT, Not Null): Target category
- `limit_amount` (REAL, Not Null): Monthly budget cap
- `period` (TEXT, Default 'monthly'): Recurrence interval
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 4. `goals`
Financial savings targets and milestone tracking.
- `id` (INTEGER, Primary Key, Auto Increment)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `name` (TEXT, Not Null): Name of target (e.g. Emergency Fund, Laptop, Vacation)
- `target_amount` (REAL, Not Null): Goal target amount
- `current_amount` (REAL, Default 0): Currently saved amount
- `target_date` (TEXT): Target deadline (YYYY-MM-DD)
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 5. `recurring_bills`
Subscription and recurring payment schedules.
- `id` (INTEGER, Primary Key, Auto Increment)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `title` (TEXT, Not Null): Subscription/Bill name
- `amount` (REAL, Not Null): Billing amount
- `frequency` (TEXT, Not Null): `'monthly'`, `'weekly'`, `'yearly'`
- `next_due_date` (TEXT, Not Null): Next trigger date
- `category` (TEXT, Not Null)
- `auto_record` (INTEGER, Default 0): Boolean flag to automatically insert to ledger on due date
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 6. `groups`
Shared financial workspaces for roommate, trip, or team expenses.
- `id` (INTEGER, Primary Key, Auto Increment)
- `name` (TEXT, Not Null): Group title
- `created_by` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 7. `group_members`
Association table linking users to groups.
- `id` (INTEGER, Primary Key, Auto Increment)
- `group_id` (INTEGER, Foreign Key &rarr; `groups.id`, Not Null)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `joined_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 8. `group_expenses`
Master records for expenses incurred within a shared group.
- `id` (INTEGER, Primary Key, Auto Increment)
- `group_id` (INTEGER, Foreign Key &rarr; `groups.id`, Not Null)
- `paid_by` (INTEGER, Foreign Key &rarr; `users.id`, Not Null): Member who paid upfront
- `title` (TEXT, Not Null)
- `amount` (REAL, Not Null)
- `split_method` (TEXT, Default 'equal'): Splitting logic (`equal` or `custom`)
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 9. `group_splits`
Individual liability shares for each member on a specific group expense.
- `id` (INTEGER, Primary Key, Auto Increment)
- `expense_id` (INTEGER, Foreign Key &rarr; `group_expenses.id`, Not Null)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null): Member who owes
- `amount_owed` (REAL, Not Null): Amount owed by this member

#### 10. `group_settlements`
Direct peer-to-peer debt settlements.
- `id` (INTEGER, Primary Key, Auto Increment)
- `group_id` (INTEGER, Foreign Key &rarr; `groups.id`, Not Null)
- `from_user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null): Payer
- `to_user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null): Payee
- `amount` (REAL, Not Null): Settled sum
- `settled_at` (TEXT, Default CURRENT_TIMESTAMP)

#### 11. `notifications`
Smart notifications and alerts.
- `id` (INTEGER, Primary Key, Auto Increment)
- `user_id` (INTEGER, Foreign Key &rarr; `users.id`, Not Null)
- `title` (TEXT, Not Null)
- `message` (TEXT, Not Null)
- `severity` (TEXT, Default 'info'): `'info'`, `'warning'`, `'danger'`, `'success'`
- `dismissed` (INTEGER, Default 0)
- `created_at` (TEXT, Default CURRENT_TIMESTAMP)

---

## 4. Complete Backend API Specifications

All endpoints (except authentication and public status) require an `Authorization: Bearer <token>` header.

### 4.1 Authentication Endpoints
- `POST /api/auth/register`: Creates new user account. Validates email uniqueness, hashes password with PBKDF2, returns timed authentication token and user profile object.
- `POST /api/auth/login`: Authenticates email and password. Generates new timed token.
- `GET /api/auth/me`: Retrieves currently authenticated user profile.
- `PUT /api/auth/profile`: Updates user name, currency preference, and theme mode.
- `PUT /api/auth/password`: Validates current password and updates to new password hash.

### 4.2 Dashboard & Financial Intelligence
- `GET /api/dashboard`: Aggregates all high-level metrics in a single database call:
  - Total all-time balance, month income, month expense, savings rate.
  - Recent transactions list (latest 5).
  - Active category budgets and real-time utilization.
  - Active savings goals and completion percentages.
  - Smart budget health alerts.
- `GET /api/advisor/insights`:
  - **50/30/20 Diagnostic**: Classifies user spending into *Needs* (Rent, Bills, Food, Health), *Wants* (Shopping, Entertainment), and *Savings/Investments*. Computes variance against target ratios.
  - **Runway Forecast**: Divides current balance by average daily burn rate to calculate days/months of financial runway.
  - **Spending Anomalies**: Detects unusual spikes in specific categories compared to 3-month moving averages.
  - **Actionable Advice**: Programmatic tips on cutting discretionary categories.

### 4.3 Transaction Ledger Endpoints
- `GET /api/transactions`: Retrieves paginated transaction records with multi-filter query params (`kind`, `category`, `payment_method`, `start_date`, `end_date`, `search`, `page`, `limit`).
- `POST /api/transactions`: Records a new transaction. Triggers auto-notification if budget threshold is crossed.
- `GET /api/transactions/<id>`: Fetches single transaction details for editing.
- `PUT /api/transactions/<id>`: Updates existing transaction details.
- `DELETE /api/transactions/<id>`: Deletes transaction from ledger.
- `GET /api/transactions/export/csv`: Generates and streams standard CSV of user's transactions.
- `POST /api/transactions/import/csv`: Parses uploaded CSV file and bulk-inserts records into user's database.
- `GET /api/transactions/export/pdf`: Uses ReportLab to generate a styled A4 PDF monthly statement.

### 4.4 Budget Management Endpoints
- `GET /api/budgets`: Returns all defined category budgets joined with current month actual spend.
- `POST /api/budgets`: Sets or updates a budget cap for a category.
- `DELETE /api/budgets/<id>`: Removes a budget limit.

### 4.5 Savings Goals Endpoints
- `GET /api/goals`: Returns all savings goals with calculated completion percentages.
- `POST /api/goals`: Creates new savings goal target.
- `PUT /api/goals/<id>`: Updates goal target or logs a savings deposit.
- `DELETE /api/goals/<id>`: Deletes a goal.

### 4.6 Recurring Subscriptions & Bills Endpoints
- `GET /api/recurring`: Lists all active subscriptions with countdown to next due date.
- `POST /api/recurring`: Registers a new recurring bill.
- `POST /api/recurring/<id>/pay`: Manually marks bill as paid, logs it into transactions ledger, and advances `next_due_date` by the recurrence interval.
- `DELETE /api/recurring/<id>`: Cancels recurring schedule.

### 4.7 Shared Group Expenses (Splitwise Module) Endpoints
- `GET /api/groups`: Lists all groups the authenticated user belongs to, including net balance across each group.
- `POST /api/groups`: Creates a new group.
- `GET /api/groups/<id>`: Fetches group details, member roster, expense logs, and pairwise settlement ledger ("who owes whom").
- `POST /api/groups/<id>/members`: Invites a registered user by email into the group.
- `POST /api/groups/<id>/expenses`: Logs a group expense and computes split shares across all group members.
- `POST /api/groups/<id>/settle`: Records a direct debt settlement payment between two members.

### 4.8 OCR Receipt Processing
- `POST /api/ocr/scan`: Accepts uploaded receipt image or base64 data. Runs pattern extraction algorithms (regex matching currency figures, dates, and merchant keywords), returning auto-filled title, amount, category, and date.

### 4.9 Reports & Analytics Endpoints
- `GET /api/reports/analytics`: Returns monthly time-series income vs. expense breakdowns, category percentage shares, and payment method frequencies for Chart.js visualization.

---

## 5. Frontend Architecture & Page Functionality

### 5.1 Design System & Theme Engine
- **Dark Fintech Aesthetic**: Deep navy-slate background with an atmospheric lighting gradient (`#36485e` &rarr; `#19202e` &rarr; `#121723`), slate cards (`#202737`), subtle borders (`#2b3548`), and mint green highlights (`#00d29d`).
- **Modern Light Theme**: Clean ivory canvas (`#f4f6fa`), pure white cards (`#ffffff`), soft slate borders (`#e2e8f0`), and crisp high-contrast text (`#0f172a`).
- **Dynamic CSS Tokens**: All surfaces, buttons, text colors, and borders utilize responsive CSS variables (`--bg-app`, `--bg-card-top`, `--bg-card-bottom`, `--text-main`, `--text-muted`, `--border-color`), enabling instantaneous theme switching without page reloads.

### 5.2 Application Pages

#### 1. Dashboard (`/`)
- **Executive KPI Cards**:
  1. *Net Balance*: All-time balance with currency pill badge and dynamic coloring.
  2. *Month Expenses*: Current monthly spend paired with a horizontal dual-gradient progress bar (Indigo `#6366f1` to Mint `#00d29d`).
  3. *Month Income*: Inflow indicator with achievement percentages.
  4. *Savings Rate*: Percentage efficiency metric rendered via an SVG circular donut ring.
- **AI Financial Insights Banner**: Highlights 50/30/20 recommendations and cost-cutting alerts.
- **Express Database Inserter**: Inline quick logger form with fast description, category, payment mode, amount, and one-click preset increment chips (`+₹50`, `+₹100`, `+₹200`, `+₹500`, `+₹1000`).
- **Recent Database Transactions**: High-density table displaying recent database rows with status chips and color-coded amounts.
- **Budget Health Widget**: Thick doughnut chart with a 4-color custom legend (Food, Transport, Entertainment, Bills).
- **Savings Goals Widget**: Quick milestone progress bars.

#### 2. Transactions Ledger (`/transactions`)
- Complete financial record table.
- Real-time search query filter across titles, categories, and notes.
- Multi-dimensional filters (Type: Income/Expense, Category, Payment Method, Date Range).
- Action buttons for **Download PDF Statement**, **Export CSV**, and **Import CSV**.
- In-table inline actions for editing and deleting records.

#### 3. Log New Transaction (`/transactions/new`)
- Dedicated full-page entry form.
- Income / Expense type toggle pills.
- Description, numeric amount input, custom date picker, category dropdown, payment method dropdown, notes and tags field.
- Auto-fill feature: Automatically populates fields if navigated from an OCR receipt scan session.

#### 4. Monthly Budgets (`/budgets`)
- Category budget manager with visual spend meters.
- Real-time calculation: Spent amount vs. Cap amount.
- Status badges: *Safe* (green), *Warning* (orange, >80% spent), and *Exceeded* (red, >100% spent).
- Modal to create, edit, or adjust category spending caps.

#### 5. Savings Goals (`/goals`)
- Target milestone cards for short-term and long-term funds.
- Progress visualization with target deadlines.
- "Add Funds" action button to log incremental savings deposits.

#### 6. Recurring Bills & Subscriptions (`/recurring`)
- Schedule tracker for Netflix, Spotify, Rent, Utilities, Wi-Fi, etc.
- Displays frequency, next due date, and days remaining.
- "Mark as Paid" action that automatically logs the transaction to the ledger and increments the due date to the next cycle.

#### 7. Split Bills & Groups (`/groups` & `/groups/:id`)
- Splitwise-style collaborative group expense management.
- Multi-member group creation and email invitations.
- Group balance ledger displaying individual net debts ("You are owed ₹X" or "You owe ₹Y").
- Automated pairwise debt simplification algorithm.
- 1-Click "Settle Up" action to record repayments between members.

#### 8. AI Financial Advisor (`/advisor`)
- Algorithmic financial audit based on the 50/30/20 budget principle.
- Breakdown of Needs, Wants, and Savings percentages against ideal targets.
- Daily burn rate calculation and emergency fund runway estimation.
- Customized AI recommendations on reducing discretionary spending.

#### 9. Analytics & Reports (`/reports`)
- Comprehensive interactive financial visualizations:
  - Monthly Income vs. Expenses comparison bar chart.
  - Expense breakdown by category donut chart.
  - Monthly net savings trend line.
- Export options for formatted PDF financial statements.

#### 10. Settings & User Workspace (`/settings`)
- User profile editing (Name, Email).
- Global currency selector supporting 8 major global currencies (₹ INR, $ USD, € EUR, £ GBP, A$ AUD, C$ CAD, ¥ JPY, AED).
- UI theme toggle (Dark / Light mode).
- Password change utility.
- Data export and safety controls.

#### 11. Global Layout & Components
- **Sidebar**: Brand logo, navigation menu with active glow indicators, budget alert indicators, and pill profile card with quick user actions.
- **Topbar**: Page title, month banner, search shortcut, notifications bell with unread badge and dropdown alerts, quick add trigger, and theme toggle.
- **Global Keyboard Shortcut**: Pressing **'N'** anywhere in the app instantly opens the **Quick Add Transaction Modal**.
- **Receipt OCR Modal**: Live camera snapshot or file upload interface that extracts transaction figures directly into the logger.

---

## 6. Security, Performance & Data Integrity

1. **Authentication & Token Expiry**:
   - Authentication tokens are generated using timed, URL-safe cryptographic serializers (`itsdangerous.URLSafeTimedSerializer`).
   - Tokens carry an expiration window and user identity payload; protected endpoints reject forged, tampered, or expired tokens with `401 Unauthorized`.
2. **Password Security**:
   - Raw passwords are never stored in the database.
   - All passwords are encrypted with salted PBKDF2 hashing via `werkzeug.security.generate_password_hash`.
3. **SQL Injection Defense**:
   - 100% of SQL queries utilize parameterized inputs (`?` placeholders). No user string concatenation is permitted in database queries.
4. **Foreign Key Integrity**:
   - SQLite enforces cascading constraints and relational references on every connection via `PRAGMA foreign_keys = ON`.
5. **CORS & Environment Isolation**:
   - Cross-Origin Resource Sharing is enabled for all production domains with explicit method controls.
   - Sensitive backend tokens and database paths are isolated from client-side bundles.

---

## 7. Cloud Deployment Architecture

The application is deployed across a modern two-tier cloud architecture:

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (BROWSER)                     │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS Requests (Port 443)
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       VERCEL GLOBAL CDN      │    │      RENDER.COM CLOUD        │
│    (Frontend Presentation)   │    │    (Backend Microservices)   │
├──────────────────────────────┤    ├──────────────────────────────┤
│ • React 18 SPA (Vite build)  │    │ • Python 3 Environment       │
│ • Static Assets & Bundles    │    │ • Gunicorn Production WSGI   │
│ • SPA Rewrites (vercel.json) │    │ • Flask RESTful API Routes   │
│ • Environment: VITE_API_URL  │    │ • SQLite Database Engine     │
│ • Zero-downtime deployments  │    │ • ReportLab PDF Generator    │
└──────────────────────────────┘    └──────────────────────────────┘
```

### 7.1 Frontend (Vercel)
- **Repository**: Connected directly to GitHub (`aayanpunera/Expense-Tracker`).
- **Framework Preset**: Vite / React SPA.
- **Routing Configuration**: `vercel.json` rewrite (`/*` &rarr; `/index.html`) ensures that client-side routes do not throw 404 errors on browser refresh.
- **Environment Configuration**: `VITE_API_URL` set as a public Config variable pointing to the Render backend service.

### 7.2 Backend (Render.com)
- **Service Type**: Web Service (Python 3 environment).
- **WSGI Server**: Gunicorn HTTP Server (`gunicorn app:app`).
- **Build Command**: `pip install -r requirements.txt`.
- **Runtime Port**: Dynamically bound to Render's cloud `$PORT` on `0.0.0.0`.
- **Persistence**: SQLite database (`expenses.db`) with automatic table creation via `init_db()`.

---

## 8. Suggested Project Report Structure for ChatGPT

When feeding this summary into ChatGPT, ask it to write a full academic/technical project report using the following standard university/company report structure:

1. **Title Page & Certificates**: Project Title, Student Details, Guide Details, Institution.
2. **Abstract & Executive Summary**: Concise project overview, problem statement, and solution.
3. **Chapter 1 — Introduction**: Background of Personal Finance Management, Objectives, Scope of the Project.
4. **Chapter 2 — Literature Survey & Problem Statement**: Existing Systems (Excel, standalone apps), Limitations of Traditional Trackers, Proposed Solution.
5. **Chapter 3 — System Requirements Specification (SRS)**: Hardware & Software Requirements, Functional Requirements, Non-Functional Requirements (Security, Scalability, Performance).
6. **Chapter 4 — System Architecture & Design**: High-Level System Architecture, UML Diagrams (Use Case Diagram, Class Diagram, Sequence Diagram), ER Diagram & Database Schema Design.
7. **Chapter 5 — Implementation & Core Modules**: Authentication & Security Module, Ledger & Budgeting Engine, OCR Receipt Scanning Pipeline, 50/30/20 AI Advisor Algorithm, Group Expense Splitting & Debt Settlement Logic, PDF Report Generation.
8. **Chapter 6 — User Interface & Design System**: Dark Fintech UI Design Philosophy, Responsive CSS Token Architecture, Screenshots & Page Descriptions.
9. **Chapter 7 — Testing & Verification**: Unit Testing, Integration Testing, API Endpoint Validation, Security Auditing.
10. **Chapter 8 — Deployment & DevOps**: Vercel Frontend Deployment Pipeline, Render.com Backend Containerization, CI/CD with GitHub.
11. **Chapter 9 — Conclusion & Future Scope**: Summary of Achievements, Future Enhancements (Bank SMS scraping, multi-bank API integration, native mobile app using React Native).
12. **References & Bibliography**: Research papers, official documentation (Flask, React, Vite, SQLite).

---

## 9. Prompt Template to Copy into ChatGPT

```text
Act as a senior software engineering professor and technical writer. 
I have built a complete, production-ready full-stack application called "SpendWise — Smart Expense & Personal Finance Tracker". 
Attached below is the complete technical documentation and architecture summary of my project, including its tech stack, database schemas, API endpoints, frontend pages, security features, and cloud deployment.

Please generate a comprehensive, highly detailed, and formal Project Report for my college/final semester submission. 
Ensure the report includes:
- An academic Abstract
- Detailed Problem Statement and Objectives
- Comprehensive System Architecture & ER Diagram descriptions
- In-depth descriptions of all functional modules (Auth, Ledger, Budgets, Goals, Split Bills, AI Advisor, OCR, PDF Generation)
- High-level algorithms explained in pseudocode or step-by-step logic (e.g., Debt Simplification, 50/30/20 Budgeting Rule, Timed Token Auth)
- UI/UX Design System breakdown (Dark Fintech aesthetic + Light mode)
- Cloud Deployment analysis (Vercel + Render.com)
- Conclusion and Future Enhancements

Here is the technical specification of my project:
[PASTE THIS ENTIRE FILE HERE]
```
