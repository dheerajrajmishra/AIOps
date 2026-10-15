@echo off
echo Starting InfraSentinel AIOps Platform...

echo Starting Backend API on http://localhost:5000...
start "InfraSentinel Backend" cmd /k "cd backend\InfraSentinel.Api\bin\Debug\net8.0 && set ASPNETCORE_ENVIRONMENT=Development&& set ASPNETCORE_URLS=http://localhost:5000&& InfraSentinel.Api.exe"

echo Starting Frontend on http://localhost:3000...
start "InfraSentinel Frontend" cmd /k "cd frontend && npm run dev"

echo Both services launched!
echo Frontend: http://localhost:3000
echo Backend API / Swagger: http://localhost:5000/swagger
pause
