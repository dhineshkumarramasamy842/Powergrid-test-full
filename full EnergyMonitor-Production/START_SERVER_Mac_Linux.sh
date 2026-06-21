#!/bin/bash
echo "================================================"
echo "  Smart Energy Monitor — Starting Server"
echo "================================================"
cd "$(dirname "$0")"
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Install with: brew install python3"
    exit 1
fi
echo "Starting server... (Ctrl+C to stop)"
echo ""
echo "Open in browser:"
echo "  Dashboard: http://localhost:8000/index.html"
echo "  Website:   http://localhost:8000/website.html"
echo "  Admin:     http://localhost:8000/admin.html"
echo ""
# Auto-open browser
if command -v open &> /dev/null; then
    sleep 1 && open http://localhost:8000/index.html &
elif command -v xdg-open &> /dev/null; then
    sleep 1 && xdg-open http://localhost:8000/index.html &
fi
python3 server.py
