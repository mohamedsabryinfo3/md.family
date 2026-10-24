#!/usr/bin/env bash
# MD.Family backend keeper — restarts uvicorn if it dies
cd "$(dirname "$0")/.."
LOG=backend.log
while true; do
  if ! pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    echo "[$(date)] Starting uvicorn..." >> $LOG
    /home/z/.venv/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning >> $LOG 2>&1 &
    PID=$!
    disown $PID
    echo "[$(date)] Started PID $PID" >> $LOG
  fi
  sleep 5
done
