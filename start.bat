@echo off
chcp 65001 > nul
start "Frontend Server" cmd /k "cd .\frontend & npm run dev"
start "Backend Server" cmd /k "cd .\backend & npm run dev"