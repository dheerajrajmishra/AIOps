Write-Host "Starting InfraSentinel AIOps Platform..." -ForegroundColor Cyan

# Start Backend API
Write-Host "Launching Backend API on http://localhost:5000..." -ForegroundColor Green
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:5000"
Start-Process -FilePath "d:\GravityProjects\AIOps\backend\InfraSentinel.Api\bin\Debug\net8.0\InfraSentinel.Api.exe" -WorkingDirectory "d:\GravityProjects\AIOps\backend\InfraSentinel.Api\bin\Debug\net8.0"

# Start Frontend
Write-Host "Launching Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\GravityProjects\AIOps\frontend'; npm run dev"

Write-Host "`nInfraSentinel is now running:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "  Swagger UI:  http://localhost:5000/swagger" -ForegroundColor White
