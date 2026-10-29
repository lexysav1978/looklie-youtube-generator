@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Запускаю помощника генерации... Это окно не закрывайте, пока делаются видео.
node server.js
pause
