@echo off

:: Script para iniciar o servidor ModelHub KDS | WINDOWS
title ModelHub KDS - Servidor
echo.
echo ===========================================
echo   Iniciando Servidor ModelHub KDS...
echo ===========================================
echo.

:: 1. Instala as dependencias se o cliente nao o fez (opcional, mas recomendado)
call npm install

:: 2. Roda o servidor Node.js
:: O comando 'start' abre uma nova janela do CMD para o servidor
:: O comando 'call' executa o node na janela atual (recomendado para ver logs)
call node server.js

echo.
echo ===========================================
echo   Servidor Parou. Pressione qualquer tecla para fechar.
echo ===========================================
pause