# DevAlert Application Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting DevAlert Application" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Activate virtual environment and run app
& ".\\.venv\Scripts\python.exe" "app.py"
