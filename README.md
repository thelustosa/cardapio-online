O **ZEST MENU** é um sistema moderno de cardápio digital voltado para restaurantes que buscam gerenciar e exibir seus produtos com excelência visual e agilidade.

### Principais Recursos & Funcionalidades

- **Gestão de Cardápio**: Criação e ordenação de menus e categorias personalizadas de forma interativa.
  
  ![Lista de Itens e Categorias](docs/screenshots/cardapio_lista.png)

- **Cadastro Detalhado de Pratos**: Suporte a fotos, descrições, preço, destaque, além de um painel de campos avançados (tempo de preparo, calorias, alérgenos e restrições alimentares).
  
  ![Cadastro Avançado de Prato](docs/screenshots/cadastro_avancado.png)

- **Personalização Visual & Simulador**: Alteração em tempo real do banner de capa e logotipo da loja com simulador de celular integrado.
  
  ![Personalização Visual e Simulador](docs/screenshots/personalizacao_cardapio.png)

- **Autenticação & Segurança**: Área de login e cadastro de usuários completa, integrada com controle de acessos (tokens JWT/CSRF/Nonce).
  
  ![Autenticação e Segurança](docs/screenshots/autenticacao.png)

- **Painel de Configurações da Loja**: Controle dos dias de funcionamento do restaurante, horários de abertura e períodos de operação.
  
  ![Configurações da Loja](docs/screenshots/configuracoes.png)

- **Interface Moderna & Responsiva**: Design premium com suporte a tema escuro (Dark Mode), tema claro (Light Mode) e sincronização automática com o tema do sistema operacional.
  
  ![Interface e Temas](docs/screenshots/interface_tema.png)

- **Em Desenvolvimento**: Visualização e realização de pedidos pelos clientes do restaurante através de link personalizado e código QR (QRCode).

Este projeto é dividido em um ecossistema Frontend (React + Vite) e Backend (Node.js + Express + MySQL).

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
