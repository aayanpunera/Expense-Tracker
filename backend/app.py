"""
SpendWise Backend API - Python / Flask REST API
Provides full database persistence, token authentication, transactions,
budgets, goals, recurring schedules, analytics, and PDF/CSV export.
"""

from __future__ import annotations

import csv
import io
import json
import sqlite3
from datetime import date, datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, Response, g, jsonify, request, send_file
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "expenses.db"

CATEGORIES = [
    "Food & Dining",
    "Travel",
    "Rent",
    "Bills",
    "Shopping",
    "Health",
    "Entertainment",
    "Education",
    "Salary",
    "Freelance",
    "Investment",
    "Other",
]

PAYMENT_METHODS = [
    "Cash",
    "UPI",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Other",
]

CURRENCIES = [
    {"symbol": "₹", "name": "INR - Indian Rupee"},
    {"symbol": "$", "name": "USD - US Dollar"},
    {"symbol": "€", "name": "EUR - Euro"},
    {"symbol": "£", "name": "GBP - British Pound"},
    {"symbol": "A$", "name": "AUD - Australian Dollar"},
    {"symbol": "C$", "name": "CAD - Canadian Dollar"},
    {"symbol": "¥", "name": "JPY - Japanese Yen"},
    {"symbol": "AED", "name": "AED - UAE Dirham"},
]

SECRET_KEY = "spendwise-secret-key-production-2026-dynamic-app"
serializer = URLSafeTimedSerializer(SECRET_KEY, salt="spendwise-auth-token")

app = Flask(__name__)
app.config.update(
    SECRET_KEY=SECRET_KEY,
    DATABASE=DB_PATH,
)

# Enable CORS for React frontend (Vite port 5173, 3000, or any localhost)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)


def db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    connection = g.pop("db", None)
    if connection:
        connection.close()


def init_db():
    connection = db()
    connection.executescript(
        """
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT '₹',
      theme TEXT NOT NULL DEFAULT 'light',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      kind TEXT NOT NULL CHECK(kind IN ('income', 'expense')),
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL CHECK(monthly_limit > 0),
      UNIQUE(user_id, category),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      kind TEXT NOT NULL CHECK(kind IN ('income', 'expense')),
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'weekly')),
      next_due_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """
    )
    connection.commit()


@app.before_request
def before_request_hook():
    init_db()


def generate_token(user_id: int) -> str:
    return serializer.dumps({"user_id": user_id})


def get_authenticated_user():
    """Extracts user from Bearer token or token query param."""
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif request.args.get("token"):
        token = request.args.get("token")

    if not token:
        return None

    try:
        data = serializer.loads(token, max_age=86400 * 30)  # valid for 30 days
        user_id = data.get("user_id")
        if not user_id:
            return None
        return db().execute("SELECT id, name, email, currency, theme, created_at FROM users WHERE id=?", (user_id,)).fetchone()
    except (BadSignature, SignatureExpired):
        return None


def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify({"success": False, "error": "Unauthorized. Please log in."}), 401
        g.user = user
        apply_due_recurring(user["id"])
        return f(*args, **kwargs)
    return decorated


def apply_due_recurring(user_id: int):
    today = date.today()
    items = db().execute(
        "SELECT * FROM recurring_transactions WHERE user_id=? AND active=1",
        (user_id,),
    ).fetchall()
    for item in items:
        try:
            due = datetime.strptime(item["next_due_date"], "%Y-%m-%d").date()
        except ValueError:
            continue
        inserted = False
        while due <= today:
            db().execute(
                """
                INSERT INTO transactions (user_id, title, amount, kind, category, payment_method, transaction_date, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    item["title"],
                    item["amount"],
                    item["kind"],
                    item["category"],
                    item["payment_method"],
                    due.isoformat(),
                    (item["note"] or "").strip() + " (Auto Recurring)",
                ),
            )
            inserted = True
            due += timedelta(days=7 if item["frequency"] == "weekly" else 30)
        if inserted:
            db().execute(
                "UPDATE recurring_transactions SET next_due_date=? WHERE id=?",
                (due.isoformat(), item["id"]),
            )
    db().commit()


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    currency = (data.get("currency") or "₹").strip()[:5] or "₹"

    if len(name) < 2:
        return jsonify({"success": False, "error": "Name must be at least 2 characters."}), 400
    if "@" not in email or "." not in email:
        return jsonify({"success": False, "error": "A valid email is required."}), 400
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400

    try:
        cursor = db().execute(
            "INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)",
            (name, email, generate_password_hash(password), currency),
        )
        db().commit()
        user_id = cursor.lastrowid
        token = generate_token(user_id)
        user = db().execute("SELECT id, name, email, currency, theme FROM users WHERE id=?", (user_id,)).fetchone()
        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "token": token,
            "user": dict(user),
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "An account with that email already exists."}), 409


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or request.form
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if user and check_password_hash(user["password_hash"], password):
        token = generate_token(user["id"])
        user_dict = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "currency": user["currency"],
            "theme": user["theme"],
        }
        return jsonify({
            "success": True,
            "message": "Logged in successfully.",
            "token": token,
            "user": user_dict,
        }), 200

    return jsonify({"success": False, "error": "Invalid email or password."}), 401


@app.route("/api/auth/me", methods=["GET"])
@auth_required
def api_me():
    return jsonify({
        "success": True,
        "user": dict(g.user),
        "categories": CATEGORIES,
        "payment_methods": PAYMENT_METHODS,
        "currencies": CURRENCIES,
    })


# ---------------------------------------------------------------------------
# Dashboard Endpoint
# ---------------------------------------------------------------------------


@app.route("/api/dashboard", methods=["GET"])
@auth_required
def api_dashboard():
    user_id = g.user["id"]
    today = date.today()
    month_prefix = today.strftime("%Y-%m")

    # All-time totals
    all_time = db().execute(
        """
        SELECT
            COALESCE(SUM(CASE WHEN kind='income' THEN amount END), 0) AS income,
            COALESCE(SUM(CASE WHEN kind='expense' THEN amount END), 0) AS expense,
            COUNT(*) AS total_count
        FROM transactions
        WHERE user_id=?
        """,
        (user_id,),
    ).fetchone()

    total_income = all_time["income"]
    total_expense = all_time["expense"]
    balance = total_income - total_expense

    # Current month metrics
    month_totals = db().execute(
        """
        SELECT
            COALESCE(SUM(CASE WHEN kind='income' THEN amount END), 0) AS income,
            COALESCE(SUM(CASE WHEN kind='expense' THEN amount END), 0) AS expense,
            COUNT(*) AS count
        FROM transactions
        WHERE user_id=? AND substr(transaction_date, 1, 7) = ?
        """,
        (user_id, month_prefix),
    ).fetchone()

    month_income = month_totals["income"]
    month_expense = month_totals["expense"]
    month_net = month_income - month_expense
    savings_rate = round(((month_income - month_expense) / month_income * 100), 1) if month_income > 0 else 0
    days_in_month = today.day
    avg_daily_spend = round(month_expense / max(days_in_month, 1), 2)

    # Top spending category this month
    top_cat_row = db().execute(
        """
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE user_id=? AND kind='expense' AND substr(transaction_date, 1, 7) = ?
        GROUP BY category
        ORDER BY total DESC
        LIMIT 1
        """,
        (user_id, month_prefix),
    ).fetchone()
    top_category = dict(top_cat_row) if top_cat_row else None

    # Recent transactions (latest 8)
    recent = [
        dict(row)
        for row in db().execute(
            "SELECT * FROM transactions WHERE user_id=? ORDER BY transaction_date DESC, id DESC LIMIT 8",
            (user_id,),
        ).fetchall()
    ]

    # Budgets progress for current month
    budgets = [
        dict(row)
        for row in db().execute(
            """
            SELECT
                b.id,
                b.category,
                b.monthly_limit,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            LEFT JOIN transactions t
                ON t.user_id = b.user_id
                AND t.category = b.category
                AND t.kind = 'expense'
                AND substr(t.transaction_date, 1, 7) = ?
            WHERE b.user_id = ?
            GROUP BY b.id
            ORDER BY (COALESCE(SUM(t.amount), 0) / b.monthly_limit) DESC
            """,
            (month_prefix, user_id),
        ).fetchall()
    ]

    # Goals
    goals = [
        dict(row)
        for row in db().execute(
            "SELECT * FROM goals WHERE user_id=? ORDER BY id DESC LIMIT 3",
            (user_id,),
        ).fetchall()
    ]

    # Upcoming recurring (next 14 days)
    two_weeks_out = (today + timedelta(days=14)).isoformat()
    upcoming_recurring = [
        dict(row)
        for row in db().execute(
            """
            SELECT * FROM recurring_transactions
            WHERE user_id=? AND active=1 AND next_due_date <= ?
            ORDER BY next_due_date ASC
            LIMIT 4
            """,
            (user_id, two_weeks_out),
        ).fetchall()
    ]

    return jsonify({
        "success": True,
        "metrics": {
            "balance": balance,
            "total_income": total_income,
            "total_expense": total_expense,
            "month_income": month_income,
            "month_expense": month_expense,
            "month_net": month_net,
            "savings_rate": savings_rate,
            "avg_daily_spend": avg_daily_spend,
            "total_count": all_time["total_count"],
            "top_category": top_category,
        },
        "recent_transactions": recent,
        "budgets": budgets,
        "goals": goals,
        "upcoming_recurring": upcoming_recurring,
        "categories": CATEGORIES,
        "payment_methods": PAYMENT_METHODS,
        "currency": g.user["currency"],
    })


# ---------------------------------------------------------------------------
# Transactions Endpoints
# ---------------------------------------------------------------------------


def query_transactions(user_id: int):
    conditions, params = ["user_id = ?"], [user_id]
    args = request.args

    q = (args.get("q") or "").strip()
    if q:
        conditions.append("(title LIKE ? OR note LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])

    category = (args.get("category") or "").strip()
    if category:
        conditions.append("category = ?")
        params.append(category)

    method = (args.get("method") or "").strip()
    if method:
        conditions.append("payment_method = ?")
        params.append(method)

    kind = (args.get("kind") or "").strip()
    if kind in ("income", "expense"):
        conditions.append("kind = ?")
        params.append(kind)

    from_date = (args.get("from_date") or "").strip()
    if from_date:
        conditions.append("transaction_date >= ?")
        params.append(from_date)

    to_date = (args.get("to_date") or "").strip()
    if to_date:
        conditions.append("transaction_date <= ?")
        params.append(to_date)

    min_amount = args.get("min_amount")
    if min_amount:
        try:
            conditions.append("amount >= ?")
            params.append(float(min_amount))
        except ValueError:
            pass

    max_amount = args.get("max_amount")
    if max_amount:
        try:
            conditions.append("amount <= ?")
            params.append(float(max_amount))
        except ValueError:
            pass

    sort = args.get("sort", "date_desc")
    sort_sql = {
        "date_desc": "transaction_date DESC, id DESC",
        "date_asc": "transaction_date ASC, id ASC",
        "amount_desc": "amount DESC",
        "amount_asc": "amount ASC",
        "title_asc": "title ASC",
    }.get(sort, "transaction_date DESC, id DESC")

    sql = f"SELECT * FROM transactions WHERE {' AND '.join(conditions)} ORDER BY {sort_sql}"
    rows = db().execute(sql, params).fetchall()
    return [dict(r) for r in rows]


@app.route("/api/transactions", methods=["GET"])
@auth_required
def api_get_transactions():
    transactions = query_transactions(g.user["id"])
    total_income = sum(t["amount"] for t in transactions if t["kind"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["kind"] == "expense")

    return jsonify({
        "success": True,
        "count": len(transactions),
        "total_income": total_income,
        "total_expense": total_expense,
        "net": total_income - total_expense,
        "transactions": transactions,
    })


@app.route("/api/transactions", methods=["POST"])
@auth_required
def api_create_transaction():
    data = request.get_json(silent=True) or request.form
    title = (data.get("title") or "").strip()
    kind = data.get("kind") or "expense"
    category = data.get("category") or "Other"
    payment_method = data.get("payment_method") or "Cash"
    t_date = data.get("transaction_date") or date.today().isoformat()
    note = (data.get("note") or "").strip()

    try:
        amount = float(data.get("amount") or 0)
    except ValueError:
        amount = 0

    if not title:
        return jsonify({"success": False, "error": "Description or title is required."}), 400
    if amount <= 0:
        return jsonify({"success": False, "error": "Amount must be greater than zero."}), 400
    if kind not in ("income", "expense"):
        return jsonify({"success": False, "error": "Type must be 'income' or 'expense'."}), 400
    if category not in CATEGORIES:
        category = "Other"
    if payment_method not in PAYMENT_METHODS:
        payment_method = "Other"

    cursor = db().execute(
        """
        INSERT INTO transactions (user_id, title, amount, kind, category, payment_method, transaction_date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (g.user["id"], title, amount, kind, category, payment_method, t_date, note),
    )
    db().commit()
    new_id = cursor.lastrowid
    new_tx = db().execute("SELECT * FROM transactions WHERE id=?", (new_id,)).fetchone()

    return jsonify({
        "success": True,
        "message": "Transaction added successfully.",
        "transaction": dict(new_tx),
    }), 201


@app.route("/api/transactions/<int:tx_id>", methods=["PUT"])
@auth_required
def api_update_transaction(tx_id):
    data = request.get_json(silent=True) or request.form
    existing = db().execute("SELECT * FROM transactions WHERE id=? AND user_id=?", (tx_id, g.user["id"])).fetchone()
    if not existing:
        return jsonify({"success": False, "error": "Transaction not found."}), 404

    title = (data.get("title") or existing["title"]).strip()
    kind = data.get("kind") or existing["kind"]
    category = data.get("category") or existing["category"]
    payment_method = data.get("payment_method") or existing["payment_method"]
    t_date = data.get("transaction_date") or existing["transaction_date"]
    note = (data.get("note") if "note" in data else existing["note"]).strip()

    try:
        amount = float(data.get("amount") or existing["amount"])
    except ValueError:
        amount = existing["amount"]

    if not title or amount <= 0:
        return jsonify({"success": False, "error": "Valid title and positive amount required."}), 400

    db().execute(
        """
        UPDATE transactions
        SET title=?, amount=?, kind=?, category=?, payment_method=?, transaction_date=?, note=?
        WHERE id=? AND user_id=?
        """,
        (title, amount, kind, category, payment_method, t_date, note, tx_id, g.user["id"]),
    )
    db().commit()
    updated = db().execute("SELECT * FROM transactions WHERE id=?", (tx_id,)).fetchone()
    return jsonify({"success": True, "transaction": dict(updated)})


@app.route("/api/transactions/<int:tx_id>", methods=["DELETE"])
@auth_required
def api_delete_transaction(tx_id):
    db().execute("DELETE FROM transactions WHERE id=? AND user_id=?", (tx_id, g.user["id"]))
    db().commit()
    return jsonify({"success": True, "message": "Transaction deleted."})


# ---------------------------------------------------------------------------
# Budgets Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/budgets", methods=["GET"])
@auth_required
def api_get_budgets():
    user_id = g.user["id"]
    month_prefix = date.today().strftime("%Y-%m")
    items = [
        dict(row)
        for row in db().execute(
            """
            SELECT
                b.id,
                b.category,
                b.monthly_limit,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            LEFT JOIN transactions t
                ON t.user_id = b.user_id
                AND t.category = b.category
                AND t.kind = 'expense'
                AND substr(t.transaction_date, 1, 7) = ?
            WHERE b.user_id = ?
            GROUP BY b.id
            ORDER BY b.category ASC
            """,
            (month_prefix, user_id),
        ).fetchall()
    ]
    total_budgeted = sum(i["monthly_limit"] for i in items)
    total_spent = sum(i["spent"] for i in items)

    return jsonify({
        "success": True,
        "budgets": items,
        "total_budgeted": total_budgeted,
        "total_spent": total_spent,
    })


@app.route("/api/budgets", methods=["POST"])
@auth_required
def api_save_budget():
    data = request.get_json(silent=True) or request.form
    category = (data.get("category") or "").strip()
    try:
        limit = float(data.get("monthly_limit") or 0)
    except ValueError:
        limit = 0

    if not category or category not in CATEGORIES:
        return jsonify({"success": False, "error": "Valid category required."}), 400
    if limit <= 0:
        return jsonify({"success": False, "error": "Budget limit must be greater than zero."}), 400

    db().execute(
        """
        INSERT INTO budgets (user_id, category, monthly_limit)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit=excluded.monthly_limit
        """,
        (g.user["id"], category, limit),
    )
    db().commit()
    return jsonify({"success": True, "message": f"Budget for {category} set to {limit:,.2f}."})


@app.route("/api/budgets/<int:b_id>", methods=["DELETE"])
@auth_required
def api_delete_budget(b_id):
    db().execute("DELETE FROM budgets WHERE id=? AND user_id=?", (b_id, g.user["id"]))
    db().commit()
    return jsonify({"success": True, "message": "Budget removed."})


# ---------------------------------------------------------------------------
# Goals Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/goals", methods=["GET"])
@auth_required
def api_get_goals():
    goals = [
        dict(row)
        for row in db().execute("SELECT * FROM goals WHERE user_id=? ORDER BY id DESC", (g.user["id"],)).fetchall()
    ]
    total_target = sum(g["target_amount"] for g in goals)
    total_saved = sum(g["current_amount"] for g in goals)
    progress = round((total_saved / total_target * 100), 1) if total_target > 0 else 0

    return jsonify({
        "success": True,
        "goals": goals,
        "total_target": total_target,
        "total_saved": total_saved,
        "overall_progress": progress,
    })


@app.route("/api/goals", methods=["POST"])
@auth_required
def api_create_goal():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    target_date = data.get("target_date") or None
    try:
        target = float(data.get("target_amount") or 0)
        saved = float(data.get("current_amount") or 0)
    except ValueError:
        target, saved = 0, 0

    if not name or target <= 0 or saved < 0:
        return jsonify({"success": False, "error": "Goal name and valid amounts required."}), 400

    cursor = db().execute(
        "INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?)",
        (g.user["id"], name, target, saved, target_date),
    )
    db().commit()
    return jsonify({"success": True, "id": cursor.lastrowid}), 201


@app.route("/api/goals/<int:g_id>/contribute", methods=["POST"])
@auth_required
def api_contribute_goal(g_id):
    data = request.get_json(silent=True) or request.form
    try:
        amount = float(data.get("amount") or 0)
    except ValueError:
        amount = 0

    if amount <= 0:
        return jsonify({"success": False, "error": "Contribution amount must be positive."}), 400

    db().execute(
        "UPDATE goals SET current_amount = current_amount + ? WHERE id=? AND user_id=?",
        (amount, g_id, g.user["id"]),
    )
    db().commit()
    updated = db().execute("SELECT * FROM goals WHERE id=?", (g_id,)).fetchone()
    return jsonify({"success": True, "goal": dict(updated)})


@app.route("/api/goals/<int:g_id>", methods=["DELETE"])
@auth_required
def api_delete_goal(g_id):
    db().execute("DELETE FROM goals WHERE id=? AND user_id=?", (g_id, g.user["id"]))
    db().commit()
    return jsonify({"success": True, "message": "Goal deleted."})


# ---------------------------------------------------------------------------
# Recurring Transactions Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/recurring", methods=["GET"])
@auth_required
def api_get_recurring():
    items = [
        dict(row)
        for row in db().execute(
            "SELECT * FROM recurring_transactions WHERE user_id=? ORDER BY next_due_date ASC",
            (g.user["id"],),
        ).fetchall()
    ]
    monthly_sum = sum(
        (i["amount"] * 4.33 if i["frequency"] == "weekly" else i["amount"])
        for i in items
        if i["active"] and i["kind"] == "expense"
    )
    return jsonify({
        "success": True,
        "items": items,
        "monthly_recurring_sum": monthly_sum,
    })


@app.route("/api/recurring", methods=["POST"])
@auth_required
def api_create_recurring():
    data = request.get_json(silent=True) or request.form
    title = (data.get("title") or "").strip()
    kind = data.get("kind") or "expense"
    category = data.get("category") or "Other"
    payment_method = data.get("payment_method") or "Other"
    frequency = data.get("frequency") or "monthly"
    next_due_date = data.get("next_due_date") or date.today().isoformat()
    note = (data.get("note") or "").strip()

    try:
        amount = float(data.get("amount") or 0)
    except ValueError:
        amount = 0

    if not title or amount <= 0 or frequency not in ("monthly", "weekly"):
        return jsonify({"success": False, "error": "Invalid recurring transaction inputs."}), 400

    cursor = db().execute(
        """
        INSERT INTO recurring_transactions
        (user_id, title, amount, kind, category, payment_method, frequency, next_due_date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (g.user["id"], title, amount, kind, category, payment_method, frequency, next_due_date, note),
    )
    db().commit()
    return jsonify({"success": True, "id": cursor.lastrowid}), 201


@app.route("/api/recurring/<int:r_id>/toggle", methods=["POST"])
@auth_required
def api_toggle_recurring(r_id):
    db().execute(
        "UPDATE recurring_transactions SET active=1-active WHERE id=? AND user_id=?",
        (r_id, g.user["id"]),
    )
    db().commit()
    item = db().execute("SELECT * FROM recurring_transactions WHERE id=?", (r_id,)).fetchone()
    return jsonify({"success": True, "active": item["active"]})


@app.route("/api/recurring/<int:r_id>", methods=["DELETE"])
@auth_required
def api_delete_recurring(r_id):
    db().execute("DELETE FROM recurring_transactions WHERE id=? AND user_id=?", (r_id, g.user["id"]))
    db().commit()
    return jsonify({"success": True, "message": "Recurring schedule deleted."})


# ---------------------------------------------------------------------------
# Reports & Analytics Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/reports", methods=["GET"])
@auth_required
def api_reports():
    user_id = g.user["id"]

    by_category = [
        dict(row)
        for row in db().execute(
            """
            SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
            FROM transactions
            WHERE user_id=? AND kind='expense'
            GROUP BY category
            ORDER BY total DESC
            """,
            (user_id,),
        ).fetchall()
    ]

    income_by_category = [
        dict(row)
        for row in db().execute(
            """
            SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
            FROM transactions
            WHERE user_id=? AND kind='income'
            GROUP BY category
            ORDER BY total DESC
            """,
            (user_id,),
        ).fetchall()
    ]

    by_month = [
        dict(row)
        for row in db().execute(
            """
            SELECT
                substr(transaction_date, 1, 7) AS month,
                ROUND(SUM(CASE WHEN kind='income' THEN amount ELSE 0 END), 2) AS income,
                ROUND(SUM(CASE WHEN kind='expense' THEN amount ELSE 0 END), 2) AS expense
            FROM transactions
            WHERE user_id=?
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
            """,
            (user_id,),
        ).fetchall()[::-1]
    ]

    by_method = [
        dict(row)
        for row in db().execute(
            """
            SELECT payment_method, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
            FROM transactions
            WHERE user_id=? AND kind='expense'
            GROUP BY payment_method
            ORDER BY total DESC
            """,
            (user_id,),
        ).fetchall()
    ]

    total_spent = sum(c["total"] for c in by_category)
    total_earned = sum(c["total"] for c in income_by_category)
    biggest_row = db().execute(
        "SELECT * FROM transactions WHERE user_id=? AND kind='expense' ORDER BY amount DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    biggest_expense = dict(biggest_row) if biggest_row else None

    avg_transaction = (
        db().execute(
            "SELECT AVG(amount) AS avg_amt FROM transactions WHERE user_id=? AND kind='expense'",
            (user_id,),
        ).fetchone()["avg_amt"]
        or 0
    )

    return jsonify({
        "success": True,
        "categories": by_category,
        "income_categories": income_by_category,
        "months": by_month,
        "methods": by_method,
        "total_spent": total_spent,
        "total_earned": total_earned,
        "avg_transaction": round(avg_transaction, 2),
        "biggest_expense": biggest_expense,
    })


# ---------------------------------------------------------------------------
# Data Exports (CSV, PDF, JSON)
# ---------------------------------------------------------------------------


@app.route("/api/export/csv", methods=["GET"])
@auth_required
def api_export_csv():
    rows = query_transactions(g.user["id"])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Title", "Type", "Category", "Payment Method", "Amount", "Note"])
    for r in rows:
        writer.writerow(
            [r["transaction_date"], r["title"], r["kind"], r["category"], r["payment_method"], r["amount"], r["note"]]
        )
    filename = f"spendwise_transactions_{date.today().isoformat()}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.route("/api/export/pdf", methods=["GET"])
@auth_required
def api_export_pdf():
    user = g.user
    currency = user["currency"] or "₹"
    rows = query_transactions(user["id"])

    total_income = sum(r["amount"] for r in rows if r["kind"] == "income")
    total_expense = sum(r["amount"] for r in rows if r["kind"] == "expense")
    net_savings = total_income - total_expense

    stream = io.BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    kpi_label = ParagraphStyle("KpiLabel", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#64748b"))
    kpi_val = ParagraphStyle("KpiVal", fontName="Helvetica-Bold", fontSize=13, textColor=colors.HexColor("#0f172a"))

    story = [
        Paragraph("SpendWise Financial Report", title_style),
        Paragraph(
            f"Prepared for: <b>{user['name']}</b> ({user['email']}) &nbsp;|&nbsp; Generated on: {date.today().strftime('%B %d, %Y')}",
            subtitle_style,
        ),
        Spacer(1, 6 * mm),
    ]

    summary_data = [
        [
            Paragraph("Total Income", kpi_label),
            Paragraph("Total Expenses", kpi_label),
            Paragraph("Net Cash Flow", kpi_label),
            Paragraph("Total Records", kpi_label),
        ],
        [
            Paragraph(f"<font color='#059669'>+{currency}{total_income:,.2f}</font>", kpi_val),
            Paragraph(f"<font color='#e11d48'>-{currency}{total_expense:,.2f}</font>", kpi_val),
            Paragraph(f"<b>{currency}{net_savings:,.2f}</b>", kpi_val),
            Paragraph(f"<b>{len(rows)}</b>", kpi_val),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[45 * mm, 45 * mm, 45 * mm, 45 * mm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 8 * mm))

    table_rows = [["Date", "Description", "Category", "Payment Method", "Amount"]]
    for r in rows:
        sign = "+" if r["kind"] == "income" else "-"
        amt_str = f"{sign}{currency}{r['amount']:,.2f}"
        table_rows.append(
            [
                r["transaction_date"],
                r["title"][:28] + ("..." if len(r["title"]) > 28 else ""),
                r["category"],
                r["payment_method"],
                amt_str,
            ]
        )

    if len(table_rows) == 1:
        table_rows.append(["-", "No transactions found", "-", "-", "-"])

    tx_table = Table(table_rows, colWidths=[28 * mm, 52 * mm, 38 * mm, 32 * mm, 32 * mm], repeatRows=1)
    tx_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ]
        )
    )
    story.append(tx_table)

    doc.build(story)
    stream.seek(0)
    filename = f"spendwise_report_{date.today().isoformat()}.pdf"
    return send_file(stream, as_attachment=True, download_name=filename, mimetype="application/pdf")


@app.route("/api/export/json", methods=["GET"])
@auth_required
def api_export_json():
    user_id = g.user["id"]
    data = {
        "export_date": datetime.now().isoformat(),
        "user": dict(g.user),
        "transactions": [dict(r) for r in db().execute("SELECT * FROM transactions WHERE user_id=?", (user_id,)).fetchall()],
        "budgets": [dict(r) for r in db().execute("SELECT * FROM budgets WHERE user_id=?", (user_id,)).fetchall()],
        "goals": [dict(r) for r in db().execute("SELECT * FROM goals WHERE user_id=?", (user_id,)).fetchall()],
        "recurring_transactions": [dict(r) for r in db().execute("SELECT * FROM recurring_transactions WHERE user_id=?", (user_id,)).fetchall()],
    }
    return Response(
        json.dumps(data, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=spendwise_backup_{date.today().isoformat()}.json"},
    )


# ---------------------------------------------------------------------------
# Settings & Tools
# ---------------------------------------------------------------------------


@app.route("/api/settings", methods=["GET", "PUT"])
@auth_required
def api_settings():
    if request.method == "PUT":
        data = request.get_json(silent=True) or request.form
        name = (data.get("name") or g.user["name"]).strip()
        currency = (data.get("currency") or g.user["currency"]).strip()[:5]
        theme = data.get("theme") or g.user["theme"]

        if not name:
            return jsonify({"success": False, "error": "Name cannot be empty."}), 400
        if theme not in ("light", "dark"):
            theme = "light"

        db().execute(
            "UPDATE users SET name=?, currency=?, theme=? WHERE id=?",
            (name, currency or "₹", theme, g.user["id"]),
        )
        db().commit()
        updated = db().execute("SELECT id, name, email, currency, theme FROM users WHERE id=?", (g.user["id"],)).fetchone()
        return jsonify({"success": True, "user": dict(updated)})

    return jsonify({"success": True, "user": dict(g.user), "currencies": CURRENCIES})


@app.route("/api/settings/seed-demo", methods=["POST"])
@auth_required
def api_seed_demo():
    user_id = g.user["id"]
    today = date.today()

    sample_txs = [
        ("Monthly Salary", 65000.0, "income", "Salary", "Bank Transfer", 0, "Primary job direct deposit"),
        ("Freelance Web Project", 18500.0, "income", "Freelance", "UPI", 3, "Client landing page milestone"),
        ("Monthly House Rent", 18000.0, "expense", "Rent", "Bank Transfer", 2, "Apartment rent for current month"),
        ("Supermarket Grocery Haul", 2850.0, "expense", "Food & Dining", "UPI", 1, "Weekly fruits, vegetables, essentials"),
        ("Electric & Utility Bill", 1640.0, "expense", "Bills", "UPI", 4, "State electricity board payment"),
        ("Weekend Dining Out", 1420.0, "expense", "Food & Dining", "Credit Card", 5, "Dinner with friends at Bistro"),
        ("Fuel / Petrol Fill-up", 1800.0, "expense", "Travel", "Credit Card", 6, "Full tank petrol for car"),
        ("Netflix & Spotify Subscriptions", 849.0, "expense", "Entertainment", "Debit Card", 8, "Entertainment streaming pack"),
        ("Health Insurance Premium", 2400.0, "expense", "Health", "Bank Transfer", 10, "Quarterly health care plan"),
        ("Books & Online Course", 1250.0, "expense", "Education", "UPI", 12, "Advanced Python & Finance masterclass"),
        ("New Running Shoes", 3499.0, "expense", "Shopping", "Credit Card", 14, "Sports shoes from Nike store"),
        ("Mutual Fund SIP", 5000.0, "income", "Investment", "Bank Transfer", 15, "Monthly index fund SIP deposit"),
        ("Café Coffee & Pastry", 280.0, "expense", "Food & Dining", "UPI", 0, "Morning espresso and croissant"),
    ]

    for title, amount, kind, cat, method, days_ago, note in sample_txs:
        t_date = (today - timedelta(days=days_ago)).isoformat()
        db().execute(
            """
            INSERT INTO transactions (user_id, title, amount, kind, category, payment_method, transaction_date, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, title, amount, kind, cat, method, t_date, note),
        )

    sample_budgets = [
        ("Food & Dining", 8000.0),
        ("Travel", 4500.0),
        ("Shopping", 6000.0),
        ("Bills", 4000.0),
        ("Entertainment", 3000.0),
    ]
    for cat, limit in sample_budgets:
        db().execute(
            """
            INSERT INTO budgets (user_id, category, monthly_limit)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit=excluded.monthly_limit
            """,
            (user_id, cat, limit),
        )

    sample_goals = [
        ("Emergency Safety Fund", 100000.0, 38500.0, (today + timedelta(days=180)).isoformat()),
        ("Holiday Trip to Japan", 75000.0, 24000.0, (today + timedelta(days=90)).isoformat()),
        ("New MacBook Pro M3", 140000.0, 62000.0, (today + timedelta(days=120)).isoformat()),
    ]
    for name, target, curr, target_d in sample_goals:
        db().execute(
            """
            INSERT INTO goals (user_id, name, target_amount, current_amount, target_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, name, target, curr, target_d),
        )

    sample_recurring = [
        ("Netflix Premium", 649.0, "expense", "Entertainment", "Credit Card", "monthly", (today + timedelta(days=5)).isoformat(), "4K UHD Family Plan"),
        ("Internet Fiber Broadband", 999.0, "expense", "Bills", "UPI", "monthly", (today + timedelta(days=8)).isoformat(), "300 Mbps unlimited plan"),
        ("Gym Membership", 1500.0, "expense", "Health", "UPI", "monthly", (today + timedelta(days=12)).isoformat(), "Gold gym monthly renewal"),
    ]
    for title, amount, kind, cat, method, freq, next_d, note in sample_recurring:
        db().execute(
            """
            INSERT INTO recurring_transactions (user_id, title, amount, kind, category, payment_method, frequency, next_due_date, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, title, amount, kind, cat, method, freq, next_d, note),
        )

    db().commit()
    return jsonify({"success": True, "message": "Demo financial records loaded."})


@app.route("/api/settings/clear-data", methods=["POST"])
@auth_required
def api_clear_data():
    user_id = g.user["id"]
    db().execute("DELETE FROM transactions WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM budgets WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM goals WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM recurring_transactions WHERE user_id=?", (user_id,))
    db().commit()
    return jsonify({"success": True, "message": "All financial records cleared."})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    """Serves the built React application or API status message."""
    if path.startswith("api/"):
        return jsonify({"success": False, "error": "API route not found"}), 404
    frontend_dist = ROOT.parent / "frontend" / "dist"
    if frontend_dist.exists():
        target_file = frontend_dist / path
        if target_file.is_file():
            return send_file(target_file)
        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return send_file(index_file)
    return jsonify({
        "name": "SpendWise REST API",
        "status": "online",
        "frontend": "Run 'npm run dev' inside the frontend/ folder to launch the React frontend UI on http://localhost:5173"
    }), 200


if __name__ == "__main__":
    print("==================================================")
    print(" SpendWise Flask REST API Running on Port 5000")
    print(" CORS enabled for React frontend")
    print("==================================================")
    app.run(debug=True, host="127.0.0.1", port=5000)

