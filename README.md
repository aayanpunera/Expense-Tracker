# SmartExpense - Full-Stack Expense Tracker & Financial Analytics

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-black.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384.svg?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A responsive, full-stack Expense Tracker and Financial Analytics web application developed for Master of Computer Applications (MCA) academic coursework.

The project implements a decoupled architecture featuring a Python Flask REST API backend with JSON flat-file persistence (`expenses.json`) and a client-side Single-Page Application (SPA) built with HTML5, CSS3, modern Vanilla JavaScript (ES6+), and Chart.js for data visualization.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [REST API Specification](#rest-api-specification)
- [Installation and Setup](#installation-and-setup)
- [User Interface Overview](#user-interface-overview)
- [Academic Viva-Voce Notes](#academic-viva-voce-notes)
- [License](#license)

---

## Project Overview

SmartExpense provides an intuitive, lightweight solution for recording, managing, and analyzing personal expenditures. It eliminates the overhead of database server configurations and heavy frontend JavaScript frameworks by leveraging native browser APIs, modern CSS layout standards, and a lightweight Flask backend.

### Primary Objectives
- Provide a clean and responsive user interface for daily financial tracking.
- Demonstrate asynchronous client-server communication using the native Fetch API.
- Implement real-time data visualization of expenses broken down by category.
- Ensure cross-platform execution with minimal setup dependencies.

---

## Key Features

### 1. User Interface and Dashboard
- **Modern Responsive Layout:** Structured card-based design built with CSS Flexbox and Grid, fully responsive on desktop, tablet, and mobile displays.
- **Micro-Interactions:** Subtle hover states, smooth transitions, and feedback dialogs.
- **KPI Summary Metrics:** Real-time calculation of Total Expenses, Total Transactions, Highest Spending Category, and Average Transaction Value.

### 2. Category Spending Visualizer
- **Interactive Doughnut Chart:** Rendered using Chart.js to display spending distribution across five predefined categories:
  - Food
  - Transport
  - Utilities
  - Entertainment
  - Other
- **Detailed Tooltips & Legend:** Displays both the nominal amount and percentage share per category.

### 3. Expense Management
- **Transaction Recording:** Form inputs for description, monetary amount, category, and date.
- **Data Validation:** Strict client-side and server-side validation ensuring positive numeric amounts, non-empty descriptions, and valid date formats.
- **Live Search and Filtering:** Instant client-side search filtering by description keyword.
- **Category Filter and Multi-Attribute Sorting:** Filter by individual category, or sort transactions by date (newest/oldest) and amount (highest/lowest).
- **Deletion with Confirmation:** Modal dialog safeguards against accidental record removal.
- **Data Export:** Export all recorded transactions to CSV format with a single click.

### 4. Backend and Data Storage
- **RESTful Endpoints:** Standardized HTTP methods (`GET`, `POST`, `DELETE`) with JSON payloads and descriptive HTTP status codes.
- **JSON File Persistence:** Thread-safe read and write operations on `expenses.json`, ensuring data is preserved between server restarts without requiring database servers.
- **CORS Support:** Enabled via `flask-cors` for cross-origin request compatibility.
- **Dual-Purpose Server:** Serves both API endpoints and static assets directly.

---

## System Architecture

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

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Markup** | HTML5 | Semantic elements, accessible form controls, ARIA compliance |
| **Styling** | CSS3 | Custom properties, modern dark palette, Flexbox, CSS Grid |
| **Client Scripting** | Vanilla JavaScript | ES6+ syntax, Fetch API, DOM manipulation, asynchronous event handling |
| **Visualization** | Chart.js 4.4 | Canvas-based dynamic doughnut chart via CDN |
| **Typography & Icons** | Plus Jakarta Sans, Font Awesome | Modern sans-serif type, vector icon set via CDN |
| **Backend** | Python 3.10+ / Flask 3.0+ | Lightweight WSGI web framework and REST API controller |
| **Middleware** | Flask-CORS 4.0+ | Cross-Origin Resource Sharing handling |
| **Storage** | JSON Flat File | File-based persistence (`expenses.json`) |

---

## Project Directory Structure

```
Expense Tracker/
|-- app.py              # Flask server, REST API endpoints, static file routes
|-- expenses.json       # JSON flat-file storage
|-- index.html          # Semantic HTML5 single-page application structure
|-- style.css           # Modern CSS3 stylesheet (dark theme, responsive layout)
|-- script.js           # Client-side JavaScript (Fetch API, Chart.js, filtering)
|-- requirements.txt    # Python package dependencies
|-- .gitignore          # Git exclusion rules
`-- README.md           # Comprehensive project documentation
```

---

## REST API Specification

Base URL: `http://127.0.0.1:5000/api/expenses`

### 1. Retrieve All Expenses
- **Method:** `GET`
- **Path:** `/api/expenses`
- **Description:** Reads and returns all expenses from persistent storage.
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

### 2. Create an Expense
- **Method:** `POST`
- **Path:** `/api/expenses`
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
- **Method:** `DELETE`
- **Path:** `/api/expenses/<expense_id>`
- **Description:** Deletes a specific expense record by its unique identifier.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Expense 'exp-a1b2c3d4' deleted successfully."
}
```
- **Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Expense with ID 'exp-invalid' not found."
}
```

---

## Installation and Setup

### Prerequisites
- Python 3.8 or higher installed on your system.
- Modern web browser (Chrome, Edge, Firefox, or Safari).

### Step 1: Clone the Repository
```bash
git clone https://github.com/aayanpunera/Expense-Tracker.git
cd Expense-Tracker
```

### Step 2: Create a Virtual Environment (Recommended)
- **Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application Server
```bash
python app.py
```

Console output upon startup:
```text
==================================================
 MCA Project: Expense Tracker Server Starting
 Access Web App at: http://127.0.0.1:5000
 REST API Base URL: http://127.0.0.1:5000/api/expenses
==================================================
 * Running on http://127.0.0.1:5000
```

### Step 5: Access the Application
Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## User Interface Overview

1. **Header Navigation:** Features application identity, server status indicator, and date display.
2. **Key Metric Tiles:** Four KPI cards highlighting Total Spend, Transaction Count, Top Spending Category, and Average Transaction Value.
3. **Expense Submission Form:** Input fields with immediate validation for title, amount, category, and date.
4. **Interactive Doughnut Chart:** Visual breakdown of expenditures by category with real-time updates upon data modification.
5. **Search and Filter Bar:** Allows instant text search, category filtering, and sorting (by date and amount).
6. **Transaction List:** Individual records formatted with category badges, amounts, dates, and deletion triggers.
7. **CSV Export:** Button to download the full transaction log to a standard `.csv` file.

---

## Academic Viva-Voce Notes

1. **Why select JSON flat-file persistence instead of a relational database like MySQL or SQLite?**  
   *Response:* For single-user desktop prototypes and academic assignments, JSON storage eliminates external database dependencies, server configuration, and migration scripts. It provides transparent, human-readable data storage that remains portable across environments.

2. **Why choose modern Vanilla JavaScript over frameworks like React or Angular?**  
   *Response:* Vanilla JavaScript has zero build overhead (no npm dependencies, Webpack, or Babel setup). It demonstrates direct proficiency in core web standards: native DOM manipulation, asynchronous event handling, and the Fetch API.

3. **How does CORS function within this application?**  
   *Response:* Cross-Origin Resource Sharing is handled by `flask-cors`. It injects standard HTTP response headers (`Access-Control-Allow-Origin`), permitting the client to make asynchronous requests even when hosted on a different port or server.

4. **How does the Chart.js visualizer maintain synchronization with data changes?**  
   *Response:* The application utilizes a centralized state cycle. Whenever a record is added or removed, `renderAll()` is called. This recalculates category totals, assigns updated values to the chart's dataset, and triggers `chart.update()` for smooth transition animations without full page reloads.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
