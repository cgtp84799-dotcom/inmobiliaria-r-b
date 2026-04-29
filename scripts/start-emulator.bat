@echo off
REM ════════════════════════════════════════════════════════════════════
REM  Inmobiliaria RYB — Iniciar emulador de Firestore para tests
REM ════════════════════════════════════════════════════════════════════
REM  Este script abre el emulador de Firestore en localhost:8080.
REM  Mientras esté corriendo, en otra terminal puedes correr:
REM      npm run test:rules
REM
REM  Para cerrarlo: Ctrl+C en esta ventana.
REM ════════════════════════════════════════════════════════════════════

cd /d "%~dp0\.."

echo.
echo  Iniciando Firestore Emulator...
echo  Puerto: 8080
echo  Project ID: demo-ryb-test
echo.
echo  Espera el mensaje "All emulators ready!" antes de correr los tests.
echo.

call npx firebase emulators:start --only firestore --project demo-ryb-test

pause
