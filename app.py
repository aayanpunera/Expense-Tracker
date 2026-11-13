"""
SpendWise - Modern Personal Finance & Expense Tracker
A full-stack Flask application with SQLite database persistence,
dynamic analytics, responsive UI, budget & goal management, and PDF/CSV export.
"""

from __future__ import annotations

import csv
import io
import json
import sqlite3
from datetime import date, datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    Response,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    session,
    url_for,
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
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

app = Flask(__name__)
app.config.update(
    SECRET_KEY="spendwise-secure-app-secret-key-2026-production",
    DATABASE=DB_PATH,
)


def db() -> sqlite3.Connection:
    """Provides a thread-local SQLite connection with Row factory enabled."""
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    """Closes the database connection at the end of the request."""
    connection = g.pop("db", None)
    if connection:
        connection.close()


def init_db():
    """Initializes database schema if tables do not exist."""
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
def prepare_request():
    """Runs on every request: ensures tables are initialized and checks recurring items."""
    init_db()
    if session.get("user_id"):
        apply_due_recurring(session["user_id"])


def current_user():
    """Returns the authenticated user or None."""
    if not session.get("user_id"):
        return None
    return db().execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()


@app.context_processor
def inject_template_helpers():
    """Injects common variables and helper functions into all Jinja templates."""
    user = current_user()
    currency = user["currency"] if user else "₹"
    return {
        "current_user": user,
        "currency": currency,
        "categories": CATEGORIES,
        "payment_methods": PAYMENT_METHODS,
        "currencies": CURRENCIES,
        "today_date": date.today().isoformat(),
        "current_year": date.today().year,
        "current_month_str": date.today().strftime("%B %Y"),
    }


def login_required(view):
    """Decorator ensuring that only authenticated users can access the endpoint."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user():
            flash("Please log in to continue.", "error")
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


def apply_due_recurring(user_id: int):
    """Automatically records transactions for recurring schedules that have matured."""
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


def transaction_filters(user_id: int):
    """Builds filtered transaction query from query parameters."""
    conditions, params = ["user_id = ?"], [user_id]
    filters = {
        "q": request.args.get("q", "").strip(),
        "category": request.args.get("category", "").strip(),
        "method": request.args.get("method", "").strip(),
        "kind": request.args.get("kind", "").strip(),
        "from_date": request.args.get("from_date", "").strip(),
        "to_date": request.args.get("to_date", "").strip(),
        "min_amount": request.args.get("min_amount", "").strip(),
        "max_amount": request.args.get("max_amount", "").strip(),
        "sort": request.args.get("sort", "date_desc").strip(),
    }

    if filters["q"]:
        conditions.append("(title LIKE ? OR note LIKE ?)")
        search_term = f"%{filters['q']}%"
        params.extend([search_term, search_term])

    if filters["category"]:
        conditions.append("category = ?")
        params.append(filters["category"])

    if filters["method"]:
        conditions.append("payment_method = ?")
        params.append(filters["method"])

    if filters["kind"] in ("income", "expense"):
        conditions.append("kind = ?")
        params.append(filters["kind"])

    if filters["from_date"]:
        conditions.append("transaction_date >= ?")
        params.append(filters["from_date"])

    if filters["to_date"]:
        conditions.append("transaction_date <= ?")
        params.append(filters["to_date"])

    if filters["min_amount"]:
        try:
            conditions.append("amount >= ?")
            params.append(float(filters["min_amount"]))
        except ValueError:
            pass

    if filters["max_amount"]:
        try:
            conditions.append("amount <= ?")
            params.append(float(filters["max_amount"]))
        except ValueError:
            pass

    sort_order = {
        "date_desc": "transaction_date DESC, id DESC",
        "date_asc": "transaction_date ASC, id ASC",
        "amount_desc": "amount DESC",
        "amount_asc": "amount ASC",
        "title_asc": "title ASC",
    }.get(filters["sort"], "transaction_date DESC, id DESC")

    query = f"SELECT * FROM transactions WHERE {' AND '.join(conditions)} ORDER BY {sort_order}"
    rows = db().execute(query, params).fetchall()
    return rows, filters


def save_transaction(form, user_id, transaction_id=None):
    """Validates and persists a transaction record."""
    fields = {
        key: form.get(key, "").strip()
        for key in ["title", "kind", "category", "payment_method", "transaction_date", "note"]
    }
    try:
        amount = float(form.get("amount", "0"))
    except ValueError:
        amount = 0

    if not fields["transaction_date"]:
        fields["transaction_date"] = date.today().isoformat()

    if not fields["title"]:
        raise ValueError("Please provide a description or title for the transaction.")
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    if fields["kind"] not in ("income", "expense"):
        raise ValueError("Invalid transaction kind selected.")
    if fields["category"] not in CATEGORIES:
        raise ValueError("Please choose a valid category from the list.")
    if fields["payment_method"] not in PAYMENT_METHODS:
        raise ValueError("Please choose a valid payment method.")

    values = (
        fields["title"],
        amount,
        fields["kind"],
        fields["category"],
        fields["payment_method"],
        fields["transaction_date"],
        fields["note"],
    )

    if transaction_id:
        db().execute(
            """
            UPDATE transactions
            SET title=?, amount=?, kind=?, category=?, payment_method=?, transaction_date=?, note=?
            WHERE id=? AND user_id=?
            """,
            values + (transaction_id, user_id),
        )
    else:
        db().execute(
            """
            INSERT INTO transactions (title, amount, kind, category, payment_method, transaction_date, note, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            values + (user_id,),
        )
    db().commit()


# ---------------------------------------------------------------------------
# Routes: Core & Dashboard
# ---------------------------------------------------------------------------


@app.route("/")
@login_required
def dashboard():
    """Financial command center: KPIs, recent activity, budget progress, upcoming recurring."""
    user = current_user()
    user_id = user["id"]
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
    top_category = db().execute(
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

    # Recent transactions (latest 7)
    recent = db().execute(
        "SELECT * FROM transactions WHERE user_id=? ORDER BY transaction_date DESC, id DESC LIMIT 7",
        (user_id,),
    ).fetchall()

    # Budgets progress for current month
    budgets = db().execute(
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

    # Active savings goals (top 3)
    goals = db().execute(
        "SELECT * FROM goals WHERE user_id=? ORDER BY id DESC LIMIT 3",
        (user_id,),
    ).fetchall()

    # Upcoming recurring transactions (next 14 days)
    two_weeks_out = (today + timedelta(days=14)).isoformat()
    upcoming_recurring = db().execute(
        """
        SELECT * FROM recurring_transactions
        WHERE user_id=? AND active=1 AND next_due_date <= ?
        ORDER BY next_due_date ASC
        LIMIT 4
        """,
        (user_id, two_weeks_out),
    ).fetchall()

    return render_template(
        "dashboard.html",
        user=user,
        balance=balance,
        income=total_income,
        expense=total_expense,
        month_income=month_income,
        month_expense=month_expense,
        month_net=month_net,
        savings_rate=savings_rate,
        avg_daily_spend=avg_daily_spend,
        top_category=top_category,
        recent=recent,
        budgets=budgets,
        goals=goals,
        upcoming_recurring=upcoming_recurring,
        tx_count=all_time["total_count"],
    )


# ---------------------------------------------------------------------------
# Routes: Authentication
# ---------------------------------------------------------------------------


@app.route("/register", methods=["GET", "POST"])
def register():
    """Handles new user registration."""
    if current_user():
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        currency = request.form.get("currency", "₹").strip() or "₹"

        if len(name) < 2:
            flash("Please enter your full name (at least 2 characters).", "error")
        elif "@" not in email or "." not in email:
            flash("Please provide a valid email address.", "error")
        elif len(password) < 6:
            flash("Password must be at least 6 characters long.", "error")
        else:
            try:
                cursor = db().execute(
                    "INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)",
                    (name, email, generate_password_hash(password), currency),
                )
                db().commit()
                session["user_id"] = cursor.lastrowid
                flash(f"Welcome to SpendWise, {name}! Your financial journey begins.", "success")
                return redirect(url_for("dashboard"))
            except sqlite3.IntegrityError:
                flash("An account with that email already exists. Please log in.", "error")
    return render_template("auth.html", mode="register")


@app.route("/login", methods=["GET", "POST"])
def login():
    """Handles user sign in."""
    if current_user():
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            flash(f"Welcome back, {user['name']}!", "success")
            return redirect(url_for("dashboard"))
        flash("Invalid email or password. Please try again.", "error")
    return render_template("auth.html", mode="login")


@app.post("/logout")
def logout():
    """Terminates the user session."""
    session.clear()
    flash("You have been signed out.", "info")
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# Routes: Transactions & Fast Quick-Add
# ---------------------------------------------------------------------------


@app.route("/transactions")
@login_required
def transactions():
    """Transaction management page with multi-filter and search."""
    rows, filters = transaction_filters(current_user()["id"])

    # Calculate filtered stats
    total_income = sum(r["amount"] for r in rows if r["kind"] == "income")
    total_expense = sum(r["amount"] for r in rows if r["kind"] == "expense")
    net_filtered = total_income - total_expense

    return render_template(
        "transactions.html",
        transactions=rows,
        filters=filters,
        total_income=total_income,
        total_expense=total_expense,
        net_filtered=net_filtered,
        count=len(rows),
    )


@app.route("/transactions/new", methods=["GET", "POST"])
@login_required
def transaction_new():
    """Dedicated transaction insertion page."""
    if request.method == "POST":
        try:
            save_transaction(request.form, current_user()["id"])
            flash("Transaction successfully added!", "success")
            return redirect(url_for("transactions"))
        except ValueError as error:
            flash(str(error), "error")
    return render_template("transaction_form.html", transaction=None)


@app.post("/transactions/quick-add")
@login_required
def transaction_quick_add():
    """Fast insertion endpoint used by the global Quick-Add modal and dashboard widget."""
    user_id = current_user()["id"]
    return_to = request.form.get("return_to") or request.referrer or url_for("dashboard")

    # If it's an AJAX / JSON request
    if request.is_json:
        data = request.get_json()
        try:
            save_transaction(data, user_id)
            return jsonify({"success": True, "message": "Transaction recorded."}), 201
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    try:
        save_transaction(request.form, user_id)
        kind = request.form.get("kind", "expense").capitalize()
        flash(f"{kind} logged successfully!", "success")
    except ValueError as error:
        flash(str(error), "error")

    return redirect(return_to)


@app.route("/transactions/<int:transaction_id>/edit", methods=["GET", "POST"])
@login_required
def transaction_edit(transaction_id):
    """Edit an existing transaction."""
    item = db().execute(
        "SELECT * FROM transactions WHERE id=? AND user_id=?",
        (transaction_id, current_user()["id"]),
    ).fetchone()
    if not item:
        flash("Transaction not found.", "error")
        return redirect(url_for("transactions"))

    if request.method == "POST":
        try:
            save_transaction(request.form, current_user()["id"], transaction_id)
            flash("Transaction updated.", "success")
            return redirect(url_for("transactions"))
        except ValueError as error:
            flash(str(error), "error")

    return render_template("transaction_form.html", transaction=item)


@app.post("/transactions/<int:transaction_id>/delete")
@login_required
def transaction_delete(transaction_id):
    """Deletes a transaction record."""
    db().execute(
        "DELETE FROM transactions WHERE id=? AND user_id=?",
        (transaction_id, current_user()["id"]),
    )
    db().commit()
    flash("Transaction deleted.", "info")
    return redirect(request.referrer or url_for("transactions"))


# ---------------------------------------------------------------------------
# Routes: Budgets
# ---------------------------------------------------------------------------


@app.route("/budgets", methods=["GET", "POST"])
@login_required
def budgets():
    """Set and manage category spending budgets."""
    user_id = current_user()["id"]
    if request.method == "POST":
        try:
            amount = float(request.form.get("monthly_limit", "0"))
            category = request.form.get("category", "").strip()
            if amount <= 0 or category not in CATEGORIES:
                raise ValueError("Please provide a valid category and a budget limit above 0.")
            db().execute(
                """
                INSERT INTO budgets (user_id, category, monthly_limit)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit=excluded.monthly_limit
                """,
                (user_id, category, amount),
            )
            db().commit()
            flash(f"Monthly budget for '{category}' set to {amount:,.2f}.", "success")
        except ValueError as e:
            flash(str(e), "error")
        return redirect(url_for("budgets"))

    month = date.today().strftime("%Y-%m")
    items = db().execute(
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
        (month, user_id),
    ).fetchall()

    total_budgeted = sum(item["monthly_limit"] for item in items)
    total_spent_in_budgets = sum(item["spent"] for item in items)

    return render_template(
        "budgets.html",
        budgets=items,
        total_budgeted=total_budgeted,
        total_spent_in_budgets=total_spent_in_budgets,
    )


@app.post("/budgets/<int:budget_id>/delete")
@login_required
def budget_delete(budget_id):
    """Deletes a monthly budget."""
    db().execute(
        "DELETE FROM budgets WHERE id=? AND user_id=?",
        (budget_id, current_user()["id"]),
    )
    db().commit()
    flash("Budget removed.", "info")
    return redirect(url_for("budgets"))


# ---------------------------------------------------------------------------
# Routes: Savings Goals
# ---------------------------------------------------------------------------


@app.route("/goals", methods=["GET", "POST"])
@login_required
def goals():
    """Manage dedicated savings targets."""
    user_id = current_user()["id"]
    if request.method == "POST":
        try:
            target = float(request.form.get("target_amount", "0"))
            current_saved = float(request.form.get("current_amount", "0"))
            name = request.form.get("name", "").strip()
            target_date = request.form.get("target_date") or None

            if not name:
                raise ValueError("Goal name is required.")
            if target <= 0:
                raise ValueError("Target amount must be greater than zero.")
            if current_saved < 0:
                raise ValueError("Current saved amount cannot be negative.")

            db().execute(
                """
                INSERT INTO goals (user_id, name, target_amount, current_amount, target_date)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, name, target, current_saved, target_date),
            )
            db().commit()
            flash(f"Goal '{name}' created successfully!", "success")
        except ValueError as error:
            flash(str(error), "error")
        return redirect(url_for("goals"))

    user_goals = db().execute(
        "SELECT * FROM goals WHERE user_id=? ORDER BY id DESC",
        (user_id,),
    ).fetchall()

    total_target = sum(g["target_amount"] for g in user_goals)
    total_saved = sum(g["current_amount"] for g in user_goals)
    overall_progress = round((total_saved / total_target * 100), 1) if total_target > 0 else 0

    return render_template(
        "goals.html",
        goals=user_goals,
        total_target=total_target,
        total_saved=total_saved,
        overall_progress=overall_progress,
    )


@app.post("/goals/<int:goal_id>/contribute")
@login_required
def goal_contribute(goal_id):
    """Add funds toward a specific savings goal."""
    try:
        amount = float(request.form.get("amount", "0"))
        if amount <= 0:
            raise ValueError("Contribution amount must be positive.")
        db().execute(
            """
            UPDATE goals
            SET current_amount = current_amount + ?
            WHERE id = ? AND user_id = ?
            """,
            (amount, goal_id, current_user()["id"]),
        )
        db().commit()
        flash(f"Added {amount:,.2f} to your goal progress!", "success")
    except ValueError as e:
        flash(str(e), "error")
    return redirect(url_for("goals"))


@app.post("/goals/<int:goal_id>/delete")
@login_required
def goal_delete(goal_id):
    """Delete a savings goal."""
    db().execute(
        "DELETE FROM goals WHERE id=? AND user_id=?",
        (goal_id, current_user()["id"]),
    )
    db().commit()
    flash("Savings goal deleted.", "info")
    return redirect(url_for("goals"))


# ---------------------------------------------------------------------------
# Routes: Recurring Transactions
# ---------------------------------------------------------------------------


@app.route("/recurring", methods=["GET", "POST"])
@login_required
def recurring():
    """Recurring entries, subscriptions, EMIs, and bills."""
    user_id = current_user()["id"]
    if request.method == "POST":
        try:
            amount = float(request.form.get("amount", "0"))
            title = request.form.get("title", "").strip()
            kind = request.form.get("kind", "expense")
            category = request.form.get("category", "")
            method = request.form.get("payment_method", "")
            frequency = request.form.get("frequency", "monthly")
            next_due_date = request.form.get("next_due_date", date.today().isoformat())
            note = request.form.get("note", "").strip()

            if not title:
                raise ValueError("Title is required.")
            if amount <= 0:
                raise ValueError("Amount must be greater than zero.")
            if kind not in ("income", "expense"):
                raise ValueError("Invalid kind.")
            if category not in CATEGORIES or method not in PAYMENT_METHODS:
                raise ValueError("Invalid category or payment method.")
            if frequency not in ("monthly", "weekly"):
                raise ValueError("Invalid frequency.")

            db().execute(
                """
                INSERT INTO recurring_transactions
                (user_id, title, amount, kind, category, payment_method, frequency, next_due_date, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, title, amount, kind, category, method, frequency, next_due_date, note),
            )
            db().commit()
            flash(f"Recurring entry '{title}' created.", "success")
        except ValueError as error:
            flash(str(error), "error")
        return redirect(url_for("recurring"))

    items = db().execute(
        "SELECT * FROM recurring_transactions WHERE user_id=? ORDER BY next_due_date ASC",
        (user_id,),
    ).fetchall()

    monthly_recurring_sum = sum(
        (i["amount"] * 4.33 if i["frequency"] == "weekly" else i["amount"])
        for i in items
        if i["active"] and i["kind"] == "expense"
    )

    return render_template(
        "recurring.html",
        items=items,
        monthly_recurring_sum=monthly_recurring_sum,
    )


@app.post("/recurring/<int:item_id>/toggle")
@login_required
def recurring_toggle(item_id):
    """Toggles active/paused status of a recurring transaction."""
    db().execute(
        "UPDATE recurring_transactions SET active=1-active WHERE id=? AND user_id=?",
        (item_id, current_user()["id"]),
    )
    db().commit()
    return redirect(url_for("recurring"))


@app.post("/recurring/<int:item_id>/delete")
@login_required
def recurring_delete(item_id):
    """Deletes a recurring transaction."""
    db().execute(
        "DELETE FROM recurring_transactions WHERE id=? AND user_id=?",
        (item_id, current_user()["id"]),
    )
    db().commit()
    flash("Recurring schedule removed.", "info")
    return redirect(url_for("recurring"))


# ---------------------------------------------------------------------------
# Routes: Reports & Analytics
# ---------------------------------------------------------------------------


@app.route("/reports")
@login_required
def reports():
    """Deep visual analytics, category breakdown, monthly cash flow, and payment methods."""
    user_id = current_user()["id"]

    # Category breakdown for expenses
    by_category = db().execute(
        """
        SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
        FROM transactions
        WHERE user_id=? AND kind='expense'
        GROUP BY category
        ORDER BY total DESC
        """,
        (user_id,),
    ).fetchall()

    # Category breakdown for income
    income_by_category = db().execute(
        """
        SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
        FROM transactions
        WHERE user_id=? AND kind='income'
        GROUP BY category
        ORDER BY total DESC
        """,
        (user_id,),
    ).fetchall()

    # Monthly cash flow (last 12 months)
    by_month = db().execute(
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

    # Payment method breakdown
    by_method = db().execute(
        """
        SELECT payment_method, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
        FROM transactions
        WHERE user_id=? AND kind='expense'
        GROUP BY payment_method
        ORDER BY total DESC
        """,
        (user_id,),
    ).fetchall()

    # Summary metrics
    total_spent = sum(c["total"] for c in by_category)
    total_earned = sum(c["total"] for c in income_by_category)
    biggest_expense = db().execute(
        "SELECT * FROM transactions WHERE user_id=? AND kind='expense' ORDER BY amount DESC LIMIT 1",
        (user_id,),
    ).fetchone()

    avg_transaction = db().execute(
        "SELECT AVG(amount) AS avg_amt FROM transactions WHERE user_id=? AND kind='expense'",
        (user_id,),
    ).fetchone()["avg_amt"] or 0

    return render_template(
        "reports.html",
        by_category=[dict(row) for row in by_category],
        income_by_category=[dict(row) for row in income_by_category],
        by_month=[dict(row) for row in by_month],
        by_method=[dict(row) for row in by_method],
        total_spent=total_spent,
        total_earned=total_earned,
        biggest_expense=biggest_expense,
        avg_transaction=round(avg_transaction, 2),
    )


# ---------------------------------------------------------------------------
# Routes: Data Exports & Backups (CSV, PDF, JSON)
# ---------------------------------------------------------------------------


@app.route("/export/csv")
@login_required
def export_csv():
    """Generates and downloads a clean CSV export of filtered transactions."""
    rows, _ = transaction_filters(current_user()["id"])
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


@app.route("/export/pdf")
@login_required
def export_pdf():
    """Generates an executive-grade styled PDF statement using ReportLab."""
    user = current_user()
    currency = user["currency"] or "₹"
    rows, _ = transaction_filters(user["id"])

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

    # Custom styles
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

    kpi_label = ParagraphStyle(
        "KpiLabel",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
    )
    kpi_val = ParagraphStyle(
        "KpiVal",
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # Title & Header
    story.append(Paragraph("SpendWise Financial Report", title_style))
    story.append(
        Paragraph(
            f"Prepared for: <b>{user['name']}</b> ({user['email']}) &nbsp;|&nbsp; Generated on: {date.today().strftime('%B %d, %Y')}",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 6 * mm))

    # Summary KPI Table
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

    # Transactions Table
    headers = ["Date", "Description", "Category", "Payment Method", "Amount"]
    table_rows = [headers]

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

    tx_table = Table(
        table_rows,
        colWidths=[28 * mm, 52 * mm, 38 * mm, 32 * mm, 32 * mm],
        repeatRows=1,
    )
    tx_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f8fafc")],
                ),
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


@app.route("/export/json")
@login_required
def export_json():
    """Exports all user data (transactions, budgets, goals, recurring) as JSON."""
    user_id = current_user()["id"]
    data = {
        "export_date": datetime.now().isoformat(),
        "user": dict(current_user()),
        "transactions": [
            dict(r)
            for r in db().execute("SELECT * FROM transactions WHERE user_id=?", (user_id,)).fetchall()
        ],
        "budgets": [
            dict(r)
            for r in db().execute("SELECT * FROM budgets WHERE user_id=?", (user_id,)).fetchall()
        ],
        "goals": [
            dict(r)
            for r in db().execute("SELECT * FROM goals WHERE user_id=?", (user_id,)).fetchall()
        ],
        "recurring_transactions": [
            dict(r)
            for r in db().execute("SELECT * FROM recurring_transactions WHERE user_id=?", (user_id,)).fetchall()
        ],
    }
    # remove sensitive hash
    data["user"].pop("password_hash", None)

    return Response(
        json.dumps(data, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=spendwise_backup_{date.today().isoformat()}.json"},
    )


# ---------------------------------------------------------------------------
# Routes: Settings & Demo Tools
# ---------------------------------------------------------------------------


@app.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    """User preferences, appearance, currency, and data management."""
    user = current_user()
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        currency = request.form.get("currency", "₹").strip() or "₹"
        theme = request.form.get("theme", "light")

        if not name:
            flash("Please enter your name.", "error")
        elif theme not in ("light", "dark"):
            flash("Invalid theme choice.", "error")
        else:
            db().execute(
                "UPDATE users SET name=?, currency=?, theme=? WHERE id=?",
                (name, currency[:5], theme, user["id"]),
            )
            db().commit()
            flash("Preferences updated successfully!", "success")
            return redirect(url_for("settings"))

    return render_template("settings.html", user=user)


@app.post("/settings/seed-demo")
@login_required
def seed_demo_data():
    """Populates realistic demo transactions, budgets, and goals for preview."""
    user_id = current_user()["id"]
    today = date.today()

    # Sample demo transactions
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

    # Sample budgets
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

    # Sample goals
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

    # Sample recurring
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
    flash("Sample financial demo data successfully loaded!", "success")
    return redirect(url_for("dashboard"))


@app.post("/settings/clear-data")
@login_required
def clear_all_data():
    """Clears all transactions, budgets, and goals for a fresh start."""
    user_id = current_user()["id"]
    db().execute("DELETE FROM transactions WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM budgets WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM goals WHERE user_id=?", (user_id,))
    db().execute("DELETE FROM recurring_transactions WHERE user_id=?", (user_id,))
    db().commit()
    flash("All your financial records have been cleared.", "info")
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    print("==================================================")
    print(" SpendWise Personal Expense Tracker Running")
    print(" Access Web App at: http://127.0.0.1:5000")
    print("==================================================")
    app.run(debug=True, host="127.0.0.1", port=5000)
