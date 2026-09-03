@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 goto :error
)

if not exist dist (
  echo Building the app...
  call npm run build
  if errorlevel 1 goto :error
)

start "RelayWorks" http://localhost:8080
echo RelayWorks is starting at http://localhost:8080
echo Keep this window open while you use the local app.
call npm start
goto :end

:error
echo.
echo Unable to start RelayWorks. See the error above.
pause

:end
endlocal
