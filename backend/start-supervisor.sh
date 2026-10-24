#!/usr/bin/env bash
# MD.Family backend supervisor — keeps uvicorn running across bash sessions.
# Spawns a daemon that periodically checks and restarts uvicorn if needed.
cd /home/z/my-project/backend

# Kill any prior supervisor
pkill -f "uvicorn --supervisor" 2>/dev/null
pkill -f "uvicorn app.main:app" 2>/dev/null
sleep 2

# Spawn the supervisor as a fully detached daemon
setsid /home/z/.venv/bin/python3 -c "
import subprocess, time, os, signal
log = open('/home/z/my-project/backend/backend.log', 'ab')
while True:
    proc = subprocess.Popen(
        ['/home/z/.venv/bin/python3', '-m', 'uvicorn', 'app.main:app',
         '--host', '127.0.0.1', '--port', '8000', '--log-level', 'warning'],
        stdout=log, stderr=subprocess.STDOUT,
        cwd='/home/z/my-project/backend',
    )
    print(f'[supervisor] Started uvicorn PID={proc.pid}', flush=True)
    rc = proc.wait()
    print(f'[supervisor] uvicorn exited rc={rc} — restarting in 3s', flush=True)
    time.sleep(3)
" < /dev/null > /dev/null 2>&1 &
disown $!
echo "supervisor started"
sleep 8
ps aux | grep -E "uvicorn|supervisor" | grep -v grep | head -5
echo "---"
curl -s http://localhost:8000/health 2>&1
