"""
MD.Family — Vercel Python Serverless Backend
=============================================
Runs the FastAPI backend as a Vercel serverless function.
Everything runs on Vercel — no separate server needed!
"""
import sys
import os

# Add backend to path
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_dir))

# Import and expose the FastAPI app
from app.main import app

# Vercel Python runtime uses this automatically
