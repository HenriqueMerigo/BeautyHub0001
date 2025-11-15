#!/bin/bash
# Script para iniciar o servidor ModelHub KDS | LINUX
clear
echo "==========================================="
echo "  Iniciando Servidor ModelHub KDS..."
echo "==========================================="
echo ""

# 1. Instala as dependências caso o cliente não tenha feito
npm install

# 2. Roda o servidor Node.js
# Usar 'node server.js' diretamente para ver os logs no mesmo terminal
node server.js

echo ""
echo "==========================================="
echo "  Servidor Parou. Pressione ENTER para fechar."
echo "==========================================="

# Aguarda Enter antes de fechar
read
