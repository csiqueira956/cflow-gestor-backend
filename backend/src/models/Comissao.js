import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar conexão SQLite direto para este model
const dbPath = path.join(__dirname, '../../database/gestor-consorcios.db');
const db = new sqlite3.Database(dbPath);

// Promisificar métodos do SQLite
// db.run precisa de uma implementação customizada para retornar lastID
const dbRun = (query, params) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

class Comissao {
  // Criar nova comissão
  static async create(comissaoData) {
    const {
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas = 1,
      status = 'pendente'
    } = comissaoData;

    const query = `
      INSERT INTO comissoes (
        cliente_id, vendedor_id, valor_venda, percentual_comissao,
        valor_comissao, numero_parcelas, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas,
      status
    ];

    const result = await dbRun(query, values);

    // Buscar a comissão recém-criada
    return await this.findById(result.lastID);
  }

  // Listar comissões (com filtros opcionais)
  static async list(filters = {}) {
    console.log('🔧 Comissao.list() INICIADO com filtros:', filters);

    try {
      let query = `
        SELECT
          c.*,
          cl.nome as cliente_nome,
          u.nome as vendedor_nome
        FROM comissoes c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.vendedor_id = u.id
        WHERE 1=1
      `;

      const values = [];

      if (filters.vendedor_id) {
        query += ` AND c.vendedor_id = ?`;
        values.push(filters.vendedor_id);
      }

      if (filters.status) {
        query += ` AND c.status = ?`;
        values.push(filters.status);
      }

      query += ' ORDER BY c.created_at DESC';

      console.log('🔧 Executando query:', query);
      console.log('🔧 Com valores:', values);

      const comissoes = await dbAll(query, values);

      console.log('🔧 Query executada com sucesso. Resultados:', comissoes ? comissoes.length : 0);

      // Buscar parcelas para cada comissão
      for (const comissao of comissoes) {
        const parcelas = await dbAll(
          'SELECT * FROM parcelas_comissao WHERE comissao_id = ? ORDER BY numero_parcela ASC',
          [comissao.id]
        );
        comissao.parcelas = parcelas;
      }

      console.log('🔧 Parcelas adicionadas às comissões');

      return comissoes;
    } catch (error) {
      console.error('❌ ERRO em Comissao.list():', error);
      throw error;
    }
  }

  // Buscar comissão por ID com suas parcelas
  static async findById(id) {
    const comissaoQuery = `
      SELECT
        c.*,
        cl.nome as cliente_nome,
        cl.cpf as cliente_cpf,
        cl.telefone_celular as cliente_telefone,
        u.nome as vendedor_nome,
        u.email as vendedor_email
      FROM comissoes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.id = ?
    `;

    const parcelasQuery = `
      SELECT * FROM parcelas_comissao
      WHERE comissao_id = ?
      ORDER BY numero_parcela ASC
    `;

    const [comissao, parcelas] = await Promise.all([
      dbGet(comissaoQuery, [id]),
      dbAll(parcelasQuery, [id])
    ]);

    if (!comissao) {
      return null;
    }

    comissao.parcelas = parcelas;

    return comissao;
  }

  // Atualizar comissão
  static async update(id, comissaoData) {
    const {
      numero_parcelas,
      status
    } = comissaoData;

    const query = `
      UPDATE comissoes
      SET numero_parcelas = ?, status = ?
      WHERE id = ?
    `;

    const values = [numero_parcelas, status, id];

    await dbRun(query, values);

    // Buscar comissão atualizada
    return await this.findById(id);
  }

  // Deletar comissão
  static async delete(id) {
    const query = 'DELETE FROM comissoes WHERE id = ?';
    await dbRun(query, [id]);
    return { id };
  }

  // Criar parcela de comissão
  static async createParcela(parcelaData) {
    const {
      comissao_id,
      numero_parcela,
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status = 'pendente',
      observacao
    } = parcelaData;

    const query = `
      INSERT INTO parcelas_comissao (
        comissao_id, numero_parcela, valor_parcela,
        data_vencimento, data_pagamento, status, observacao
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      comissao_id,
      numero_parcela,
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    ];

    const result = await dbRun(query, values);

    // Buscar parcela recém-criada
    return await dbGet('SELECT * FROM parcelas_comissao WHERE id = ?', [result.lastID]);
  }

  // Atualizar parcela
  static async updateParcela(id, parcelaData) {
    const {
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    } = parcelaData;

    const query = `
      UPDATE parcelas_comissao
      SET valor_parcela = ?, data_vencimento = ?, data_pagamento = ?,
          status = ?, observacao = ?
      WHERE id = ?
    `;

    const values = [
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao,
      id
    ];

    await dbRun(query, values);

    // Buscar parcela atualizada
    return await dbGet('SELECT * FROM parcelas_comissao WHERE id = ?', [id]);
  }

  // Deletar parcela
  static async deleteParcela(id) {
    const query = 'DELETE FROM parcelas_comissao WHERE id = ?';
    await dbRun(query, [id]);
    return { id };
  }

  // Buscar parcelas por comissão
  static async findParcelasByComissaoId(comissaoId) {
    const query = `
      SELECT * FROM parcelas_comissao
      WHERE comissao_id = ?
      ORDER BY numero_parcela ASC
    `;

    const result = await dbAll(query, [comissaoId]);
    return result;
  }

  // Estatísticas de comissões por vendedor
  static async estatisticasPorVendedor() {
    const query = `
      SELECT
        u.id as vendedor_id,
        u.nome as vendedor_nome,
        COUNT(c.id) as total_comissoes,
        COALESCE(SUM(c.valor_comissao), 0) as total_valor,
        COALESCE(SUM(CASE WHEN c.status = 'pago' THEN c.valor_comissao ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN c.status = 'pendente' OR c.status = 'em_pagamento' THEN c.valor_comissao ELSE 0 END), 0) as total_pendente
      FROM usuarios u
      LEFT JOIN comissoes c ON u.id = c.vendedor_id
      WHERE u.role = 'vendedor'
      GROUP BY u.id, u.nome
      ORDER BY total_valor DESC
    `;

    const result = await dbAll(query);
    return result;
  }
}

export default Comissao;
