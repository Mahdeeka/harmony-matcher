#!/bin/bash

echo "🚀 Starting Harmony Matcher..."
echo ""

# Start backend
echo "📦 Starting Backend (Port 3001)..."
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting Frontend (Port 3000)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Harmony Matcher is running!"
echo ""
echo "📊 Admin Dashboard: http://localhost:3000/admin"
echo "🔌 API Health:      http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait
wait
