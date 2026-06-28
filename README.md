# ZESTV4 - Cardápio Digital

Este projeto é um sistema de Cardápio Digital dividido em um ecossistema Frontend (React + Vite) e Backend (Node.js + Express + MySQL).

## Estrutura do Projeto

- `/frontend`: Aplicação cliente construída em React, Vite e CSS Modules.
- `/backend`: Servidor de API seguro construído em Express, gerenciando autenticação, tokens CSRF/Nonce, banco de dados MySQL e uploads de mídias.
- `/db_backup.sql`: Backup do banco de dados MySQL.

## Como Executar Localmente

### 1. Iniciar o Backend
Navegue até a pasta `backend`, instale as dependências e inicie o servidor:
```bash
cd backend
npm install
npm run start
```
*O servidor iniciará por padrão na porta `3002`.*

### 2. Iniciar o Frontend
Navegue até a pasta `frontend`, instale as dependências e inicie o servidor de desenvolvimento:
```bash
cd frontend
npm install
npm run dev
```
*O frontend iniciará por padrão na porta `5174` (ou similar).*
