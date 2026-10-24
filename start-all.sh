#!/bin/bash
# MD.Family — start both backend and frontend

# Kill old processes
pkill -f uvicorn 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 3

# Start backend
cd /home/z/my-project/backend
rm -f mdfamily.db
/home/z/.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info > /home/z/my-project/backend/backend.log 2>&1 &
echo "Backend started (PID: $!)"

# Start frontend using the same pattern as .zscripts/dev.sh
cd /home/z/my-project
bun run dev > /home/z/my-project/dev.log 2>&1 &
echo "Frontend started (PID: $!)"

# Wait for both
sleep 15
curl -s http://localhost:8000/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend failed"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend failed"
