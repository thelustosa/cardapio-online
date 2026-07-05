<p align="center">
  <img src="docs/screenshots/autenticacao.png" width="600" alt="Zest Menu — Digital Menu"/>
</p>

<h1 align="center">🍽️ Zest Menu — Digital Menu</h1>

<p align="center">
  A complete digital menu system for restaurants featuring an administrative panel, item management, categories, and real-time mobile simulator.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MySQL-8+-4479A1?logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
</p>

---

## ✨ Features

- **📱 Menu Mockup Simulator**: Real-time mobile preview of the active menu
- **🎨 Visual Customization**: Cover banner, logo upload, and theme toggle (Dark/Light Mode)
- **📋 Menu Management**: Drag-and-drop ordering for categories, subcategories, and items
- **🍔 Advanced Dish Setup**: Pictures, price, calories, allergens, preparation time
- **🔐 Robust Security**: JWT + CSRF + Nonce + Rate Limiting + Helmet
- **⚙️ Store Settings**: Operating hours, shifts, address, contact details
- **📤 Secure File Uploads**: Multer validation with magic bytes detection

---

## 📸 Screenshots

|  Customization  |  Menu  |  Add Dish  |
|:---:|:---:|:---:|
| ![Customization](docs/screenshots/personalizacao_cardapio.png) | ![Menu](docs/screenshots/cardapio_lista.png) | ![Add Dish](docs/screenshots/cadastro_avancado.png) |

---

## 🗂️ Project Structure

```
ZESTAQUI/
├── frontend/          # React + Vite (SPA)
│   ├── src/
│   │   ├── pages/     # Register, ItemsPage, DigitalMenu, StoreSettings
│   │   ├── components/# Sidebar, navigation, etc.
│   │   └── assets/    # Icons and static media
│   └── vite.config.js
├── backend/           # Node.js + Express 5
│   ├── index.js       # App entry point (routes, middlewares, security)
│   ├── db.js          # MySQL connection pool + Circuit Breaker
│   ├── src/database/  # SQL Schema auto-creation script
│   ├── uploads/       # Directory where menu images are stored
│   └── .env.example   # Environment variables template
├── db_backup.sql      # MySQL schema dump (backup)
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites

| Tool | Minimum Version |
|:--|:--|
| [Node.js](https://nodejs.org/) | v18+ |
| [MySQL](https://dev.mysql.com/downloads/) or [MariaDB](https://mariadb.org/) | 8.0+ / 10.4+ |
| npm | v9+ (comes bundled with Node.js) |

### Step 1 — Clone the Repository

```bash
git clone https://github.com/thelustosa/cardapio-online.git
cd cardapio-online
```

### Step 2 — Database Configuration

1. Make sure your local MySQL/MariaDB server is running
2. (Optional) Create a database (the server will create it automatically if it doesn't exist):
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS zestmenu_db;"
```

### Step 3 — Backend Setup

```bash
cd backend

# Copy variables template
cp .env.example .env

# Install dependencies
npm install
```

Edit the `.env` file to match your credentials:

```env
# Database
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=       # Your MySQL Password (leave blank if none)
DB_NAME=zestmenu_db

# Security — CHANGE in production!
JWT_SECRET=CHANGE_THIS_KEY_IN_PRODUCTION

# Environment
NODE_ENV=development
PORT=3002
```

> **💡 Tip**: To generate secure crypt keys:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Step 4 — Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### Step 5 — Run Development Servers

You will need **two terminal tabs**:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
```
You should see:
```
✅ Database "zestmenu_db" guaranteed.
✅ Pool connected to DB "zestmenu_db" successfully!
Secured Server running on port 3002
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
You should see:
```
VITE v8.x.x ready in XXX ms
➜ Local: http://localhost:5174/
```

### Step 6 — Open and Enjoy

Open your browser and navigate to **http://localhost:5174** to create your account! 🎉

---

## 🔧 Production Build

To deploy this project to a live host (e.g. Hostinger, Nginx, Npm-build):

1. Set `NODE_ENV=production` inside your `.env` file
2. Generate strong secrets for JWT and AES cryptography
3. Configure your production domain inside `backend/index.js` (inside `isAllowedOrigin` CORS helper)
4. Build the client application:
```bash
cd frontend
npm run build
```
5. Serve the static assets inside `frontend/dist/` using your HTTP server (Apache, Nginx, etc.)

---

## 🛡️ Security Implementations

The API backend features several enterprise security mechanisms:

| Layer | Implementation details |
|:--|:--|
| Authentication | JWT via HttpOnly Cookies |
| Anti-CSRF | Double Submit Cookie Pattern |
| Anti-Replay | Single-use Nonce validation |
| Rate Limiting | express-rate-limit protection (global + auth endpoints) |
| HTTP Headers | Helmet (HSTS, strict CSP configurations) |
| Sanitization | XSS prevention and express-validator parameters cast |
| Database safety | SQL Circuit Breaker to prevent database overload |
| File Uploads | Magic bytes check and strict filename sanitization |

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
