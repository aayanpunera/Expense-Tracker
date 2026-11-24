"""
SpendWise Root Application Entry Point
Dispatches to backend.app
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("==================================================")
    print(" SpendWise Full-Stack Application Running")
    print(f" Backend: Flask REST API on Port {port}")
    print(f" Access Web App at: http://127.0.0.1:{port}")
    print("==================================================")
    app.run(debug=True, host="0.0.0.0", port=port)
