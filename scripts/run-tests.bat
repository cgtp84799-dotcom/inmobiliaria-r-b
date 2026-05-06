@echo off
REM ════════════════════════════════════════════════════════════════════
REM  Inmobiliaria RYB — Correr tests rápidos (sin emulador)
REM ════════════════════════════════════════════════════════════════════

cd /d "%~dp0\.."

echo.
echo  Corriendo suite rapida (validadores + functions + frontend)...
echo  ~5-10 segundos en hardware moderno.
echo.

call npm run test:fast

echo.
echo  Para correr tests de reglas de Firestore tambien:
echo      1. Doble-click en scripts\start-emulator.bat
echo      2. Espera a "All emulators ready!"
echo      3. En otra terminal: npm run test:rules
echo.

pause