@echo off
echo Starting ShareSphere...

:: Kill any existing processes on these ports
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul

timeout /t 1 /nobreak >nul

:: Start Express backend in its own minimized window
start "ShareSphere API :5000" /min cmd /k "cd /d "%~dp0server" && node server.js"

timeout /t 2 /nobreak >nul

:: Start Vite frontend in its own minimized window  
start "ShareSphere UI :5173" /min cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ShareSphere is running!
echo  Backend  -- https://backend-a41z.onrender.com
echo  Frontend -- http://localhost:5173
echo.
echo  Two minimized windows are keeping the servers alive.
echo  Close "ShareSphere API" or "ShareSphere UI" window to stop them.
echo.
start "" "http://localhost:5173"
pause
