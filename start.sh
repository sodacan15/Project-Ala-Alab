#!/bin/bash
(cd GoogleAiSTUDioOutput1 && npm run dev) &
BACKEND_PID=$!
(cd frontend && npm run dev) &
FRONTEND_PID=$!
wait $BACKEND_PID $FRONTEND_PID
