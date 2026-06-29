# Check if Docker is running
Write-Host "=== Checking Docker Status ===" -ForegroundColor Cyan

try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker command not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Docker not installed or not in PATH" -ForegroundColor Red
    exit 1
}

try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker daemon is running!" -ForegroundColor Green
        
        Write-Host "`n=== Docker Info ===" -ForegroundColor Cyan
        $dockerInfo | Select-String "OS Type|OSType|Server Version" | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    } else {
        Write-Host "`n✗ Docker daemon is NOT running!" -ForegroundColor Red
        Write-Host "`nPlease start Docker Desktop and try again!" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "`n✗ Docker daemon is NOT running!" -ForegroundColor Red
    Write-Host "`nPlease start Docker Desktop and try again!" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Success! Docker is ready! ===" -ForegroundColor Green
Write-Host "Now you can run: docker compose build" -ForegroundColor Cyan
