/**
 * Script de Migração: SQLite para Supabase (PostgreSQL)
 *
 * Este script migra todos os dados do banco SQLite local para o Supabase.
 *
 * USO:
 *   1. Configure as variáveis de ambiente no .env (DATABASE_URL)
 *   2. Execute: node scripts/migrate-to-supabase.js
 *
 * IMPORTANTE:
 *   - Faça backup do banco SQLite antes de executar
 *   - Execute o schema-supabase.sql no Supabase antes de migrar
 *   - Mantenha sqlite3 instalado temporariamente para este script
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// ============================================
// CONFIGURAÇÃO
// ============================================

// SQLite - Banco de origem
const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');
const sqliteDb = new sqlite3.Database(dbPath);
const sqliteAll = promisify(sqliteDb.all.bind(sqliteDb));
const sqliteGet = promisify(sqliteDb.get.bind(sqliteDb));

// PostgreSQL - Banco de destino (Supabase)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Mapeamento de IDs (SQLite -> PostgreSQL)
const idMaps = {
  empresas_to_companies: {}, // SQLite empresa.id (INTEGER) -> Supabase company UUID
  usuarios: {},              // SQLite id -> PostgreSQL id
  equipes: {},
  clientes: {},
  comissoes: {},
  administradoras: {},
  metas: {},
  formularios: {}
};

// Contadores
const stats = {
  companies: 0,
  equipes: 0,
  usuarios: 0,
  administradoras: 0,
  clientes: 0,
  metas: 0,
  comissoes: 0,
  parcelas: 0,
  formularios: 0,
  password_resets: 0,
  errors: 0
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function log(message, type = 'info') {
  const icons = {
    info: '📌',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    start: '🚀',
    end: '🏁'
  };
  console.log(`${icons[type] || '📌'} ${message}`);
}

async function tableExists(tableName) {
  try {
    const result = await sqliteGet(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
    return !!result;
  } catch {
    return false;
  }
}

// ============================================
// MIGRAÇÃO: EMPRESAS -> COMPANIES
// ============================================

async function migrateCompanies() {
  log('Migrando empresas -> companies...', 'start');

  if (!await tableExists('empresas')) {
    log('Tabela empresas não existe, criando company padrão...', 'warning');

    // Criar uma company padrão se não existir tabela empresas
    const result = await pgPool.query(`
      INSERT INTO companies (nome, email, status, max_users, max_leads)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['Empresa Padrão', 'admin@gestorconsorcios.com', 'active', 10, 1000]);

    idMaps.empresas_to_companies[1] = result.rows[0].id;
    stats.companies = 1;
    log(`Company padrão criada com ID: ${result.rows[0].id}`, 'success');
    return;
  }

  const empresas = await sqliteAll('SELECT * FROM empresas');

  for (const empresa of empresas) {
    try {
      // Normalizar status - valores válidos: active, suspended, cancelled, ACTIVE, TRIAL, OVERDUE, EXPIRED
      const validStatuses = ['active', 'suspended', 'cancelled', 'ACTIVE', 'TRIAL', 'OVERDUE', 'EXPIRED'];
      let status = empresa.status || 'active';
      if (!validStatuses.includes(status)) {
        status = 'active'; // fallback para status inválido
      }

      const result = await pgPool.query(`
        INSERT INTO companies (
          nome, razao_social, email, cnpj, telefone,
          endereco, cidade, estado, cep,
          status, max_users, max_leads,
          asaas_customer_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        empresa.nome,
        empresa.razao_social,
        empresa.email,
        empresa.cnpj,
        empresa.telefone,
        empresa.endereco,
        empresa.cidade,
        empresa.estado,
        empresa.cep,
        status,
        empresa.max_users || 3,
        empresa.max_leads || 100,
        empresa.asaas_customer_id,
        empresa.created_at || new Date().toISOString()
      ]);

      idMaps.empresas_to_companies[empresa.id] = result.rows[0].id;
      stats.companies++;
    } catch (error) {
      log(`Erro ao migrar empresa ${empresa.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.companies} empresas migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: EQUIPES
// ============================================

async function migrateEquipes() {
  log('Migrando equipes...', 'start');

  if (!await tableExists('equipes')) {
    log('Tabela equipes não existe, pulando...', 'warning');
    return;
  }

  const equipes = await sqliteAll('SELECT * FROM equipes');

  for (const equipe of equipes) {
    try {
      const companyId = idMaps.empresas_to_companies[equipe.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];

      if (!companyId) {
        log(`Equipe ${equipe.id} sem company_id válido, pulando...`, 'warning');
        continue;
      }

      const result = await pgPool.query(`
        INSERT INTO equipes (nome, descricao, company_id, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        equipe.nome,
        equipe.descricao,
        companyId,
        equipe.created_at || new Date().toISOString()
      ]);

      idMaps.equipes[equipe.id] = result.rows[0].id;
      stats.equipes++;
    } catch (error) {
      log(`Erro ao migrar equipe ${equipe.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.equipes} equipes migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: USUÁRIOS
// ============================================

async function migrateUsuarios() {
  log('Migrando usuarios...', 'start');

  const usuarios = await sqliteAll('SELECT * FROM usuarios');

  for (const usuario of usuarios) {
    try {
      const companyId = idMaps.empresas_to_companies[usuario.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];

      if (!companyId) {
        log(`Usuário ${usuario.id} sem company_id válido, pulando...`, 'warning');
        continue;
      }

      const equipeId = usuario.equipe_id ? idMaps.equipes[usuario.equipe_id] : null;

      const result = await pgPool.query(`
        INSERT INTO usuarios (
          nome, email, senha_hash, role, tipo_usuario,
          percentual_comissao, celular, equipe, equipe_id,
          link_publico, foto_perfil, company_id,
          activation_token, token_expires, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `, [
        usuario.nome,
        usuario.email,
        usuario.senha_hash,
        usuario.role || 'vendedor',
        usuario.tipo_usuario,
        usuario.percentual_comissao === '' ? null : usuario.percentual_comissao,
        usuario.celular,
        usuario.equipe,
        equipeId,
        usuario.link_publico,
        usuario.foto_perfil,
        companyId,
        usuario.activation_token,
        usuario.token_expires,
        usuario.created_at || new Date().toISOString()
      ]);

      idMaps.usuarios[usuario.id] = result.rows[0].id;
      stats.usuarios++;
    } catch (error) {
      log(`Erro ao migrar usuário ${usuario.id} (${usuario.email}): ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.usuarios} usuários migrados`, 'success');
}

// ============================================
// MIGRAÇÃO: ADMINISTRADORAS
// ============================================

async function migrateAdministradoras() {
  log('Migrando administradoras...', 'start');

  if (!await tableExists('administradoras')) {
    log('Tabela administradoras não existe, pulando...', 'warning');
    return;
  }

  const administradoras = await sqliteAll('SELECT * FROM administradoras');

  for (const admin of administradoras) {
    try {
      const companyId = idMaps.empresas_to_companies[admin.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];

      if (!companyId) continue;

      const result = await pgPool.query(`
        INSERT INTO administradoras (
          nome, nome_contato, celular,
          comissionamento_recebido, comissionamento_pago,
          company_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        admin.nome,
        admin.nome_contato,
        admin.celular,
        admin.comissionamento_recebido,
        admin.comissionamento_pago,
        companyId,
        admin.created_at || new Date().toISOString()
      ]);

      idMaps.administradoras[admin.id] = result.rows[0].id;
      stats.administradoras++;
    } catch (error) {
      log(`Erro ao migrar administradora ${admin.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.administradoras} administradoras migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: CLIENTES
// ============================================

async function migrateClientes() {
  log('Migrando clientes...', 'start');

  const clientes = await sqliteAll('SELECT * FROM clientes');

  for (const cliente of clientes) {
    try {
      const companyId = idMaps.empresas_to_companies[cliente.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];
      const vendedorId = idMaps.usuarios[cliente.vendedor_id];

      if (!companyId || !vendedorId) {
        log(`Cliente ${cliente.id} sem referências válidas, pulando...`, 'warning');
        continue;
      }

      const result = await pgPool.query(`
        INSERT INTO clientes (
          nome, cpf, telefone, email,
          data_nascimento, estado_civil, nacionalidade, cidade_nascimento,
          nome_mae, profissao, remuneracao,
          telefone_residencial, telefone_comercial, telefone_celular, telefone_celular_2,
          tipo_documento, numero_documento, orgao_emissor, data_emissao,
          cpf_conjuge, nome_conjuge,
          cep, tipo_logradouro, endereco, numero_endereco, complemento, bairro, cidade, estado,
          forma_pagamento_primeira, data_pre_datado, valor_cheque, numero_cheque,
          data_vencimento_cheque, banco_cheque, agencia_cheque, conta_cheque,
          forma_pagamento_demais, nome_correntista, cpf_correntista,
          banco_debito, agencia_debito, conta_debito,
          aceita_seguro, valor_carta, administradora, grupo, cota, observacao,
          etapa, vendedor_id, company_id, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53
        )
        RETURNING id
      `, [
        cliente.nome, cliente.cpf, cliente.telefone, cliente.email,
        cliente.data_nascimento, cliente.estado_civil, cliente.nacionalidade, cliente.cidade_nascimento,
        cliente.nome_mae, cliente.profissao, cliente.remuneracao,
        cliente.telefone_residencial, cliente.telefone_comercial, cliente.telefone_celular, cliente.telefone_celular_2,
        cliente.tipo_documento, cliente.numero_documento, cliente.orgao_emissor, cliente.data_emissao,
        cliente.cpf_conjuge, cliente.nome_conjuge,
        cliente.cep, cliente.tipo_logradouro, cliente.endereco, cliente.numero_endereco, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado,
        cliente.forma_pagamento_primeira, cliente.data_pre_datado, cliente.valor_cheque, cliente.numero_cheque,
        cliente.data_vencimento_cheque, cliente.banco_cheque, cliente.agencia_cheque, cliente.conta_cheque,
        cliente.forma_pagamento_demais, cliente.nome_correntista, cliente.cpf_correntista,
        cliente.banco_debito, cliente.agencia_debito, cliente.conta_debito,
        cliente.aceita_seguro === 1 || cliente.aceita_seguro === true,
        cliente.valor_carta, cliente.administradora, cliente.grupo, cliente.cota, cliente.observacao,
        cliente.etapa || 'novo_contato', vendedorId, companyId, cliente.created_at || new Date().toISOString()
      ]);

      idMaps.clientes[cliente.id] = result.rows[0].id;
      stats.clientes++;
    } catch (error) {
      log(`Erro ao migrar cliente ${cliente.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.clientes} clientes migrados`, 'success');
}

// ============================================
// MIGRAÇÃO: METAS
// ============================================

async function migrateMetas() {
  log('Migrando metas...', 'start');

  if (!await tableExists('metas')) {
    log('Tabela metas não existe, pulando...', 'warning');
    return;
  }

  const metas = await sqliteAll('SELECT * FROM metas');

  for (const meta of metas) {
    try {
      const companyId = idMaps.empresas_to_companies[meta.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];
      const vendedorId = meta.vendedor_id ? idMaps.usuarios[meta.vendedor_id] : null;
      const equipeId = meta.equipe_id ? idMaps.equipes[meta.equipe_id] : null;

      if (!companyId) continue;

      const result = await pgPool.query(`
        INSERT INTO metas (
          titulo, descricao, tipo, vendedor_id, equipe_id,
          valor_meta, mes_referencia, status, company_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        meta.titulo,
        meta.descricao,
        meta.tipo,
        vendedorId,
        equipeId,
        meta.valor_meta,
        meta.mes_referencia,
        meta.status || 'ativa',
        companyId,
        meta.created_at || new Date().toISOString()
      ]);

      idMaps.metas[meta.id] = result.rows[0].id;
      stats.metas++;
    } catch (error) {
      log(`Erro ao migrar meta ${meta.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.metas} metas migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: COMISSÕES
// ============================================

async function migrateComissoes() {
  log('Migrando comissoes...', 'start');

  if (!await tableExists('comissoes')) {
    log('Tabela comissoes não existe, pulando...', 'warning');
    return;
  }

  const comissoes = await sqliteAll('SELECT * FROM comissoes');

  for (const comissao of comissoes) {
    try {
      const companyId = idMaps.empresas_to_companies[comissao.company_id] ||
                        Object.values(idMaps.empresas_to_companies)[0];
      const clienteId = idMaps.clientes[comissao.cliente_id];
      const vendedorId = idMaps.usuarios[comissao.vendedor_id];

      if (!companyId || !clienteId || !vendedorId) {
        log(`Comissão ${comissao.id} sem referências válidas, pulando...`, 'warning');
        continue;
      }

      const result = await pgPool.query(`
        INSERT INTO comissoes (
          cliente_id, vendedor_id, valor_venda,
          percentual_comissao, valor_comissao,
          numero_parcelas, status, company_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        clienteId,
        vendedorId,
        comissao.valor_venda,
        comissao.percentual_comissao,
        comissao.valor_comissao,
        comissao.numero_parcelas || 1,
        comissao.status || 'pendente',
        companyId,
        comissao.created_at || new Date().toISOString()
      ]);

      idMaps.comissoes[comissao.id] = result.rows[0].id;
      stats.comissoes++;
    } catch (error) {
      log(`Erro ao migrar comissão ${comissao.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.comissoes} comissões migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: PARCELAS DE COMISSÃO
// ============================================

async function migrateParcelasComissao() {
  log('Migrando parcelas_comissao...', 'start');

  if (!await tableExists('parcelas_comissao')) {
    log('Tabela parcelas_comissao não existe, pulando...', 'warning');
    return;
  }

  const parcelas = await sqliteAll('SELECT * FROM parcelas_comissao');

  for (const parcela of parcelas) {
    try {
      const comissaoId = idMaps.comissoes[parcela.comissao_id];

      if (!comissaoId) {
        log(`Parcela ${parcela.id} sem comissao_id válido, pulando...`, 'warning');
        continue;
      }

      await pgPool.query(`
        INSERT INTO parcelas_comissao (
          comissao_id, numero_parcela, valor_parcela,
          data_vencimento, data_pagamento, status, observacao, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        comissaoId,
        parcela.numero_parcela,
        parcela.valor_parcela,
        parcela.data_vencimento,
        parcela.data_pagamento,
        parcela.status || 'pendente',
        parcela.observacao,
        parcela.created_at || new Date().toISOString()
      ]);

      stats.parcelas++;
    } catch (error) {
      log(`Erro ao migrar parcela ${parcela.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.parcelas} parcelas migradas`, 'success');
}

// ============================================
// MIGRAÇÃO: FORMULÁRIOS PÚBLICOS
// ============================================

async function migrateFormulariosPublicos() {
  log('Migrando formularios_publicos...', 'start');

  if (!await tableExists('formularios_publicos')) {
    log('Tabela formularios_publicos não existe, pulando...', 'warning');
    return;
  }

  const formularios = await sqliteAll('SELECT * FROM formularios_publicos');

  for (const form of formularios) {
    try {
      const vendedorId = idMaps.usuarios[form.vendedor_id];

      if (!vendedorId) {
        log(`Formulário ${form.id} sem vendedor_id válido, pulando...`, 'warning');
        continue;
      }

      await pgPool.query(`
        INSERT INTO formularios_publicos (
          token, vendedor_id, titulo, descricao,
          ativo, total_preenchimentos, created_at, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        form.token,
        vendedorId,
        form.titulo,
        form.descricao,
        form.ativo === 1 || form.ativo === true,
        form.total_preenchimentos || 0,
        form.created_at || new Date().toISOString(),
        form.expires_at
      ]);

      stats.formularios++;
    } catch (error) {
      log(`Erro ao migrar formulário ${form.id}: ${error.message}`, 'error');
      stats.errors++;
    }
  }

  log(`${stats.formularios} formulários migrados`, 'success');
}

// ============================================
// MIGRAÇÃO: PASSWORD RESETS
// ============================================

async function migratePasswordResets() {
  log('Migrando password_resets...', 'start');

  if (!await tableExists('password_resets')) {
    log('Tabela password_resets não existe, pulando...', 'warning');
    return;
  }

  // Migrar apenas resets não usados e não expirados
  const resets = await sqliteAll(`
    SELECT * FROM password_resets
    WHERE used = 0 AND expires_at > datetime('now')
  `);

  for (const reset of resets) {
    try {
      const userId = idMaps.usuarios[reset.user_id];

      if (!userId) continue;

      await pgPool.query(`
        INSERT INTO password_resets (
          user_id, email, token, expires_at, used, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        reset.email,
        reset.token,
        reset.expires_at,
        reset.used === 1,
        reset.created_at || new Date().toISOString()
      ]);

      stats.password_resets++;
    } catch (error) {
      // Ignorar erros de duplicação
      if (!error.message.includes('duplicate')) {
        log(`Erro ao migrar password reset: ${error.message}`, 'error');
        stats.errors++;
      }
    }
  }

  log(`${stats.password_resets} password resets migrados`, 'success');
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function main() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  CFLOW GESTOR - Migração SQLite → Supabase (PostgreSQL)');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Testar conexão com PostgreSQL
    log('Testando conexão com Supabase...', 'start');
    await pgPool.query('SELECT NOW()');
    log('Conexão com Supabase OK!', 'success');
    console.log('');

    // Executar migrações na ordem correta (respeitar foreign keys)
    await migrateCompanies();
    await migrateEquipes();
    await migrateUsuarios();
    await migrateAdministradoras();
    await migrateClientes();
    await migrateMetas();
    await migrateComissoes();
    await migrateParcelasComissao();
    await migrateFormulariosPublicos();
    await migratePasswordResets();

    // Relatório final
    console.log('');
    console.log('═'.repeat(60));
    console.log('  RELATÓRIO DE MIGRAÇÃO');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`  Companies:      ${stats.companies}`);
    console.log(`  Equipes:        ${stats.equipes}`);
    console.log(`  Usuários:       ${stats.usuarios}`);
    console.log(`  Administradoras: ${stats.administradoras}`);
    console.log(`  Clientes:       ${stats.clientes}`);
    console.log(`  Metas:          ${stats.metas}`);
    console.log(`  Comissões:      ${stats.comissoes}`);
    console.log(`  Parcelas:       ${stats.parcelas}`);
    console.log(`  Formulários:    ${stats.formularios}`);
    console.log(`  Password Resets: ${stats.password_resets}`);
    console.log('');
    console.log(`  Erros:          ${stats.errors}`);
    console.log('');

    if (stats.errors === 0) {
      log('Migração concluída com sucesso!', 'success');
    } else {
      log(`Migração concluída com ${stats.errors} erros. Verifique os logs acima.`, 'warning');
    }

  } catch (error) {
    log(`Erro fatal na migração: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
    console.log('');
    log('Conexões encerradas.', 'end');
  }
}

// Executar
main();
