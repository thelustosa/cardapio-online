import pool from '../../db.js';

export const initializeDatabase = async (logger = console) => {
  try {
    // 1. Tabela de Lojas (Stores) - Base do Multi-Tenant
    // Adicionado otimização do VARCHAR e espaços para hashes grandes/AES-GCM
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        telefone VARCHAR(255),
        cnpj VARCHAR(255),
        email VARCHAR(150) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        role VARCHAR(30) DEFAULT 'admin',
        token_version INT DEFAULT 0,
        endereco TEXT,
        schedule LONGTEXT,
        promo_banner LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabela de Categorias - Com Foreign Key e Cascata
    // Evita dados órfãos vinculando ativamente à loja.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        sort_order INT DEFAULT 0,
        subcategories LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_categories_store (store_id)
        -- CONSTRAINT fk_category_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      )
    `);

    // 3. Tabela de Itens do Menu - Com Foreign Key e Cascata
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        category_name VARCHAR(100),
        subcategory_name VARCHAR(100),
        name VARCHAR(150) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        description TEXT,
        image LONGTEXT,
        status VARCHAR(30) DEFAULT 'Available',
        popular BOOLEAN DEFAULT FALSE,
        tag VARCHAR(50),
        prep_time INT,
        calories INT,
        kitchen_station VARCHAR(50),
        allergens LONGTEXT,
        dietary_flags LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_items_store (store_id)
        -- CONSTRAINT fk_item_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      )
    `);

    // Helper de Migração Defensiva
    const addColumnSafe = async (table, column, type) => {
      const [rows] = await pool.query(
        'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column]
      );
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        logger.info(`[MIGRATION] Coluna estrutural adicionada: ${table}.${column}`);
      }
    };

    // Helpler de Constraint ForeignKey Defensiva
    const addForeignConstraintSafe = async (table, constraintName, column, refTable, refColumn) => {
      const [rows] = await pool.query(
        'SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
        [table, constraintName]
      );
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${column}) REFERENCES ${refTable}(${refColumn}) ON DELETE CASCADE`);
        logger.info(`[MIGRATION] Constraint FK adicionada: ${table} -> ${refTable}`);
      }
    };

    // Auditoria Lógica de Colunas
    await addColumnSafe('stores', 'role', 'VARCHAR(30) DEFAULT "admin"');
    await addColumnSafe('stores', 'token_version', 'INT DEFAULT 0');
    
    await addColumnSafe('categories', 'subcategories', 'LONGTEXT');
    await addColumnSafe('categories', 'sort_order', 'INT DEFAULT 0');
    
    await addColumnSafe('menu_items', 'subcategory_name', 'VARCHAR(100)');
    await addColumnSafe('menu_items', 'prep_time', 'INT');
    await addColumnSafe('menu_items', 'calories', 'INT');
    await addColumnSafe('menu_items', 'kitchen_station', 'VARCHAR(50)');
    await addColumnSafe('menu_items', 'allergens', 'LONGTEXT');
    await addColumnSafe('menu_items', 'dietary_flags', 'LONGTEXT');

    // Garantir que campos de imagem existentes sejam LONGTEXT (Migração)
    try {
      await pool.query('ALTER TABLE stores MODIFY COLUMN promo_banner LONGTEXT');
      await pool.query('ALTER TABLE menu_items MODIFY COLUMN image LONGTEXT');
    } catch (e) {
      logger.warn(`[MIGRATION] Aviso ao converter colunas para LONGTEXT: ${e.message}`);
    }

    // Implantação das Foreign Keys com Cascata de Deleção
    await addForeignConstraintSafe('categories', 'fk_category_store', 'store_id', 'stores', 'id');
    await addForeignConstraintSafe('menu_items', 'fk_item_store', 'store_id', 'stores', 'id');

    logger.info('[DATABASE] Inicialização Concluída. Arquitetura Refatorada (Foreign Keys + Otimização).');
  } catch (error) {
    // Usando logger injetado ou console no modo dev/teste
    (logger.error || console.error)(`[DATABASE FATAL] Falha de Estruturação SQL: ${error.message}`);
    throw error;
  }
};
