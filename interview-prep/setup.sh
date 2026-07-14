#!/bin/bash
# Run this once to set up the project

set -e

echo "=== Setting up Interview Prep ==="

# Check prerequisites
command -v java >/dev/null 2>&1 || { echo "Java 17+ required. Install from https://adoptium.net/"; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "Maven required. Install with: brew install maven"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required. Install from https://nodejs.org/"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL required. Install with: brew install postgresql@15"; exit 1; }

# Create DB
echo "Creating database..."
createdb interview_prep 2>/dev/null || echo "Database already exists, skipping."

# Install frontend deps
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build backend
echo "Building backend..."
cd backend && mvn dependency:resolve -q && cd ..

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Before starting, set your Groq API key:"
echo "  export GROQ_API_KEY=your_key_here"
echo "  (Get a free key at https://console.groq.com)"
echo ""
echo "To start the app:"
echo "  Terminal 1: cd backend && mvn spring-boot:run"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
