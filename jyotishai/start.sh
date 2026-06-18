#!/bin/bash

# Start the LiveKit voice agent in the background
echo "Starting LiveKit Voice Agent..."
cd /app/agent && python main.py &

# Start the FastAPI backend in the foreground on port 7860
echo "Starting FastAPI Backend..."
cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 7860
