import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'openfront_db';

const connectionConfig = Object.freeze({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ================= CIRCUIT BREAKER (RESILIÊNCIA EXTERNA) ================= //
export class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeout = 30000) {
    this.state = 'CLOSED'; // Possível: CLOSED (Ativo), OPEN (Falhando), HALF_OPEN (Tentando Voltar)
    this.failures = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.nextAttempt = 0;
  }

  async execute(action) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit Breaker is OPEN: Serviço Bloqueado temporariamente para proteger API externa/DB de sobrecargas.');
      }
    }
    try {
      const result = await action();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.warn(`[CIRCUIT BREAKER] Falhas críticas atingiram limite (${this.failures}). Circuito ABERTO. Tentando religar em ${this.resetTimeout/1000}s.`);
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

export const dbBreaker = new CircuitBreaker();

// Função para garantir que o banco de dados exista
async function ensureDatabase() {
  try {
    const connection = await mysql.createConnection(connectionConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();
    console.log(`✅ Banco de dados "${dbName}" garantido.`);
  } catch (err) {
    console.error('❌ Erro ao garantir existência do banco de dados:', err.message);
    throw err;
  }
}

// Top-level await para garantir que o banco exista antes de exportar o pool
await ensureDatabase();

const pool = mysql.createPool({
  ...connectionConfig,
  database: dbName
});

// Teste de conexão opcional
pool.getConnection()
  .then(conn => {
    console.log(`✅ Pool conectado ao banco "${dbName}" com sucesso!`);
    conn.release();
  })
  .catch(err => {
    console.error(`❌ Erro no pool do MySQL:`, err.message);
  });

export default pool;

// ================= SAFE QUERY (Circuit Breaker Integration) ================= //
// Wrapper que executa queries através do Circuit Breaker automaticamente (V8)
export const safeQuery = async (queryTemplate, params = []) => {
  return dbBreaker.execute(() => pool.query(queryTemplate, params));
};
