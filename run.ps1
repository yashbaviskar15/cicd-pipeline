# CI/CD Demo Project Management Script

Write-Host "=== CI/CD Demo Project ===" -ForegroundColor Cyan

function Show-Menu {
    Write-Host "`nPlease select an option:" -ForegroundColor Yellow
    Write-Host "1. Build Docker images"
    Write-Host "2. Start project"
    Write-Host "3. Stop project"
    Write-Host "4. View logs"
    Write-Host "5. Exit"
}

function Build-Images {
    Write-Host "`nBuilding Docker images..." -ForegroundColor Green
    docker compose build
}

function Start-Project {
    Write-Host "`nStarting project..." -ForegroundColor Green
    docker compose up -d
    Write-Host "`nProject is running!" -ForegroundColor Cyan
    Write-Host "- Frontend: http://localhost:8080"
    Write-Host "- Backend:  http://localhost:3000"
    Write-Host "- Backend health: http://localhost:3000/health"
}

function Stop-Project {
    Write-Host "`nStopping project..." -ForegroundColor Green
    docker compose down
}

function View-Logs {
    Write-Host "`nViewing logs (Ctrl+C to exit)..." -ForegroundColor Green
    docker compose logs -f
}

do {
    Show-Menu
    $choice = Read-Host "`nEnter your choice"
    
    switch ($choice) {
        1 { Build-Images }
        2 { Start-Project }
        3 { Stop-Project }
        4 { View-Logs }
        5 { Write-Host "`nGoodbye!" -ForegroundColor Cyan; exit }
        default { Write-Host "`nInvalid choice! Please try again." -ForegroundColor Red }
    }
} while ($true)
