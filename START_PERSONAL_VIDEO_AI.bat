@echo off
setlocal
title Personal Video AI Launcher

rem The launcher lives at the repository root, so it does not depend on a
rem hard-coded Personal Video AI project path.
set "PROJECT=%~dp0"
set "COMFY=C:\Program Files\Comfy Desktop\Comfy Desktop.exe"

echo ========================================
echo          PERSONAL VIDEO AI
echo ========================================
echo.

if not exist "%COMFY%" (
  echo [ERREUR] Comfy Desktop est introuvable :
  echo %COMFY%
  pause
  exit /b 1
)

if not exist "%PROJECT%backend\.venv\Scripts\python.exe" (
  echo [ERREUR] Environnement Python backend introuvable.
  echo Attendu : %PROJECT%backend\.venv\Scripts\python.exe
  pause
  exit /b 1
)

if not exist "%PROJECT%frontend\package.json" (
  echo [ERREUR] Frontend introuvable dans %PROJECT%frontend
  pause
  exit /b 1
)

echo [1/4] Verification de ComfyUI...
powershell -NoProfile -Command "if (-not (Test-NetConnection 127.0.0.1 -Port 8188 -InformationLevel Quiet)) { Start-Process '%COMFY%' }"

echo Attente de ComfyUI sur le port 8188...
powershell -NoProfile -Command "$limit=(Get-Date).AddMinutes(3); while(-not (Test-NetConnection 127.0.0.1 -Port 8188 -InformationLevel Quiet)) { if((Get-Date) -gt $limit){exit 1}; Start-Sleep 2 }"
if errorlevel 1 (
  echo [ERREUR] ComfyUI n'a pas repondu sur le port 8188.
  pause
  exit /b 1
)

echo [2/4] Verification du backend...
powershell -NoProfile -Command "exit ([int](-not (Test-NetConnection 127.0.0.1 -Port 8000 -InformationLevel Quiet)))"
if errorlevel 1 (
  start "Personal Video AI - Backend" cmd /k "cd /d "%PROJECT%backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)

echo Attente du backend sur le port 8000...
powershell -NoProfile -Command "$limit=(Get-Date).AddSeconds(30); while(-not (Test-NetConnection 127.0.0.1 -Port 8000 -InformationLevel Quiet)) { if((Get-Date) -gt $limit){exit 1}; Start-Sleep 1 }"
if errorlevel 1 (
  echo [ERREUR] Le backend n'a pas demarre sur le port 8000.
  pause
  exit /b 1
)

echo [3/4] Verification de l'interface...
powershell -NoProfile -Command "exit ([int](-not (Test-NetConnection 127.0.0.1 -Port 5173 -InformationLevel Quiet)))"
if errorlevel 1 (
  start "Personal Video AI - Frontend" cmd /k "cd /d "%PROJECT%frontend" && npm.cmd run dev"
)

echo Attente de l'interface sur le port 5173...
powershell -NoProfile -Command "$limit=(Get-Date).AddSeconds(30); while(-not (Test-NetConnection 127.0.0.1 -Port 5173 -InformationLevel Quiet)) { if((Get-Date) -gt $limit){exit 1}; Start-Sleep 1 }"
if errorlevel 1 (
  echo [ERREUR] L'interface n'a pas demarre sur le port 5173.
  pause
  exit /b 1
)

echo [4/4] Ouverture de Personal Video AI...
start "" "http://127.0.0.1:5173"

echo.
echo ========================================
echo Personal Video AI est pret.
echo ========================================
timeout /t 3 >nul
endlocal
exit /b 0
