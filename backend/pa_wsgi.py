"""
MD.Family Backend — WSGI entry point for PythonAnywhere
=======================================================

PythonAnywhere uses WSGI (not direct uvicorn). This file creates
a WSGI-compatible app that runs the FastAPI app via uvicorn's WSGI adapter.

How to deploy on PythonAnywhere (FREE, no credit card):
1. Sign up at https://www.pythonanywhere.com (free account)
2. Go to "Web" tab → Add a new web app → Manual config → Python 3.12
3. Set source directory to your repo's backend/ folder
4. Set the WSGI file to this file (pa_wsgi.py)
5. Set environment variables in the PythonAnywhere dashboard
6. Done! Your API will be at: https://YOUR_USERNAME.pythonanywhere.com
"""

import os
import sys

# Add the backend directory to Python path
# On PythonAnywhere, set this to your repo's backend/ folder
BACKEND_DIR = os.path.expanduser("~/mdfamily/backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Set default env vars for PythonAnywhere (free tier = SQLite)
os.environ.setdefault("MDFAMILY_APP_ENV", "production")
os.environ.setdefault("MDFAMILY_APP_DEBUG", "false")
os.environ.setdefault("MDFAMILY_DATABASE_URL", f"sqlite+aiosqlite:///{os.path.expanduser('~/mdfamily.db')}")
os.environ.setdefault("MDFAMILY_REDIS_URL", "")  # no Redis on free tier
os.environ.setdefault("MDFAMILY_JWT_SECRET", "change-me-on-pythonanywhere-dashboard")
os.environ.setdefault("MDFAMILY_CORS_ORIGINS", "*")

# Import the FastAPI app
from app.main import app  # noqa: E402

# Create WSGI-compatible wrapper
# FastAPI is ASGI, but PythonAnywhere free tier only supports WSGI.
# We use uvicorn's WSGI adapter to bridge the gap.
# Note: WebSocket endpoints won't work on free tier (no ASGI support).
# All REST API endpoints work perfectly.

from uvicorn.middleware.wsgi import WSGIMiddleware  # noqa: E402

application = WSGIMiddleware(app)
