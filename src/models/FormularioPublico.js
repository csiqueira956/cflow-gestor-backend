import pool from '../config/database.js';
import crypto from 'crypto';

class FormularioPublico {
  // Criar novo formulário público
  static async create(vendedorId, dados = {}) {
    const { titulo = 'Formulário de Cadastro', descricao = '', expires_at = null } = dados;

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');

    const query = `
      INSERT INTO formularios_publicos (token, vendedor_id, titulo, descricao, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [token, vendedorId, titulo, descricao, expires_at];
    await pool.query(query, values);

    // Buscar o registro inserido (SQLite não suporta RETURNING)
    const selectQuery = `SELECT * FROM formularios_publicos WHERE token = $1`;
    const result = await pool.query(selectQuery, [token]);
    return result.rows[0];
  }

  // Buscar por token
  static async findByToken(token) {
    const query = `
      SELECT f.*, u.nome as vendedor_nome, u.email as vendedor_email
      FROM formularios_publicos f
      LEFT JOIN usuarios u ON f.vendedor_id = u.id
      WHERE f.token = $1
    `;

    const result = await pool.query(query, [token]);
    return result.rows[0];
  }

  // Listar formulários do vendedor
  static async listByVendedor(vendedorId) {
    const query = `
      SELECT *
      FROM formularios_publicos
      WHERE vendedor_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [vendedorId]);
    return result.rows;
  }

  // Incrementar contador de preenchimentos
  static async incrementarPreenchimentos(token) {
    const query = `
      UPDATE formularios_publicos
      SET total_preenchimentos = total_preenchimentos + 1
      WHERE token = $1
    `;

    await pool.query(query, [token]);

    // Buscar o registro atualizado (SQLite não suporta RETURNING)
    const selectQuery = `SELECT * FROM formularios_publicos WHERE token = $1`;
    const result = await pool.query(selectQuery, [token]);
    return result.rows[0];
  }

  // Ativar/Desativar formulário
  static async toggleAtivo(id, vendedorId) {
    const query = `
      UPDATE formularios_publicos
      SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END
      WHERE id = $1 AND vendedor_id = $2
    `;

    await pool.query(query, [id, vendedorId]);

    // Buscar o registro atualizado (SQLite não suporta RETURNING)
    const selectQuery = `SELECT * FROM formularios_publicos WHERE id = $1 AND vendedor_id = $2`;
    const result = await pool.query(selectQuery, [id, vendedorId]);
    return result.rows[0];
  }

  // Deletar formulário
  static async delete(id, vendedorId) {
    // Primeiro buscar para verificar se existe
    const selectQuery = `SELECT id FROM formularios_publicos WHERE id = $1 AND vendedor_id = $2`;
    const existsResult = await pool.query(selectQuery, [id, vendedorId]);

    if (existsResult.rows.length === 0) {
      return null;
    }

    const query = `
      DELETE FROM formularios_publicos
      WHERE id = $1 AND vendedor_id = $2
    `;

    await pool.query(query, [id, vendedorId]);
    return existsResult.rows[0];
  }
}

export default FormularioPublico;
