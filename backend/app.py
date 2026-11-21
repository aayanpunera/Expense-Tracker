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

    CREATE TABLE IF NOT EXISTS split_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS split_group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email_or_phone TEXT DEFAULT '',
      is_owner INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES split_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS split_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      paid_by_member_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL DEFAULT 'Other',
      expense_date TEXT NOT NULL,
      split_type TEXT NOT NULL DEFAULT 'equal',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES split_groups(id) ON DELETE CASCADE,
      FOREIGN KEY(paid_by_member_id) REFERENCES split_group_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS split_expense_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      share_amount REAL NOT NULL,
      FOREIGN KEY(expense_id) REFERENCES split_expenses(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES split_group_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS split_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      from_member_id INTEGER NOT NULL,
      to_member_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      settled_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES split_groups(id) ON DELETE CASCADE,
      FOREIGN KEY(from_member_id) REFERENCES split_group_members(id) ON DELETE CASCADE,
      FOREIGN KEY(to_member_id) REFERENCES split_group_members(id) ON DELETE CASCADE
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


@app.route("/api/transactions/<int:tx_id>", methods=["GET"])
@auth_required
def api_get_transaction(tx_id):
    tx = db().execute("SELECT * FROM transactions WHERE id=? AND user_id=?", (tx_id, g.user["id"])).fetchone()
    if not tx:
        return jsonify({"success": False, "error": "Transaction not found."}), 404
    return jsonify({"success": True, "transaction": dict(tx)})


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
    db().execute("DELETE FROM split_groups WHERE user_id=?", (user_id,))
    db().commit()
    return jsonify({"success": True, "message": "All financial records cleared."})


# ============================================================================
# FEATURE 2: GROUP EXPENSE SPLITTING (SPLITWISE-STYLE)
# ============================================================================

def compute_group_debts(members, expenses, settlements):
    balances = {m["id"]: 0.0 for m in members}

    for exp in expenses:
        paid_by = exp["paid_by_member_id"]
        amount = exp["amount"]
        if paid_by in balances:
            balances[paid_by] += amount
        for share in exp.get("shares", []):
            m_id = share["member_id"]
            if m_id in balances:
                balances[m_id] -= share["share_amount"]

    for s in settlements:
        from_id = s["from_member_id"]
        to_id = s["to_member_id"]
        amt = s["amount"]
        if from_id in balances:
            balances[from_id] += amt
        if to_id in balances:
            balances[to_id] -= amt

    debtors = []
    creditors = []
    for m_id, bal in balances.items():
        round_bal = round(bal, 2)
        if round_bal < -0.01:
            debtors.append({"id": m_id, "amount": -round_bal})
        elif round_bal > 0.01:
            creditors.append({"id": m_id, "amount": round_bal})

    debtors.sort(key=lambda x: x["amount"], reverse=True)
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    member_map = {m["id"]: m for m in members}
    simplified = []
    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        settle_amt = min(debtor["amount"], creditor["amount"])
        if settle_amt > 0.01:
            simplified.append({
                "from_member": {"id": debtor["id"], "name": member_map.get(debtor["id"], {}).get("name", "Unknown")},
                "to_member": {"id": creditor["id"], "name": member_map.get(creditor["id"], {}).get("name", "Unknown")},
                "amount": round(settle_amt, 2),
            })
        debtor["amount"] -= settle_amt
        creditor["amount"] -= settle_amt
        if debtor["amount"] <= 0.01:
            i += 1
        if creditor["amount"] <= 0.01:
            j += 1

    return balances, simplified


@app.route("/api/groups", methods=["GET"])
@auth_required
def api_list_groups():
    user_id = g.user["id"]
    groups = db().execute(
        "SELECT * FROM split_groups WHERE user_id=? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()

    result = []
    for g_row in groups:
        g_id = g_row["id"]
        members = db().execute("SELECT * FROM split_group_members WHERE group_id=?", (g_id,)).fetchall()
        expenses = db().execute("SELECT * FROM split_expenses WHERE group_id=?", (g_id,)).fetchall()
        settlements = db().execute("SELECT * FROM split_settlements WHERE group_id=?", (g_id,)).fetchall()

        expenses_with_shares = []
        for exp in expenses:
            shares = db().execute("SELECT * FROM split_expense_shares WHERE expense_id=?", (exp["id"],)).fetchall()
            exp_dict = dict(exp)
            exp_dict["shares"] = [dict(s) for s in shares]
            expenses_with_shares.append(exp_dict)

        members_list = [dict(m) for m in members]
        balances, _ = compute_group_debts(members_list, expenses_with_shares, [dict(s) for s in settlements])

        # Find owner member id
        owner_member = next((m for m in members_list if m["is_owner"] == 1), None)
        user_balance = balances.get(owner_member["id"], 0.0) if owner_member else 0.0

        total_exp = sum(e["amount"] for e in expenses)
        result.append({
            "id": g_row["id"],
            "name": g_row["name"],
            "description": g_row["description"],
            "created_at": g_row["created_at"],
            "member_count": len(members_list),
            "members": members_list,
            "total_expenses": round(total_exp, 2),
            "user_net_balance": round(user_balance, 2),
        })

    return jsonify({"success": True, "groups": result})


@app.route("/api/groups", methods=["POST"])
@auth_required
def api_create_group():
    user_id = g.user["id"]
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    member_names = data.get("members") or []

    if not name:
        return jsonify({"success": False, "error": "Group name is required."}), 400

    cursor = db().cursor()
    cursor.execute(
        "INSERT INTO split_groups (user_id, name, description) VALUES (?, ?, ?)",
        (user_id, name, description),
    )
    group_id = cursor.lastrowid

    # Add logged in user as the owner member
    cursor.execute(
        "INSERT INTO split_group_members (group_id, name, is_owner) VALUES (?, ?, 1)",
        (group_id, g.user["name"] or "You"),
    )

    # Add other members
    for m in member_names:
        m_name = m.strip() if isinstance(m, str) else m.get("name", "").strip()
        if m_name and m_name.lower() != (g.user["name"] or "you").lower():
            cursor.execute(
                "INSERT INTO split_group_members (group_id, name, is_owner) VALUES (?, ?, 0)",
                (group_id, m_name),
            )

    db().commit()
    return jsonify({"success": True, "group_id": group_id, "message": "Group created successfully."}), 201


@app.route("/api/groups/<int:group_id>", methods=["GET"])
@auth_required
def api_get_group(group_id):
    user_id = g.user["id"]
    group = db().execute("SELECT * FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id)).fetchone()
    if not group:
        return jsonify({"success": False, "error": "Group not found."}), 404

    members = [dict(m) for m in db().execute("SELECT * FROM split_group_members WHERE group_id=? ORDER BY id ASC", (group_id,)).fetchall()]
    expenses_raw = db().execute("SELECT * FROM split_expenses WHERE group_id=? ORDER BY expense_date DESC, id DESC", (group_id,)).fetchall()
    settlements_raw = db().execute("SELECT * FROM split_settlements WHERE group_id=? ORDER BY settled_date DESC, id DESC", (group_id,)).fetchall()

    member_map = {m["id"]: m["name"] for m in members}

    expenses = []
    for exp in expenses_raw:
        shares = [dict(s) for s in db().execute("SELECT * FROM split_expense_shares WHERE expense_id=?", (exp["id"],)).fetchall()]
        for s in shares:
            s["member_name"] = member_map.get(s["member_id"], "Unknown")
        exp_dict = dict(exp)
        exp_dict["paid_by_name"] = member_map.get(exp["paid_by_member_id"], "Unknown")
        exp_dict["shares"] = shares
        expenses.append(exp_dict)

    settlements = []
    for s in settlements_raw:
        s_dict = dict(s)
        s_dict["from_member_name"] = member_map.get(s["from_member_id"], "Unknown")
        s_dict["to_member_name"] = member_map.get(s["to_member_id"], "Unknown")
        settlements.append(s_dict)

    balances, simplified_debts = compute_group_debts(members, expenses, settlements)

    for m in members:
        m["balance"] = round(balances.get(m["id"], 0.0), 2)

    total_spent = sum(e["amount"] for e in expenses)

    return jsonify({
        "success": True,
        "group": dict(group),
        "members": members,
        "expenses": expenses,
        "settlements": settlements,
        "simplified_debts": simplified_debts,
        "total_spent": round(total_spent, 2),
    })


@app.route("/api/groups/<int:group_id>/members", methods=["POST"])
@auth_required
def api_add_group_member(group_id):
    user_id = g.user["id"]
    group = db().execute("SELECT * FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id)).fetchone()
    if not group:
        return jsonify({"success": False, "error": "Group not found."}), 404

    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    contact = (data.get("email_or_phone") or "").strip()
    if not name:
        return jsonify({"success": False, "error": "Member name is required."}), 400

    cursor = db().cursor()
    cursor.execute(
        "INSERT INTO split_group_members (group_id, name, email_or_phone) VALUES (?, ?, ?)",
        (group_id, name, contact),
    )
    db().commit()
    return jsonify({"success": True, "member_id": cursor.lastrowid})


@app.route("/api/groups/<int:group_id>/expenses", methods=["POST"])
@auth_required
def api_add_group_expense(group_id):
    user_id = g.user["id"]
    group = db().execute("SELECT * FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id)).fetchone()
    if not group:
        return jsonify({"success": False, "error": "Group not found."}), 404

    data = request.get_json(silent=True) or request.form
    title = (data.get("title") or "").strip()
    try:
        amount = float(data.get("amount") or 0)
    except (ValueError, TypeError):
        amount = 0
    paid_by = data.get("paid_by_member_id")
    category = data.get("category") or "Other"
    expense_date = data.get("expense_date") or date.today().isoformat()
    split_type = data.get("split_type") or "equal"
    custom_shares = data.get("shares") or {}  # { member_id: share_amount }

    if not title or amount <= 0 or not paid_by:
        return jsonify({"success": False, "error": "Title, positive amount, and payer are required."}), 400

    members = db().execute("SELECT id FROM split_group_members WHERE group_id=?", (group_id,)).fetchall()
    member_ids = [m["id"] for m in members]
    if not member_ids:
        return jsonify({"success": False, "error": "Group has no members."}), 400

    cursor = db().cursor()
    cursor.execute(
        """
        INSERT INTO split_expenses (group_id, paid_by_member_id, title, amount, category, expense_date, split_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (group_id, paid_by, title, amount, category, expense_date, split_type),
    )
    expense_id = cursor.lastrowid

    # Compute shares
    if split_type == "equal" or not custom_shares:
        per_person = round(amount / len(member_ids), 2)
        diff = round(amount - (per_person * len(member_ids)), 2)
        for idx, m_id in enumerate(member_ids):
            share_val = per_person + (diff if idx == 0 else 0.0)
            cursor.execute(
                "INSERT INTO split_expense_shares (expense_id, member_id, share_amount) VALUES (?, ?, ?)",
                (expense_id, m_id, share_val),
            )
    else:
        for m_id in member_ids:
            s_val = float(custom_shares.get(str(m_id)) or custom_shares.get(m_id) or 0.0)
            cursor.execute(
                "INSERT INTO split_expense_shares (expense_id, member_id, share_amount) VALUES (?, ?, ?)",
                (expense_id, m_id, s_val),
            )

    db().commit()
    return jsonify({"success": True, "expense_id": expense_id, "message": "Expense added to group."}), 201


@app.route("/api/groups/<int:group_id>/expenses/<int:expense_id>", methods=["DELETE"])
@auth_required
def api_delete_group_expense(group_id, expense_id):
    user_id = g.user["id"]
    group = db().execute("SELECT * FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id)).fetchone()
    if not group:
        return jsonify({"success": False, "error": "Group not found."}), 404

    db().execute("DELETE FROM split_expenses WHERE id=? AND group_id=?", (expense_id, group_id))
    db().commit()
    return jsonify({"success": True, "message": "Expense deleted."})


@app.route("/api/groups/<int:group_id>/settle", methods=["POST"])
@auth_required
def api_settle_group_debt(group_id):
    user_id = g.user["id"]
    group = db().execute("SELECT * FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id)).fetchone()
    if not group:
        return jsonify({"success": False, "error": "Group not found."}), 404

    data = request.get_json(silent=True) or request.form
    from_id = data.get("from_member_id")
    to_id = data.get("to_member_id")
    try:
        amount = float(data.get("amount") or 0)
    except (ValueError, TypeError):
        amount = 0
    settled_date = data.get("settled_date") or date.today().isoformat()
    note = (data.get("note") or "").strip()

    if not from_id or not to_id or amount <= 0:
        return jsonify({"success": False, "error": "Payer, recipient, and positive amount are required."}), 400

    db().execute(
        """
        INSERT INTO split_settlements (group_id, from_member_id, to_member_id, amount, settled_date, note)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (group_id, from_id, to_id, amount, settled_date, note),
    )
    db().commit()
    return jsonify({"success": True, "message": "Settlement recorded."})


@app.route("/api/groups/<int:group_id>", methods=["DELETE"])
@auth_required
def api_delete_group(group_id):
    user_id = g.user["id"]
    db().execute("DELETE FROM split_groups WHERE id=? AND user_id=?", (group_id, user_id))
    db().commit()
    return jsonify({"success": True, "message": "Group deleted."})


# ============================================================================
# FEATURE 5: SMART BUDGET ALERTS & BILL REMINDERS
# ============================================================================

@app.route("/api/notifications", methods=["GET"])
@auth_required
def api_notifications():
    user_id = g.user["id"]
    currency = g.user["currency"] or "₹"
    today = date.today()
    month_str = today.strftime("%Y-%m")
    alerts = []

    # 1. Budget Alerts
    budgets = [dict(b) for b in db().execute("SELECT * FROM budgets WHERE user_id=?", (user_id,)).fetchall()]
    for b in budgets:
        cat = b["category"]
        limit = b["monthly_limit"]
        row = db().execute(
            """
            SELECT COALESCE(SUM(amount), 0) as spent
            FROM transactions
            WHERE user_id=? AND kind='expense' AND category=? AND strftime('%Y-%m', transaction_date)=?
            """,
            (user_id, cat, month_str),
        ).fetchone()
        spent = row["spent"]
        ratio = (spent / limit) if limit > 0 else 0

        if ratio >= 1.0:
            alerts.append({
                "id": f"budget-exceeded-{b['id']}",
                "type": "budget_danger",
                "severity": "danger",
                "title": f"Budget Exceeded: {cat}",
                "message": f"You've spent {currency}{spent:,.2f} on {cat}, exceeding your limit of {currency}{limit:,.2f} by {((ratio-1)*100):.0f}%.",
                "link": "/budgets",
                "date": today.isoformat(),
            })
        elif ratio >= 0.8:
            alerts.append({
                "id": f"budget-warn-{b['id']}",
                "type": "budget_warning",
                "severity": "warning",
                "title": f"Budget Alert: {cat}",
                "message": f"You've used {ratio*100:.0f}% of your {cat} monthly budget ({currency}{spent:,.2f} / {currency}{limit:,.2f}).",
                "link": "/budgets",
                "date": today.isoformat(),
            })

    # 2. Upcoming & Overdue Recurring Bills
    recurrings = [dict(r) for r in db().execute("SELECT * FROM recurring_transactions WHERE user_id=? AND active=1", (user_id,)).fetchall()]
    for r in recurrings:
        try:
            due_d = datetime.strptime(r["next_due_date"], "%Y-%m-%d").date()
            diff_days = (due_d - today).days
            if diff_days < 0:
                alerts.append({
                    "id": f"bill-overdue-{r['id']}",
                    "type": "bill_due",
                    "severity": "danger",
                    "title": f"Overdue Bill: {r['title']}",
                    "message": f"{r['title']} ({currency}{r['amount']:,.2f}) was due on {r['next_due_date']}.",
                    "link": "/recurring",
                    "date": r["next_due_date"],
                })
            elif diff_days == 0:
                alerts.append({
                    "id": f"bill-today-{r['id']}",
                    "type": "bill_due",
                    "severity": "warning",
                    "title": f"Bill Due Today: {r['title']}",
                    "message": f"{r['title']} ({currency}{r['amount']:,.2f}) is due today via {r['payment_method']}.",
                    "link": "/recurring",
                    "date": r["next_due_date"],
                })
            elif diff_days <= 3:
                alerts.append({
                    "id": f"bill-soon-{r['id']}",
                    "type": "bill_due",
                    "severity": "info",
                    "title": f"Upcoming Bill: {r['title']}",
                    "message": f"{r['title']} ({currency}{r['amount']:,.2f}) is due in {diff_days} day{'s' if diff_days > 1 else ''}.",
                    "link": "/recurring",
                    "date": r["next_due_date"],
                })
        except ValueError:
            pass

    # 3. Savings Goals Milestones
    goals = [dict(g) for g in db().execute("SELECT * FROM goals WHERE user_id=?", (user_id,)).fetchall()]
    for g_item in goals:
        if g_item["current_amount"] >= g_item["target_amount"]:
            alerts.append({
                "id": f"goal-done-{g_item['id']}",
                "type": "goal_milestone",
                "severity": "success",
                "title": f"🎉 Goal Reached: {g_item['name']}",
                "message": f"Congratulations! You reached your savings target of {currency}{g_item['target_amount']:,.2f}!",
                "link": "/goals",
                "date": today.isoformat(),
            })
        elif g_item.get("target_date"):
            try:
                g_due = datetime.strptime(g_item["target_date"], "%Y-%m-%d").date()
                days_left = (g_due - today).days
                if 0 <= days_left <= 7:
                    alerts.append({
                        "id": f"goal-deadline-{g_item['id']}",
                        "type": "goal_milestone",
                        "severity": "info",
                        "title": f"Target Approaching: {g_item['name']}",
                        "message": f"{days_left} day{'s' if days_left > 1 else ''} left to reach {currency}{g_item['target_amount']:,.2f} (current: {currency}{g_item['current_amount']:,.2f}).",
                        "link": "/goals",
                        "date": g_item["target_date"],
                    })
            except ValueError:
                pass

    return jsonify({"success": True, "count": len(alerts), "alerts": alerts})


# ============================================================================
# FEATURE 1: SMART RECEIPT SCANNING & PARSER (HEURISTIC + OCR)
# ============================================================================

@app.route("/api/receipts/parse", methods=["POST"])
@auth_required
def api_parse_receipt():
    import re
    data = request.get_json(silent=True) or request.form
    raw_text = (data.get("text") or "").strip()
    filename = (data.get("filename") or "receipt.jpg").strip()

    if not raw_text:
        return jsonify({"success": False, "error": "No OCR text provided to parse."}), 400

    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # 1. Parse Amount (look for total, grand total, net, or currency patterns)
    extracted_amount = 0.0
    amount_patterns = [
        re.compile(r"(?:grand\s+total|total\s+amount|net\s+total|total|amount\s+payable|balance\s+due|subtotal)[\s:]*([₹$€£]?\s*[\d,]+\.?\d*)", re.IGNORECASE),
        re.compile(r"([₹$€£]\s*[\d,]+\.?\d*)", re.IGNORECASE),
        re.compile(r"([\d,]+\.\d{2})"),
    ]

    for pat in amount_patterns:
        matches = pat.findall(raw_text)
        if matches:
            for m in reversed(matches):
                clean_m = re.sub(r"[^\d.]", "", m)
                try:
                    val = float(clean_m)
                    if 1 <= val <= 500000:
                        extracted_amount = val
                        break
                except ValueError:
                    continue
        if extracted_amount > 0:
            break

    # 2. Parse Date
    extracted_date = date.today().isoformat()
    date_patterns = [
        re.compile(r"\b(\d{4}[-/]\d{2}[-/]\d{2})\b"),  # YYYY-MM-DD
        re.compile(r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b"),  # DD-MM-YYYY or MM-DD-YYYY
        re.compile(r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b", re.IGNORECASE),
    ]
    for d_pat in date_patterns:
        d_match = d_pat.search(raw_text)
        if d_match:
            raw_d = d_match.group(1).replace("/", "-")
            parts = raw_d.split("-")
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    extracted_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                elif len(parts[2]) == 4:
                    extracted_date = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            break

    # 3. Parse Merchant / Store Name
    extracted_title = ""
    ignore_words = {"tax invoice", "receipt", "cash memo", "bill", "retail invoice", "customer copy", "welcome", "gstin", "order", "table", "token"}
    for line in lines[:6]:
        cleaned_line = re.sub(r"[^a-zA-Z0-9\s&'-]", "", line).strip()
        if len(cleaned_line) >= 3 and cleaned_line.lower() not in ignore_words and not re.search(r"^\d+$", cleaned_line):
            extracted_title = cleaned_line.title()
            break

    if not extracted_title:
        base_name = Path(filename).stem.replace("_", " ").replace("-", " ")
        extracted_title = f"{base_name.title()} Purchase"

    # 4. Auto Categorization based on text keywords
    text_lower = raw_text.lower()
    extracted_category = "Shopping"
    if any(k in text_lower for k in ["cafe", "coffee", "restaurant", "burger", "pizza", "dosa", "food", "kitchen", "biryani", "swiggy", "zomato", "dining", "bar", "bakery", "hotel"]):
        extracted_category = "Food & Dining"
    elif any(k in text_lower for k in ["fuel", "petrol", "diesel", "uber", "ola", "metro", "flight", "indigo", "railway", "irctc", "taxi", "toll", "parking"]):
        extracted_category = "Travel"
    elif any(k in text_lower for k in ["pharmacy", "medical", "hospital", "chemist", "clinic", "health", "apollo", "medplus", "diagnostic", "blood"]):
        extracted_category = "Health"
    elif any(k in text_lower for k in ["electricity", "power", "water", "broadband", "wifi", "internet", "airtel", "jio", "bescom", "gas", "cylinder"]):
        extracted_category = "Bills"
    elif any(k in text_lower for k in ["cinema", "movie", "pvr", "inox", "netflix", "prime", "spotify", "game", "theatre", "amusement"]):
        extracted_category = "Entertainment"
    elif any(k in text_lower for k in ["supermarket", "mart", "grocery", "groceries", "bazaar", "reliance", "dmart", "spencer", "store", "clothes", "zara", "h&m"]):
        extracted_category = "Shopping"

    # 5. Payment Method detection
    extracted_method = "UPI"
    if any(k in text_lower for k in ["cash", "change given", "tendered"]):
        extracted_method = "Cash"
    elif any(k in text_lower for k in ["visa", "mastercard", "credit", "amex", "card ending", "pos transaction"]):
        extracted_method = "Credit Card"
    elif any(k in text_lower for k in ["debit", "bank transfer", "neft", "rtgs", "imps"]):
        extracted_method = "Debit Card"
    elif any(k in text_lower for k in ["upi", "gpay", "phonepe", "paytm", "bhim", "qr"]):
        extracted_method = "UPI"

    return jsonify({
        "success": True,
        "parsed": {
            "title": extracted_title,
            "amount": extracted_amount,
            "transaction_date": extracted_date,
            "category": extracted_category,
            "payment_method": extracted_method,
            "note": f"Scanned via Smart Receipt OCR ({filename})",
            "raw_text": raw_text[:500],
        }
    })


# ============================================================================
# FEATURE 6: AI FINANCIAL ADVISOR & ANALYTIC INSIGHTS
# ============================================================================

@app.route("/api/ai/insights", methods=["GET"])
@auth_required
def api_ai_insights():
    user_id = g.user["id"]
    currency = g.user["currency"] or "₹"
    today = date.today()
    month_str = today.strftime("%Y-%m")

    # Get this month's financials
    txs = db().execute(
        "SELECT * FROM transactions WHERE user_id=? AND strftime('%Y-%m', transaction_date)=?",
        (user_id, month_str),
    ).fetchall()

    inc = sum(t["amount"] for t in txs if t["kind"] == "income")
    exp = sum(t["amount"] for t in txs if t["kind"] == "expense")
    net = inc - exp
    savings_rate = round((net / inc * 100), 1) if inc > 0 else 0

    # Categorize into Needs vs Wants vs Savings (50-30-20 Rule)
    needs_cats = {"Rent", "Bills", "Health", "Food & Dining", "Travel"}
    wants_cats = {"Shopping", "Entertainment", "Other"}

    needs_spent = sum(t["amount"] for t in txs if t["kind"] == "expense" and t["category"] in needs_cats)
    wants_spent = sum(t["amount"] for t in txs if t["kind"] == "expense" and t["category"] in wants_cats)

    needs_pct = round((needs_spent / inc * 100), 1) if inc > 0 else round((needs_spent / (exp or 1) * 100), 1)
    wants_pct = round((wants_spent / inc * 100), 1) if inc > 0 else round((wants_spent / (exp or 1) * 100), 1)
    actual_savings_pct = max(0, savings_rate)

    # Spending velocity
    days_in_month = (date(today.year + (today.month // 12), ((today.month % 12) + 1), 1) - timedelta(days=1)).day
    days_passed = today.day
    daily_burn = exp / max(1, days_passed)
    projected_exp = daily_burn * days_in_month

    # Top category
    cat_totals = {}
    for t in txs:
        if t["kind"] == "expense":
            cat_totals[t["category"]] = cat_totals.get(t["category"], 0.0) + t["amount"]
    top_cat = max(cat_totals.items(), key=lambda x: x[1]) if cat_totals else ("None", 0)

    insights = [
        {
            "id": "50-30-20",
            "title": "50/30/20 Budget Rule Check",
            "grade": "Balanced" if (needs_pct <= 55 and wants_pct <= 35 and actual_savings_pct >= 15) else "Optimization Needed",
            "color": "emerald" if actual_savings_pct >= 20 else "amber",
            "summary": f"Your current split is {needs_pct:.0f}% Needs, {wants_pct:.0f}% Wants, and {actual_savings_pct:.0f}% Savings.",
            "recommendation": "Target 50% Needs, 30% Wants, and 20% Savings for ideal financial health.",
            "metrics": {
                "needs_pct": needs_pct,
                "wants_pct": wants_pct,
                "savings_pct": actual_savings_pct,
            }
        },
        {
            "id": "runway",
            "title": "Month-End Burn & Cash Runway",
            "grade": "Healthy" if projected_exp <= inc else "At Risk",
            "color": "indigo" if projected_exp <= inc else "rose",
            "summary": f"Daily average spend is {currency}{daily_burn:,.2f}. Projected month-end outflow: {currency}{projected_exp:,.2f}.",
            "recommendation": f"Keep daily spending under {currency}{(inc/days_in_month):,.2f} to maintain a positive monthly cash flow." if inc > 0 else "Set up a monthly income record to unlock cash flow runway tracking.",
            "metrics": {
                "daily_burn": round(daily_burn, 2),
                "projected_month_end": round(projected_exp, 2),
                "projected_surplus": round(inc - projected_exp, 2) if inc > 0 else 0,
            }
        },
        {
            "id": "top-drain",
            "title": "Major Cost Driver",
            "grade": f"{top_cat[0]} ({round(top_cat[1] / (exp or 1) * 100):.0f}%)",
            "color": "purple",
            "summary": f"{top_cat[0]} accounts for {currency}{top_cat[1]:,.2f} of this month's total spending.",
            "recommendation": f"Trimming 10% from {top_cat[0]} will save you {currency}{(top_cat[1]*0.10):,.2f} this month alone.",
            "metrics": {
                "category": top_cat[0],
                "amount": round(top_cat[1], 2),
                "potential_saving": round(top_cat[1] * 0.10, 2),
            }
        },
        {
            "id": "goals-forecast",
            "title": "Savings Acceleration",
            "grade": f"{savings_rate:.0f}% Saved",
            "color": "teal",
            "summary": f"You have saved {currency}{max(0, net):,.2f} so far this month.",
            "recommendation": "Redirecting half of your daily discretionary spend into your goals will accelerate milestones by 30%.",
            "metrics": {
                "savings_rate": savings_rate,
                "net_saved": max(0, round(net, 2)),
            }
        }
    ]

    return jsonify({"success": True, "insights": insights})


@app.route("/api/ai/advisor", methods=["POST"])
@auth_required
def api_ai_advisor():
    user_id = g.user["id"]
    currency = g.user["currency"] or "₹"
    data = request.get_json(silent=True) or request.form
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"success": False, "error": "Please provide a question or topic."}), 400

    today = date.today()
    month_str = today.strftime("%Y-%m")

    # Financial Snapshot
    txs = db().execute(
        "SELECT * FROM transactions WHERE user_id=? AND strftime('%Y-%m', transaction_date)=?",
        (user_id, month_str),
    ).fetchall()
    inc = sum(t["amount"] for t in txs if t["kind"] == "income")
    exp = sum(t["amount"] for t in txs if t["kind"] == "expense")
    net = inc - exp
    savings_rate = round((net / inc * 100), 1) if inc > 0 else 0

    cat_totals = {}
    for t in txs:
        if t["kind"] == "expense":
            cat_totals[t["category"]] = cat_totals.get(t["category"], 0.0) + t["amount"]

    sorted_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    top_cat = sorted_cats[0] if sorted_cats else ("None", 0)

    budgets = db().execute("SELECT * FROM budgets WHERE user_id=?", (user_id,)).fetchall()
    goals = db().execute("SELECT * FROM goals WHERE user_id=?", (user_id,)).fetchall()

    q_lower = question.lower()

    # Intelligent Analytical Advisor Response Generation
    if any(k in q_lower for k in ["50/30/20", "rule", "ratio", "split"]):
        needs_cats = {"Rent", "Bills", "Health", "Food & Dining", "Travel"}
        wants_cats = {"Shopping", "Entertainment", "Other"}
        needs = sum(t["amount"] for t in txs if t["kind"] == "expense" and t["category"] in needs_cats)
        wants = sum(t["amount"] for t in txs if t["kind"] == "expense" and t["category"] in wants_cats)
        n_pct = round(needs / (inc or exp or 1) * 100)
        w_pct = round(wants / (inc or exp or 1) * 100)
        s_pct = round(max(0, net) / (inc or 1) * 100)
        reply = (
            f"### 📊 Your 50/30/20 Rule Analysis\n\n"
            f"Here is how your actual spending compares to the standard 50/30/20 financial rule this month:\n\n"
            f"- **Essential Needs (Target: 50%)**: Currently at **{n_pct}%** ({currency}{needs:,.2f})\n"
            f"- **Discretionary Wants (Target: 30%)**: Currently at **{w_pct}%** ({currency}{wants:,.2f})\n"
            f"- **Savings & Debt (Target: 20%)**: Currently at **{s_pct}%** ({currency}{max(0, net):,.2f})\n\n"
            f"**Actionable Advice**:\n"
            f"{"Your budget aligns closely with the recommended ratio! Great financial discipline." if n_pct <= 55 and w_pct <= 35 else f"Your discretionary 'Wants' are higher than recommended. Consider capping non-essential spending on {top_cat[0]} to push your savings closer to 20%."}"
        )
    elif any(k in q_lower for k in ["food", "dining", "swiggy", "zomato", "eat"]):
        food_exp = cat_totals.get("Food & Dining", 0.0)
        pct = round(food_exp / (exp or 1) * 100)
        reply = (
            f"### 🍔 Food & Dining Breakdown\n\n"
            f"- Total spent on Food & Dining this month: **{currency}{food_exp:,.2f}**\n"
            f"- Percentage of total monthly expenses: **{pct}%**\n"
            f"- Daily food spending average: **{currency}{(food_exp / max(1, today.day)):,.2f}/day**\n\n"
            f"**Recommendation**: Preparing meals at home 2 extra days a week can easily save you roughly **{currency}{(food_exp * 0.25):,.2f}** per month!"
        )
    elif any(k in q_lower for k in ["afford", "can i buy", "phone", "trip", "purchase"]):
        reply = (
            f"### 💳 Affordability Assessment\n\n"
            f"Based on your current numbers for {today.strftime('%B %Y')}:\n\n"
            f"- **Monthly Income**: {currency}{inc:,.2f}\n"
            f"- **Total Spent So Far**: {currency}{exp:,.2f}\n"
            f"- **Current Net Balance**: **{currency}{net:,.2f}**\n\n"
            f"**Verdict**:\n"
            f"{"You have a solid positive surplus! Ensure you keep at least 1 month of living expenses in reserve before making large discretionary purchases." if net > 10000 else "Your net margin is tight this month. It is safer to defer non-essential big purchases until next month or allocate towards your active savings goals first."}"
        )
    elif any(k in q_lower for k in ["cut", "save", "tips", "reduce", "budget"]):
        reply = (
            f"### 💡 Personalized Cost Reduction Strategy\n\n"
            f"Looking at your top spending areas this month:\n\n"
            + "".join([f"1. **{c[0]}**: {currency}{c[1]:,.2f} ({round(c[1]/(exp or 1)*100)}% of total)\n" for c in sorted_cats[:3]])
            + f"\n**3 Quick Ways to Save More**:\n"
            f"- Set a strict monthly budget on **{top_cat[0]}** in the [Budgets](/budgets) tab.\n"
            f"- Review your recurring subscriptions in [Recurring Bills](/recurring) to cancel unused services.\n"
            f"- Set an automated goal contribution for your top goals in [Savings Goals](/goals) right on payday."
        )
    else:
        reply = (
            f"### 📈 Comprehensive Monthly Financial Health Check\n\n"
            f"Here is your financial status for **{today.strftime('%B %Y')}**:\n\n"
            f"| Metric | Amount | Status |\n"
            f"| :--- | :--- | :--- |\n"
            f"| **Total Inflow** | {currency}{inc:,.2f} | Income |\n"
            f"| **Total Outflow** | {currency}{exp:,.2f} | Expense |\n"
            f"| **Net Savings** | **{currency}{net:,.2f}** | {'Surplus' if net >= 0 else 'Deficit'} |\n"
            f"| **Savings Rate** | **{savings_rate}%** | {'Good' if savings_rate >= 20 else 'Needs Attention'} |\n\n"
            f"- **Primary Expense Category**: **{top_cat[0]}** ({currency}{top_cat[1]:,.2f})\n"
            f"- **Active Budgets**: {len(budgets)} set up\n"
            f"- **Active Goals**: {len(goals)} in progress\n\n"
            f"Ask me anything specific, like *'How can I save more?'*, *'How much did I spend on food?'*, or *'Check my 50/30/20 rule'*!"
        )

    return jsonify({"success": True, "answer": reply})



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

