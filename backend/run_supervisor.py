import subprocess
import time
import os

os.chdir("/home/z/my-project/backend")
log = open("/home/z/my-project/backend/backend.log", "ab")

while True:
    proc = subprocess.Popen(
        ["/home/z/.venv/bin/python3", "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000", "--log-level", "info"],
        stdout=log, stderr=subprocess.STDOUT,
        cwd="/home/z/my-project/backend",
    )
    print(f"[supervisor] Started uvicorn PID={proc.pid}", flush=True)
    rc = proc.wait()
    print(f"[supervisor] uvicorn exited rc={rc} — restarting in 3s", flush=True)
    time.sleep(3)
