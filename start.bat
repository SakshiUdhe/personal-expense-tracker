@echo off
title Personal Expense Tracker and Budget Management System
echo =====================================================================
echo   Personal Expense Tracker and Budget Management System
echo   College Field Project - Launching Application...
echo =====================================================================
echo.
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000/login
echo.
echo [SERVER LOGS]
echo Press Ctrl + C at any time to stop the server.
echo.
node server.js
pause
