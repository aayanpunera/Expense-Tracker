"""
MCA Assignment: Expense Tracker Web Application
Backend: Flask REST API with JSON file persistence
"""

import os
import json
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'expenses.json')

app = Flask(__name__, static_folder=BASE_DIR)
# Enable CORS for all routes to support standalone frontend serving
CORS(app)


def load_expenses():
    """Helper function to load expenses safely from JSON storage."""
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=2)
        return []

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_expenses(expenses):
    """Helper function to save expenses safely to JSON storage."""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(expenses, f, indent=2)


# --- REST API Endpoints ---

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """GET /api/expenses: Return all expenses."""
    expenses = load_expenses()
    return jsonify({
        "success": True,
        "count": len(expenses),
        "expenses": expenses
    }), 200


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """
    POST /api/expenses: Create a new expense.
    Expected payload:
    {
        "description": "Coffee",
        "amount": 4.50,
        "category": "Food",
        "date": "2026-09-03" (optional, defaults to current date)
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid request. JSON body is required."
        }), 400

    description = data.get('description', '').strip()
    category = data.get('category', '').strip()
    raw_amount = data.get('amount')
    date_str = data.get('date', '').strip()

    # Validation
    if not description:
        return jsonify({"success": False, "error": "Description is required."}), 400

    try:
        amount = float(raw_amount)
        if amount <= 0:
            return jsonify({"success": False, "error": "Amount must be greater than 0."}), 400
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Amount must be a valid positive number."}), 400

    valid_categories = ["Food", "Transport", "Utilities", "Entertainment", "Other"]
    if not category or category not in valid_categories:
        return jsonify({
            "success": False,
            "error": f"Category must be one of: {', '.join(valid_categories)}"
        }), 400

    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    else:
        # Validate date format (YYYY-MM-DD)
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            date_str = datetime.now().strftime("%Y-%m-%d")

    new_expense = {
        "id": f"exp-{uuid.uuid4().hex[:8]}",
        "description": description,
        "amount": round(amount, 2),
        "category": category,
        "date": date_str
    }

    expenses = load_expenses()
    # Prepend or append - appending keeps chronological insertion
    expenses.append(new_expense)
    save_expenses(expenses)

    return jsonify({
        "success": True,
        "message": "Expense added successfully.",
        "expense": new_expense
    }), 201


@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """DELETE /api/expenses/<id>: Delete an expense by its ID."""
    expenses = load_expenses()
    initial_length = len(expenses)

    # Filter out item by ID
    updated_expenses = [item for item in expenses if str(item.get('id')) != str(expense_id)]

    if len(updated_expenses) == initial_length:
        return jsonify({
            "success": False,
            "error": f"Expense with ID '{expense_id}' not found."
        }), 404

    save_expenses(updated_expenses)
    return jsonify({
        "success": True,
        "message": f"Expense '{expense_id}' deleted successfully."
    }), 200


# --- Frontend Static Serving Routes ---

@app.route('/')
def serve_index():
    """Serve the single-page application entry point."""
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (style.css, script.js, icons, etc.)."""
    return send_from_directory(BASE_DIR, filename)


if __name__ == '__main__':
    # Default Flask port 5000 in debug mode
    print("==================================================")
    print(" MCA Project: Expense Tracker Server Starting")
    print(" Access Web App at: http://127.0.0.1:5000")
    print(" REST API Base URL: http://127.0.0.1:5000/api/expenses")
    print("==================================================")
    app.run(host='127.0.0.1', port=5000, debug=True)
