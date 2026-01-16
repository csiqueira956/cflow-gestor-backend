import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/001_add_subscription_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Aplicando migration do sistema de assinaturas...');
    
    await pool.query(migrationSQL);

    console.log('✅ Migration aplicada com sucesso!');
    console.log('');
    console.log('Tabelas criadas:');
    console.log('  - plans (planos de assinatura)');
    console.log('  - subscriptions (assinaturas)');
    console.log('  - invoices (faturas)');
    console.log('  - subscription_history (histórico)');
    console.log('  - webhook_events (eventos de webhook)');
    console.log('');
    console.log('3 planos pré-configurados inseridos:');
    console.log('  - Básico: R$ 49,90/mês');
    console.log('  - Profissional: R$ 99,90/mês');
    console.log('  - Enterprise: R$ 249,90/mês');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
