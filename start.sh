#!/bin/bash
cd backend && node index.js &
BACKEND_PID=$!
cd frontend && npm run dev
wait $BACKEND_PID
