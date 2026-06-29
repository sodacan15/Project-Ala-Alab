#!/bin/bash
(cd backend && node index.js) &
BACKEND_PID=$!
(cd frontend && npm run dev) &
FRONTEND_PID=$!
wait $BACKEND_PID $FRONTEND_PID
