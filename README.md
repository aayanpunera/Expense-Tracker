# 💰 SmartExpense &mdash; Expense Tracker & Visual Analytics

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-black.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384.svg?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern, responsive, full-stack **Expense Tracker and Financial Analytics** web application built for an **MCA (Master of Computer Applications)** academic assignment. 

The application utilizes a lightweight Python **Flask REST API** backend with **JSON file persistence** (`expenses.json`), paired with a dynamic Single-Page Application (SPA) frontend crafted in **HTML5**, **CSS3 (Glassmorphic Dark Mode)**, and **Vanilla JavaScript** (native Fetch API, DOM manipulation, and interactive **Chart.js** visualizer).

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏛️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [📡 REST API Documentation](#-rest-api-documentation)
- [🚀 Quick Start & Installation](#-quick-start--installation)
- [📊 UI & Dashboard Highlights](#-ui--dashboard-highlights)
- [🎓 Academic Project Q&A (Viva Voce)](#-academic-project-qa-viva-voce)
- [📜 License](#-license)

---

## ✨ Key Features

### 🖥️ 1. Interactive & Modern Frontend UI
- **Glassmorphic Slate Theme:** Clean, eye-catching dark-mode aesthetic with ambient glow effects and card-based elevation.
- **Responsive Layout:** Adapts seamlessly across desktop, tablet, and mobile screens.
- **Micro-Animations:** Fluid transitions, card hover effects, and modal popups.

### 📈 2. Live Financial KPI Dashboard
- **Total Expenses:** Running balance dynamically calculated with currency formatting.
- **Transaction Counter:** Live count of recorded expenses.
- **Highest Spending Category:** Automatically detects the category with the highest expenditure and displays exact amount.
- **Average Expense:** Computes mean expense per transaction.

### 🍩 3. Category Spending Breakdown (Chart.js)
- Responsive **Doughnut Chart** visualizing real-time expenditure across categories:
  - 🍔 **Food**
  - 🚗 **Transport**
  - 💡 **Utilities**
  - 🎬 **Entertainment**
  - 📦 **Other**
- Interactive hover tooltips displaying dollar amount and percentage share.
- Color-coded dynamic legend with percentage indicators.

### 📝 4. Expense Management & Records
- **Add Expense Form:** Fields for Description, Amount, Category dropdown, and Expense Date (auto-defaults to today).
- **Client-side & Server-side Validation:** Enforces positive amounts, required titles, and valid categories.
- **Real-Time Search:** Instant filtering by description as you type.
- **Category Filter & Sorting:** Filter by individual category or sort by Newest/Oldest Date and Highest/Lowest Amount.
- **Safe Item Deletion:** Modal confirmation before permanent deletion.
- **CSV Data Export:** One-click download of all transaction history in `.csv` format.

### ⚙️ 5. Robust Flask REST API Backend
- Clean endpoints for CRUD operations (`GET`, `POST`, `DELETE`).
- **Zero Database Setup:** Uses `expenses.json` flat-file storage with safe read/write operations.
- **CORS Enabled:** Seamless API access from any origin or client.
- **Integrated Static Serving:** Runs full stack from a single command (`python app.py`).

---

## 🏛️ System Architecture

```
+-------------------------------------------------------------+
|                     Browser Client (SPA)                    |
|  [index.html]   <--->   [style.css]   <--->   [script.js]   |
|         |                                      |            |
|         |                                 Chart.js (CDN)    |
+---------|--------------------------------------|------------+
          |                                      |
          | HTTP GET / POST / DELETE (Fetch API) |
          v                                      v
+-------------------------------------------------------------+
|                   Python Flask Backend                      |
|                        (app.py)                             |
|  - CORS Middleware enabled                                  |
|  - REST Endpoints (/api/expenses)                           |
|  - Static File Server (/ , /style.css , /script.js)         |
+-------------------------------------------------------------+
                                 |
                        File I/O | (Read/Write)
                                 v
+-------------------------------------------------------------+
|                 JSON Persistent Storage                     |
|                     (expenses.json)                         |
+-------------------------------------------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 | Semantic markup, accessible forms, ARIA attributes |
| **Frontend Styling** | CSS3 | Custom variables, glassmorphism, responsive grid & flexbox |
| **Frontend Logic** | Vanilla JavaScript (ES6+) | DOM manipulation, state management, Fetch API |
| **Data Visualization** | Chart.js (v4.4 via CDN) | Animated doughnut chart, custom tooltips, legend |
| **Icons & Fonts** | Font Awesome 6, Google Fonts | Plus Jakarta Sans, JetBrains Mono, modern icons |
| **Backend Framework** | Python 3 + Flask 3.0+ | REST API routing, request validation, static serving |
| **CORS Middleware** | Flask-CORS | Cross-Origin Resource Sharing handling |
| **Persistence** | JSON (`expenses.json`) | Lightweight flat-file storage, zero external database setup |

---

## 📁 Project Structure

```
Expense Tracker/
├── app.py              # Flask backend, REST API endpoints, static file serving
├── expenses.json       # JSON flat-file persistent storage
├── index.html          # Semantic HTML5 single-page application structure
├── style.css           # Modern CSS3 stylesheet (glassmorphic dark theme)
├── script.js           # Client-side JavaScript (Fetch API, Chart.js, filtering)
├── requirements.txt    # Python dependencies (Flask, flask-cors)
├── .gitignore          # Git ignore rules for Python, cache, and IDEs
└── README.md           # Comprehensive project documentation
```

---

## 📡 REST API Documentation

Base URL: `http://127.0.0.1:5000/api/expenses`

### 1. Retrieve All Expenses
- **Route:** `GET /api/expenses`
- **Description:** Returns all stored expenses from `expenses.json`.
- **Response (200 OK):**
```json
{
  "success": true,
  "count": 6,
  "expenses": [
    {
      "id": "exp-101",
      "description": "Grocery Supermarket",
      "amount": 84.50,
      "category": "Food",
      "date": "2026-08-28"
    }
  ]
}
```

### 2. Create a New Expense
- **Route:** `POST /api/expenses`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "description": "Coffee Shop & Pastries",
  "amount": 14.75,
  "category": "Food",
  "date": "2026-09-02"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Expense added successfully.",
  "expense": {
    "id": "exp-a1b2c3d4",
    "description": "Coffee Shop & Pastries",
    "amount": 14.75,
    "category": "Food",
    "date": "2026-09-02"
  }
}
```

### 3. Delete an Expense
- **Route:** `DELETE /api/expenses/<expense_id>`
- **Description:** Removes an expense by its unique ID.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Expense 'exp-a1b2c3d4' deleted successfully."
}
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- [Python 3.8+](https://www.python.org/downloads/) installed.
- Modern Web Browser (Chrome, Edge, Firefox, Safari).

### Step 1: Clone the Repository
```bash
git clone https://github.com/aayanpunera/Expense-Tracker.git
cd Expense-Tracker
```

### Step 2: (Optional) Set Up a Virtual Environment
- **Windows:**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python app.py
```

### Step 5: Open in Your Browser
Visit:
```
http://127.0.0.1:5000
```

---

## 📊 UI & Dashboard Highlights

1. **Live Header:** Displays backend connectivity status indicator and current date.
2. **KPI Banner:** 4 dynamic metric tiles showing Total Expenses, Total Transactions, Highest Spending Category, and Average Expense.
3. **Add Expense Panel:** Clean input fields with currency adornment, category selector with emojis, and date picker.
4. **Interactive Doughnut Chart:** Visualizes category distribution percentages with hover detail tooltips.
5. **Dynamic Search & Filtering:** Filter items by category or keyword in real time without page refreshes.
6. **Confirmation Modal:** Prevents accidental deletion of transactions.
7. **CSV Export:** Download a complete transaction report with one click.

---

## 🎓 Academic Project Q&A (Viva Voce)

1. **Why use a JSON file for storage instead of SQLite/MySQL?**  
   *Answer:* For single-user academic demonstrations and lightweight utility apps, JSON file storage requires zero external database installation, configuration, or migrations. It allows instant portability across any operating system.

2. **Why Vanilla JavaScript over frontend frameworks (React/Vue)?**  
   *Answer:* Vanilla JavaScript requires no build tools, compilers (Babel/Webpack), or node_modules. It showcases fundamental proficiency in ES6+ syntax, asynchronous programming (`async/await`), DOM manipulation, and native Fetch API.

3. **How does CORS work in this application?**  
   *Answer:* The `flask-cors` library injects `Access-Control-Allow-Origin: *` headers into HTTP responses, enabling client applications running on different ports or standalone static servers to communicate seamlessly with the backend.

4. **How is the visualizer kept synchronized with the data?**  
   *Answer:* The application employs an event-driven update cycle: whenever an item is added or deleted, `renderAll()` is triggered. This recomputes the KPI aggregates, updates the Chart.js dataset, and invokes `chart.update()` for smooth animated chart rendering.

---

## 📜 License
This project is open-source and developed for MCA academic evaluation purposes under the [MIT License](LICENSE).
