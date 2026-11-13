"""
SpendWise Root Application Entry Point
Dispatches to backend.app
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import app

if __name__ == "__main__":
    print("==================================================")
    print(" SpendWise Full-Stack Application Running")
    print(" Backend: Flask REST API on Port 5000")
    print(" Frontend: React SPA served from frontend/dist")
    print(" Access Web App at: http://127.0.0.1:5000")
    print("==================================================")
    app.run(debug=True, host="127.0.0.1", port=5000)
