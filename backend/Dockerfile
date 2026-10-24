# MD.Family Backend — Production Dockerfile for Render/Heroku/Docker
# ==================================================================
# This Dockerfile builds a production-ready container for the FastAPI backend.
# It works with Render.com, Railway, Fly.io, or any Docker host.

FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps for psycopg2 (PostgreSQL driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ─── Runtime stage ──────────────────────────────────

FROM python:3.12-slim AS runtime

# Install only runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MDFAMILY_APP_ENV=production

WORKDIR /app

# Copy backend code
COPY backend/ .

# Create non-root user for security
RUN useradd -m -u 1000 mdfamily && chown -R mdfamily:mdfamily /app
USER mdfamily

# Expose port (Render sets $PORT dynamically)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

# Run migrations + start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --log-level info"]
