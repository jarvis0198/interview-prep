#!/bin/bash
# Starts both backend and frontend in parallel

export GROQ_API_KEY=${GROQ_API_KEY:-""}

if [ -z "$GROQ_API_KEY" ]; then
  echo "WARNING: GROQ_API_KEY is not set. Set it with:"
  echo "  export GROQ_API_KEY=your_key_here"
  echo ""
fi

cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting backend on :8080..."
cd backend && mvn spring-boot:run -q &
BACKEND_PID=$!
cd ..

sleep 5

echo "Starting frontend on :5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "App running at http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

wait
