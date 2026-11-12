@echo off
setlocal
rem ==========================================================================
rem  Vehicle Sales Assistant - one-click launcher
rem
rem    run.bat          Start everything (database, API, web UI) and open the browser
rem    run.bat stop     Stop the API, the web UI and the database container
rem    run.bat mock     Start only the web UI against the built-in mock API
rem ==========================================================================

cd /d "%~dp0"
title Vehicle Sales Assistant

set "API_URL=http://localhost:8000"
set "WEB_URL=http://localhost:5173"
set "API_TITLE=VSA API"
set "WEB_TITLE=VSA Frontend"

if /i "%~1"=="stop" goto :stop
if /i "%~1"=="mock" goto :mock
if not "%~1"=="" (
    echo Unknown option "%~1". Use: run.bat [stop^|mock]
    exit /b 1
)

rem --------------------------------------------------------------------------
:start
echo.
echo  === Vehicle Sales Assistant ===
echo.

call :require_node || goto :fail

where docker >nul 2>&1 || (
    echo [X] Docker is not installed. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
    goto :fail
)
docker info >nul 2>&1 || (
    echo [X] Docker is not running. Start Docker Desktop, wait until it is ready, then run this again.
    goto :fail
)

rem ---- .env -----------------------------------------------------------------
if not exist ".env" (
    copy /y ".env.example" ".env" >nul
    echo [!] Created .env from .env.example.
    echo     Fill in OPENROUTER_API_KEY, POSTGRES_PASSWORD and DATABASE_URL, save, then run this again.
    start "" notepad ".env"
    goto :fail
)
findstr /c:"replace_with_your_openrouter_key" ".env" >nul && (
    echo [!] .env still contains placeholder values. Set OPENROUTER_API_KEY and the database password.
    start "" notepad ".env"
    goto :fail
)

rem ---- Python virtual environment --------------------------------------------
if not exist ".venv\Scripts\python.exe" (
    echo [1/5] Creating Python virtual environment...
    py -3.13 -m venv .venv >nul 2>&1 || py -3 -m venv .venv >nul 2>&1 || python -m venv .venv
    if not exist ".venv\Scripts\python.exe" (
        echo [X] Could not create .venv. Install Python 3.12 or 3.13 from https://www.python.org/
        goto :fail
    )
    echo       Installing backend dependencies, this can take a few minutes...
    ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :fail
    ".venv\Scripts\python.exe" -m pip install "psycopg[binary]==3.3.5" || goto :fail
) else (
    echo [1/5] Python environment found.
)

rem ---- Frontend dependencies -------------------------------------------------
call :frontend_deps || goto :fail

rem ---- Database ----------------------------------------------------------------
echo [3/5] Starting PostgreSQL (Docker)...
docker compose up -d --wait || (
    echo [X] The database container failed to start. Check: docker compose logs postgres
    goto :fail
)

rem ---- API -----------------------------------------------------------------------
curl -sf "%API_URL%/api/health" >nul 2>&1 && (
    echo [4/5] API already running at %API_URL%.
) || (
    echo [4/5] Starting API in a new window...
    start "%API_TITLE%" cmd /k ".venv\Scripts\python.exe -m uvicorn app.api.main:app --reload"
)

rem ---- Frontend --------------------------------------------------------------------
call :start_frontend
call :wait_for "%API_URL%/api/health" "API" 90 || goto :fail
call :wait_for "%WEB_URL%" "web UI" 60 || goto :fail

start "" "%WEB_URL%"
echo.
echo  Ready!
echo    Web UI    %WEB_URL%
echo    API docs  %API_URL%/docs
echo.
echo  Logs are in the "%API_TITLE%" and "%WEB_TITLE%" windows.
echo  To stop everything run:  run.bat stop
echo.
goto :eof

rem --------------------------------------------------------------------------
:mock
echo.
echo  === Vehicle Sales Assistant (mock API, no backend) ===
echo.
call :require_node || goto :fail
call :frontend_deps || goto :fail
set "VITE_USE_MOCK=true"
call :start_frontend
call :wait_for "%WEB_URL%" "web UI" 60 || goto :fail
start "" "%WEB_URL%"
echo.
echo  Ready at %WEB_URL% (mock mode). Stop with: run.bat stop
echo.
goto :eof

rem --------------------------------------------------------------------------
:stop
echo Stopping web UI and API...
taskkill /fi "WINDOWTITLE eq %WEB_TITLE%*" /t /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq %API_TITLE%*" /t /f >nul 2>&1
rem Fallback: free the ports in case the windows were renamed.
call :kill_port 5173
call :kill_port 8000
where docker >nul 2>&1 && docker info >nul 2>&1 && (
    echo Stopping database container...
    docker compose stop
)
echo Done.
goto :eof

rem ==========================================================================
rem  Helpers
rem ==========================================================================
:require_node
where npm >nul 2>&1 || (
    echo [X] Node.js / npm not found. Install Node.js 20+ from https://nodejs.org/
    exit /b 1
)
exit /b 0

:frontend_deps
if not exist "frontend\node_modules" (
    echo [2/5] Installing frontend dependencies...
    pushd frontend
    call npm install || (popd & exit /b 1)
    popd
) else (
    echo [2/5] Frontend dependencies found.
)
exit /b 0

:start_frontend
curl -sf "%WEB_URL%" >nul 2>&1 && (
    echo [5/5] Web UI already running at %WEB_URL%.
    exit /b 0
)
echo [5/5] Starting web UI in a new window...
rem Run Vite directly (not via npm) so the window keeps its title for "run.bat stop".
start "%WEB_TITLE%" /d "%~dp0frontend" cmd /k "node_modules\.bin\vite.cmd --port 5173 --strictPort"
exit /b 0

:wait_for
rem %1 = url, %2 = name, %3 = timeout in seconds
set /a "_tries=%~3/2"
<nul set /p "=      Waiting for %~2 "
:wait_loop
curl -sf "%~1" >nul 2>&1 && (
    echo  ok
    exit /b 0
)
set /a "_tries-=1"
if %_tries% leq 0 (
    echo.
    echo [X] %~2 did not start in time. Check its window for errors.
    exit /b 1
)
<nul set /p "=."
ping -n 3 127.0.0.1 >nul
goto :wait_loop

:kill_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
    taskkill /pid %%p /t /f >nul 2>&1
)
exit /b 0

:fail
echo.
pause
exit /b 1
