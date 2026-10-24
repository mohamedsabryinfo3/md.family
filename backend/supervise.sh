#!/bin/bash
cd /home/z/my-project/backend
while true; do
    /home/z/.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning >> backend.log 2>&1
    echo "[$(date)] Backend died, restarting in 2s..." >> backend.log
    sleep 2
done
