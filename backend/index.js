import dotenv from 'dotenv';
// ================= CRITICAL: dotenv MUST be called BEFORE any process.env usage ================= //
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import xss from 'xss';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import { fileTypeFromFile } from 'file-type';
import fs from 'fs/promises';
import { body, param, validationResult } from 'express-validator';
import hpp from 'hpp';

import { initializeDatabase } from './src/database/initializeDatabase.js';

const __filename = fileURLToPath(import.meta.url);

// ================= AUDIT LOGGING (WINSTON) ================= //
// Imutabilidade (Object.freeze): Previne Pollution/Alterações Mapeadas
const sensitiveKeys = Object.freeze(['senha', 'password', 'token', 'cpf', 'cnpj']);
const allowedMimeTypesGlobal = Object.freeze(['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']);

const redactLogs = winston.format((info) => {
  const mask = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) mask(obj[key]);
      else if (sensitiveKeys.includes(key.toLowerCase())) obj[key] = '[REDACTED]';
    }
  };
  mask(info);
  return info;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    redactLogs(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security-audit.log', level: 'warn' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  ],
});
const __dirname = path.dirname(__filename);
import pool from './db.js';
import { safeQuery } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zest-super-secret-key-2024';

// Constant-Time Comparison contra Timing Attacks
const timingSafeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

// Environment variable for Crypto (must be 32 bytes/256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// Helpers de Criptografia Level-App para PII (Identificadores Sensíveis)
const encrypt = (text) => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    return text;
  }
};

const decrypt = (hash) => {
  if (!hash || typeof hash !== 'string' || !hash.includes(':')) return hash; // Tolerância para legados não encriptados
  try {
    const parts = hash.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    return hash;
  }
};

// ================= VIRTUAL PATCHING & LOGICAL RLS ================= //
// Wrapper de Injeção de Contexto Contínuo para o Banco de Dados
const execRLSQuery = async (queryTemplate, params, userStoreId) => {
  // Policy Engine: Rejeita processamento a nível lógico se o motor SQL não tiver WHERE com o Tenant amarrado
  if (!queryTemplate.toLowerCase().includes('and store_id = ?')) {
    throw new Error('RLS Violation DETECTED: Cláusula Tenant Omitida Desta Rota Crítica.');
  }
  return pool.query(queryTemplate, [...params, userStoreId]);
};

const app = express();

// ================= SECURITY.TXT (RFC 9116) ================= //
// Descoberta Segura (White Hat Hacker Policy)
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.send(`Contact: mailto:security@zestmenu.local
Expires: 2029-12-31T23:59:59.000Z
Preferred-Languages: pt-BR, en
Acknowledgments: https://zestmenu.local/hall-of-fame`);
});

// Defesa DoS: Limite restrito de tamanho do Payload JSON (20MB para suportar fotos de capa em base64 e cardápios complexos)
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. HTTP Headers Security (HSTS, CSP & Report-To Tracking)
// ================= MIDDLEWARES DE SEGURANÇA (ORDER CRITICAL) ================= //

// 1. CORS MANUAL (DYNAMIC ORIGIN REFLECT - HOSTINGER COMPATIBILITY)
// Whitelist baseada em domínio para compatibilidade com proxy Apache da Hostinger
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Same-origin requests (sem header Origin) são permitidas
  const normalized = origin.replace(/\/+$/, '').toLowerCase(); // Remove trailing slashes
  
  // Localhost (desenvolvimento)
  if (normalized.startsWith('http://localhost:')) return true;
  
  // Domínio de produção (qualquer subdomínio de zestmenu.com.br)
  if (normalized.endsWith('.zestmenu.com.br') || normalized === 'https://zestmenu.com.br') return true;
  
  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Reflete a origem se for autorizada (necessário para Hostinger com proxy Apache)
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, CSRF-Token, X-Nonce-Token');

  // Intercepta e responde Preflight (OPTIONS) instantaneamente com sucesso
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// 2. HTTP Headers Security (HSTS, CSP & Report-To Tracking)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://api.zestmenu.com.br", "https://zestmenu.com.br"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.zestmenu.com.br", "https://zestmenu.com.br"],
      reportUri: '/api/csp-violation'
    },
  },
  hsts: {
    maxAge: 31536000, 
    includeSubDomains: true,
    preload: true
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 3. CSRF Protection
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.zestmenu.com.br' : undefined
  }
});

// 4. Rate Limiting Geral
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Limite aumentado de 100 para 500
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api', globalLimiter);

// 5. Rate Limiting Estrito para Auth e Mutação de Dados (Spam Prevention)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limite aumentado de 10 para 50
  message: { error: 'Limite de tentativas excedido. Tente novamente em 15 minutos.' }
});

const dataMutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // Limite estrito de 100 requests por minuto em endpoints vitais
  message: { error: 'Rate Limit (100 req/min) excedido. Tente novamente em 60 segundos.' }
});

// 6. XSS Sanitization Middleware (Enhanced for Arrays deep-scan)
const cleanObj = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'string') obj[index] = xss(item.trim());
      else if (typeof item === 'object' && item !== null) cleanObj(item);
    });
  } else {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Pula sanitização XSS e truncamento para campos de mídia (base64)
        if (['image', 'promo_banner', 'logo'].includes(key)) {
          continue;
        }
        // Removemos o truncamento de 5000 chars para permitir descrições longas
        obj[key] = xss(obj[key].trim());
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        cleanObj(obj[key]);
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body) cleanObj(req.body);
  if (req.query) cleanObj(req.query);
  if (req.params) cleanObj(req.params);
  next();
});

// 7. HPP (HTTP Parameter Pollution Protection)
// Previne ataques de poluição de parâmetros duplicados em query strings
// Ex: ?store_id=1&store_id=2 → mantém apenas o último valor
app.use(hpp());

// ================= PROTEÇÃO DE BRUTE FORCE & LOCKOUT ================= //
const bruteForceMap = new Map();
const bruteForceMiddleware = (req, res, next) => {
  const ip = req.ip;
  const identifier = req.body.email ? `${ip}-${req.body.email}` : ip;

  const attempts = bruteForceMap.get(identifier) || { count: 0, firstAttempt: Date.now() };

  // Limpa contador após 15 minutos de Lockout
  if (Date.now() - attempts.firstAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
    attempts.firstAttempt = Date.now();
  }

  // 5 tentativas máximas
  if (attempts.count >= 5) {
    logger.warn(`[BRUTE FORCE FIREWALL] Conta/IP ${identifier} bloqueado por 15 minutos após 5 acessos inválidos.`);
    return res.status(429).json({ error: 'Lockout Temporário: Conta (ou IP) bloqueada devido a múltiplas falhas de autenticação. Tente novamente em 15 minutos.' });
  }

  bruteForceMap.set(identifier, attempts);
  req.lockoutIdentifier = identifier;
  next();
};

const recordFailedAttempt = (identifier) => {
  if (bruteForceMap.has(identifier)) {
    bruteForceMap.get(identifier).count += 1;
  }
};

const clearFailedAttempts = (identifier) => {
  bruteForceMap.delete(identifier);
};

// ================= SESSÃO INVALÍDÁVEL & RBAC ================= //

// 7. JWT Authentication Middleware (Com Revogação Global via Token Version)
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    logger.warn(`[SECURITY] Tentativa de acesso sem token. URL: ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);

    // Revogação de Sessão em Tempo Real & Injeção de Privilégios (RBAC)
    const [rows] = await pool.query('SELECT token_version, role FROM stores WHERE id = ?', [verified.storeId]);
    if (rows.length === 0 || rows[0].token_version !== verified.token_version) {
      logger.warn(`[SECURITY SESSION] Sessão Interceptada/Antiga rejeitada. UserID: ${verified.storeId}. IP: ${req.ip}`);
      res.clearCookie('token'); // Kill session local
      return res.status(401).json({ error: 'Sua sessão expirou ou foi revogada remotamente. Faça login novamente.' });
    }

    req.user = { ...verified, role: rows[0].role }; // Elevate permissions safely based on DB state
    next();
  } catch (err) {
    logger.warn(`[SECURITY] Token JWT inválido/expirado utilizado. IP: ${req.ip}`);
    res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

// 8. Role-Based Access Control (RBAC)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`[SECURITY RBAC] Bloqueio de Acesso. UserID: ${req.user.storeId} Role '${req.user.role}' tentou chamar API estrita. IP: ${req.ip}`);
      return res.status(403).json({ error: 'Permissões de administrador insuficientes para acessar este recurso.' });
    }
    next();
  };
};

// 7. Double-Post Protection (Nonce System)
const nonces = new Map();
const nonceMiddleware = (req, res, next) => {
  if (['POST', 'PUT'].includes(req.method)) {
    const nonce = req.headers['x-nonce-token'] || req.body.nonce;
    if (!nonce) {
      return res.status(400).json({ error: 'Security Exception: Nonce token is required.' });
    }
    if (nonces.has(nonce)) {
      return res.status(409).json({ error: 'Security Exception: Duplicated request (Double Post).' });
    }
    nonces.set(nonce, Date.now());

    // Memory cleanup: Delete nonces older than 2 minutes
    for (const [key, time] of nonces.entries()) {
      if (Date.now() - time > 120000) nonces.delete(key);
    }
  }
  next();
};

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Erro: O upload suporta apenas imagens e vídeos!"));
  }
});

// Rota de Teste de Raiz (Diagnóstico Hostinger)
app.get('/', (req, res) => {
  res.json({ message: '🚀 ZestMenu API Online e Operante!', version: '4.0.0-prod' });
});

// ================= ROTAS DE ACESSO A TOKENS ================= //

// Rota para Frontend pegar CSRF
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Rota para Frontend pegar Nonce provisório para forms
app.get('/api/nonce', (req, res) => {
  const nonce = crypto.randomUUID();
  res.json({ nonce });
});

// Health check (seguro de acessar)
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({ status: 'OK', database: 'CONNECTED', solution: rows[0].solution });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// ================= ROTAS DE CARDÁPIO ================= //

// Categorias
app.get('/api/categories/:storeId', authenticateToken, async (req, res) => {
  // BOLA: Ensure user can only see their own store categories
  if (Number(req.params.storeId) !== req.user.storeId) {
    return res.status(403).json({ error: 'Autorização negada para esta loja.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC', [req.params.storeId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/reorder', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { categories } = req.body; // Expecting [{id, sort_order}, ...]
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Lista de categorias inválida.' });
  }

  try {
    for (const cat of categories) {
      await pool.query('UPDATE categories SET sort_order = ? WHERE id = ? AND store_id = ?', [cat.sort_order, cat.id, req.user.storeId]);
    }
    res.json({ message: 'Ordem atualizada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { store_id, name, description, subcategories } = req.body;
  if (!store_id || !name) return res.status(400).json({ error: 'Store ID and Name are required' });

  // BOLA check
  if (Number(store_id) !== req.user.storeId) {
    return res.status(403).json({ error: 'Você não tem permissão para criar categorias nesta loja.' });
  }

  try {
    const subcatsJson = subcategories ? JSON.stringify(subcategories) : null;
    const [result] = await pool.query(
      'INSERT INTO categories (store_id, name, description, subcategories) VALUES (?, ?, ?, ?)',
      [store_id, name, description, subcatsJson]
    );
    res.status(201).json({ id: result.insertId, name, description, subcategories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, subcategories } = req.body;

  try {
    const subcatsJson = subcategories ? JSON.stringify(subcategories) : null;
    await pool.query(
      'UPDATE categories SET name = ?, description = ?, subcategories = ? WHERE id = ? AND store_id = ?',
      [name, description, subcatsJson, id, req.user.storeId]
    );
    res.json({ message: 'Categoria atualizada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories/delete/:id', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = ? AND store_id = ?', [id, req.user.storeId]);
    res.json({ message: 'Categoria excluída com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Itens
app.get('/api/items/:storeId', authenticateToken, async (req, res) => {
  if (Number(req.params.storeId) !== req.user.storeId) {
    return res.status(403).json({ error: 'Autorização negada para esta loja.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE store_id = ?', [req.params.storeId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/items', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const {
    store_id, category_name, subcategory_name, name, price, description, image,
    status, popular, tag, prep_time, calories, kitchen_station, allergens, dietary_flags
  } = req.body;

  if (Number(store_id) !== req.user.storeId) {
    return res.status(403).json({ error: 'Você não tem permissão para criar itens nesta loja.' });
  }

  // Whitelist Imutável contra Prototype Pollution
  const allowedAllergens = Object.freeze(['Glúten', 'Laticínios', 'Ovos', 'Nozes', 'Crustáceos', 'Soja', 'Peixe']);
  const allowedDietary = Object.freeze(['Vegetariano', 'Vegano', 'Sem Glúten', 'Sem Laticínios', 'Misto']);
  const allowedStatus = Object.freeze(['Ativo', 'Inativo']);

  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ error: 'Status inválido fornecido.' });
  }

  let validAllergens = null;
  if (Array.isArray(allergens)) {
    validAllergens = allergens.filter(a => allowedAllergens.includes(a));
  }

  let validDietary = null;
  if (Array.isArray(dietary_flags)) {
    validDietary = dietary_flags.filter(d => allowedDietary.includes(d));
  }

  try {
    const allergensJson = validAllergens && validAllergens.length > 0 ? JSON.stringify(validAllergens) : null;
    const dietaryJson = validDietary && validDietary.length > 0 ? JSON.stringify(validDietary) : null;

    const [result] = await pool.query(
      `INSERT INTO menu_items (
        store_id, category_name, subcategory_name, name, price, description, 
        image, status, popular, tag, prep_time, calories, kitchen_station, allergens, dietary_flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        store_id || null, category_name || null, subcategory_name || null, name || null, price || 0, description || null, image || null,
        status || 'Available', popular || 0, tag || null, Number(prep_time) || null, Number(calories) || null, kitchen_station || null, allergensJson, dietaryJson
      ]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    store_id, category_name, subcategory_name, name, price, description, image,
    status, popular, tag, prep_time, calories, kitchen_station, allergens, dietary_flags
  } = req.body;

  if (Number(store_id) !== req.user.storeId) {
    return res.status(403).json({ error: 'Você não tem permissão para editar itens desta loja.' });
  }

  // Imutabilidade nas Regras
  const allowedAllergens = Object.freeze(['Glúten', 'Laticínios', 'Ovos', 'Nozes', 'Crustáceos', 'Soja', 'Peixe']);
  const allowedDietary = Object.freeze(['Vegetariano', 'Vegano', 'Sem Glúten', 'Sem Laticínios', 'Misto']);

  let validAllergens = null;
  if (Array.isArray(allergens)) {
    validAllergens = allergens.filter(a => allowedAllergens.includes(a));
  }

  let validDietary = null;
  if (Array.isArray(dietary_flags)) {
    validDietary = dietary_flags.filter(d => allowedDietary.includes(d));
  }

  try {
    console.log(`Atualizando item ${id} para loja ${store_id}`);
    const allergensJson = validAllergens && validAllergens.length > 0 ? JSON.stringify(validAllergens) : null;
    const dietaryJson = validDietary && validDietary.length > 0 ? JSON.stringify(validDietary) : null;

    const [result] = await pool.query(
      `UPDATE menu_items SET 
        category_name = ?, subcategory_name = ?, name = ?, price = ?, description = ?, 
        image = ?, status = ?, popular = ?, tag = ?, prep_time = ?, calories = ?, 
        kitchen_station = ?, allergens = ?, dietary_flags = ?
      WHERE id = ? AND store_id = ?`,
      [
        category_name || null, subcategory_name || null, name || null, price || 0, description || null,
        image || null, status || 'Available', popular || 0, tag || null, Number(prep_time) || null, Number(calories) || null,
        kitchen_station || null, allergensJson, dietaryJson, id, store_id
      ]
    );

    console.log('Resultado do UPDATE:', result.affectedRows, 'linhas afetadas');
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item não encontrado ou você não tem permissão.' });
    }

    res.json({ id, ...req.body });
  } catch (error) {
    console.error('Erro no PUT /api/items:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware, async (req, res) => {
  const { id } = req.params;
  const storeId = req.user.storeId;

  try {
    // Database Execution amparada pela Proteção de Objeto Virtual RLS
    const [result] = await execRLSQuery('DELETE FROM menu_items WHERE id = ? AND store_id = ?', [id], storeId);
    if (result.affectedRows === 0) {
      logger.warn(`[SECURITY BOLA] Tentativa IDOR: Usuário (store_id: ${storeId}) listou ou tentou deletar item (id: ${id}) sem permissão. IP: ${req.ip}`);
      return res.status(404).json({ error: 'Item não encontrado ou você não tem permissão.' });
    }
    res.json({ message: 'Item excluído com sucesso' });
  } catch (error) {
    console.error('Erro no DELETE /api/items:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ================= ENDPOINT OTIMIZADO: Toggle Status (V9) ================= //
// Evita enviar o item inteiro (com base64 de imagem) apenas para mudar status
app.patch('/api/items/:id/status', authenticateToken, csrfProtection, dataMutationLimiter, nonceMiddleware,
  body('status').isIn(['Ativo', 'Inativo']).withMessage('Status inválido. Deve ser "Ativo" ou "Inativo".'),
  handleValidationErrors,
  async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const storeId = req.user.storeId;

  try {
    const [result] = await safeQuery(
      'UPDATE menu_items SET status = ? WHERE id = ? AND store_id = ?',
      [status, id, storeId]
    );

    if (result.affectedRows === 0) {
      logger.warn(`[SECURITY BOLA] Tentativa IDOR: UserID ${storeId} tentou alterar status do item ${id}. IP: ${req.ip}`);
      return res.status(404).json({ error: 'Item não encontrado ou sem permissão.' });
    }

    res.json({ id, status, message: 'Status atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro no PATCH /api/items/status:', error.message);
    res.status(500).json({ error: 'Erro interno ao alterar status.' });
  }
});

// ================= ROTAS PRINCIPAIS & AUTH CONTROLS ================= //

// Módulo de Invalidação Global (Panic Button)
app.post('/api/logout/all', authenticateToken, csrfProtection, async (req, res) => {
  try {
    await pool.query('UPDATE stores SET token_version = token_version + 1 WHERE id = ?', [req.user.storeId]);
    res.clearCookie('token');
    logger.info(`[SECURITY ALARM] Flag 'Panic Button' Acionado. Sessões globalmente revogadas para UserID: ${req.user.storeId} pelo IP: ${req.ip}`);
    res.json({ message: 'Conexões encerradas remotamente em todos os dispositivos.' });
  } catch (err) {
    logger.error(`[SIGNOUT ALL ERROR] ${err.message}`);
    res.status(500).json({ error: 'Erro processando requisição de desconexão master.' });
  }
});

// ================= VALIDATION HELPERS (express-validator) ================= //
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// Password complexity policy (V7)
const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false // Opcionalmente ativar no futuro
});

const validatePasswordStrength = (password) => {
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    return `A senha deve ter no mínimo ${PASSWORD_POLICY.minLength} caracteres.`;
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número.';
  }
  return null; // Valid
};

app.post('/api/register',
  csrfProtection, nonceMiddleware, authLimiter,
  // express-validator: Validação estrutural (V5)
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório.').isLength({ max: 100 }).withMessage('Nome muito longo (máx 100 caracteres).'),
  body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
  body('senha').notEmpty().withMessage('Senha é obrigatória.'),
  body('telefone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Telefone muito longo.'),
  body('cnpj').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('CNPJ muito longo.'),
  handleValidationErrors,
  async (req, res) => {
  // Prevenção Primordial contra Mass Assignment Constraint (Forçando Cast de Tipos Nativos - DTO)
  const RegisterDTO = Object.freeze({
    nome: req.body.nome ? String(req.body.nome).trim() : null,
    telefone: req.body.telefone ? String(req.body.telefone).trim() : null,
    cnpj: req.body.cnpj ? String(req.body.cnpj).trim() : null,
    email: req.body.email ? String(req.body.email).toLowerCase().trim() : null,
    senha: req.body.senha ? String(req.body.senha) : null
  });

  const { nome, telefone, cnpj, email, senha } = RegisterDTO;

  if (!nome || !email || !senha) return res.status(400).json({ error: 'Dados Incompletos.' });

  // V7: Validação de complexidade de senha
  const passwordError = validatePasswordStrength(senha);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);

    // Application-level encryption para dados de identificação sensíveis PII
    const encryptedTelefone = encrypt(telefone);
    const encryptedCnpj = encrypt(cnpj);

    const query = 'INSERT INTO stores (nome, telefone, cnpj, email, senha, token_version, role) VALUES (?, ?, ?, ?, ?, 0, ?)';
    const [result] = await safeQuery(query, [nome, encryptedTelefone, encryptedCnpj, email, hashedPassword, 'admin']);
    const storeId = result.insertId;

    // Emit JWT with injected token_version marker logic for later synchronization
    const token = jwt.sign({ storeId, email, token_version: 0 }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Store registered successfully',
      storeId: storeId,
      data: { nome, telefone, cnpj, email }
    });
  } catch (error) {
    logger.error(`[DATABASE ERROR - REGISTER] ${error.message}`);
    // Information Leakage Mask (Não revelar colunas ou schemas, no max um dup-email disfarçado)
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Este e-mail não pode ser utilizado.' });
    res.status(500).json({ error: 'Nossos servidores encontraram um problema interno. Tente novamente mais tarde.' });
  }
});

app.post('/api/login',
  csrfProtection, nonceMiddleware, bruteForceMiddleware,
  body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
  body('senha').notEmpty().withMessage('Senha é obrigatória.'),
  handleValidationErrors,
  async (req, res) => {
  const { email, senha, captchaToken } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Credenciais ausentes.' });

  try {
    const [rows] = await safeQuery('SELECT * FROM stores WHERE email = ?', [email]);
    if (rows.length > 0) {
      const store = rows[0];
      const match = await bcrypt.compare(senha, store.senha);

      if (match) {
        clearFailedAttempts(req.lockoutIdentifier); // Sucesso: Livra o bloqueio de força bruta

        // Inject DB's fresh token_version into the JWT payload
        const token = jwt.sign({
          storeId: store.id,
          email: store.email,
          token_version: store.token_version
        }, JWT_SECRET, { expiresIn: '8h' });

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        delete store.senha; // Never return hash
        res.json({ message: 'Login successful', data: store });
      } else {
        recordFailedAttempt(req.lockoutIdentifier);
        logger.warn(`[AUTH] Falha de senha para ID: ${req.lockoutIdentifier}`);
        res.status(401).json({ error: 'Credenciais inválidas.' }); // Sem vazamento de info
      }
    } else {
      recordFailedAttempt(req.lockoutIdentifier);
      logger.warn(`[AUTH] Tentativa em e-mail inexistente para ID: ${req.lockoutIdentifier}`);
      res.status(401).json({ error: 'Credenciais inválidas.' }); // Sem vazamento de info
    }
  } catch (error) {
    logger.error(`[DATABASE ERROR - LOGIN] ${error.message}`);
    res.status(500).json({ error: 'Erro de Autenticação no Servidor. Tente novamente.' });
  }
});

app.get('/api/store/:id', authenticateToken, async (req, res) => {
  if (Number(req.params.id) !== req.user.storeId) {
    return res.status(403).json({ error: 'Acesso proibido.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const store = rows[0];
      delete store.senha;

      if (typeof store.schedule === 'string' && store.schedule) {
        try { store.schedule = JSON.parse(store.schedule); } catch (e) { }
      }
      // Decrypt Application-level Secure Data payload antes de retornar pro Frontend
      store.telefone = decrypt(store.telefone);
      store.cnpj = decrypt(store.cnpj);

      res.json(store);
    } else {
      res.status(404).json({ error: 'Store not found' });
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/store/:id', authenticateToken, csrfProtection, nonceMiddleware, async (req, res) => {
  const storeId = req.params.id;

  if (Number(storeId) !== req.user.storeId) {
    return res.status(403).json({ error: 'Acesso proibido para atualização.' });
  }

  // Forçando DTO Rigoroso (Restrição de Mass Assignment Pattern)
  const StoreUpdateDTO = Object.freeze({
    nome: req.body.nome ? String(req.body.nome) : null,
    telefone: req.body.telefone ? String(req.body.telefone) : null,
    cnpj: req.body.cnpj ? String(req.body.cnpj) : null,
    email: req.body.email ? String(req.body.email) : null,
    endereco: req.body.endereco ? String(req.body.endereco) : null,
    scheduleStr: req.body.schedule ? JSON.stringify(req.body.schedule) : null,
    promo_banner: req.body.promo_banner ? String(req.body.promo_banner) : null,
    logo: req.body.logo ? String(req.body.logo) : null
  });

  const { nome, telefone, cnpj, email, endereco, scheduleStr, promo_banner, logo } = StoreUpdateDTO;

  try {
    const query = `
      UPDATE stores 
      SET nome = ?, telefone = ?, cnpj = ?, email = ?, endereco = ?, schedule = ?, promo_banner = ?, logo = ?
      WHERE id = ?
    `;

    // Encripta PII Updates
    const encTelefone = encrypt(telefone);
    const encCnpj = encrypt(cnpj);

    const [result] = await pool.query(query, [
      nome, encTelefone, encCnpj, email, endereco, scheduleStr, promo_banner, logo, storeId
    ]);

    res.json({ message: 'Store updated successfully', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Update error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3002;
// Upload Route com Validação de Magic Number e MIME Type Rigorosa
app.post('/api/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const validFiles = [];
    for (const file of req.files) {
      // Valida o 'Magic Number' usando os bytes reais do arquivo no disco
      const type = await fileTypeFromFile(file.path);

      if (!type || !allowedMimeTypesGlobal.includes(type.mime)) {
        // Exclui instantaneamente de disco caso seja malicioso/falsificado
        await fs.unlink(file.path).catch(e => logger.error(`Falha ao excluir arquivo malicioso: ${e.message}`));
        logger.warn(`[SECURITY UPLOAD] Arquivo Rejeitado (Falsificação MIME) | Nome: ${file.originalname} | UserID: ${req.user.storeId} | IP: ${req.ip}`);
        continue;
      }

      validFiles.push({
        url: `http://localhost:3002/uploads/${file.filename}`,
        type: type.mime.startsWith('video') ? 'video' : 'image'
      });
    }

    if (validFiles.length === 0 && req.files && req.files.length > 0) {
      return res.status(400).json({ error: 'Rejeitado por políticas de Segurança: Nenhum arquivo fornecido era um formato válido de mídia não-corrompida.' });
    }

    res.json({ files: validFiles });
  } catch (error) {
    logger.error(`[UPLOAD ERROR] ${error.message}`);
    res.status(500).json({ error: 'Erro Interno no processamento do arquivo.' });
  }
});

// ================= GLOBAL EXCEPTION HANDLER ================= //
// Escudo Final Contra Injeção Baseada em Erros e Panics da API
app.use((err, req, res, next) => {
  logger.error(`[UNHANDLED FATAL ERROR] URI: ${req.originalUrl} - IP: ${req.ip} - Message: ${err.message}`);
  res.status(500).json({ error: 'Erro Sistêmico Interceptado. Segurança Acionada.' });
});

// Captura Erros Fora do Ciclo do Express (Impede Morte Súbita do Processo Node)
process.on('uncaughtException', (err) => {
  logger.error(`[FATAL EXCEPTION] Exceção Nível Processo: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`[UNHANDLED REJECTION] Promessa Recusada Inesperadamente: ${reason}`);
});

let server;

// ================= INICIALIZAÇÃO SEGURA & APP.LISTEN ================= //
const startServer = async () => {
  try {
    await initializeDatabase(logger);

    server = app.listen(PORT, () => {
      console.log(`Secured Server running on port ${PORT}`);
      logger.info(`[SYSTEM] Servidor Express Seguro Online na Porta ${PORT}`);
    });
  } catch (err) {
    logger.error(`[SYSTEM FATAL] O Servidor foi abortado porque as migrações do Banco de Dados falharam: ${err.message}`);
    process.exit(1);
  }
};

startServer();

// ================= GRACEFUL SHUTDOWN ================= //
const gracefulShutdown = () => {
  logger.info('[SYSTEM] Recebido sinal de interrupção externa (SIGTERM/SIGINT). Preparando Graceful Shutdown.');
  if (server) {
    server.close(async () => {
      logger.info('[SYSTEM] Servidor bloqueado para conexões HTTP. Finalizando tarefas...');
      try {
        if (pool) {
          await pool.end();
          logger.info('[SYSTEM] Pool de conexões do MySQL encerrado via graceful terminate. Zero transações perdidas.');
        }
        process.exit(0);
      } catch (e) {
        logger.error(`[SYSTEM] Erro crítico no encerramento das sub-rotinas: ${e.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  // Timeout Master - Previne zumbis se algo travar (Ex: Queries que não morrem)
  setTimeout(() => {
    logger.error('[SYSTEM] Timeout limite de Graça forçado (10s). Finalizando à força.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
