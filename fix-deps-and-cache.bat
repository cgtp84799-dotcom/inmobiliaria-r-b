@echo off
setlocal
cd /d "%~dp0"
echo Installing missing peer dependency for Recharts/Vite...
npm install react-is@^19.2.0 --save
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo Done. Now run: npm run dev
endlocal
