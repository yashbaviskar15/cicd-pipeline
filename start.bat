@echo off
echo Starting project...
docker compose up -d
echo.
echo Project is running!
echo - Frontend: http://localhost:8080
echo - Backend:  http://localhost:3000
echo - Backend health: http://localhost:3000/health
echo.
pause