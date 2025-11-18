import crypto from 'crypto';
import pool from '../config/database.js';

class PasswordReset {
  // Criar token de reset de senha
  static async createToken(userId, email) {
    // Gerar token aleatório seguro
    const token = crypto.randomBytes(32).toString('hex');

    // Token expira em 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Deletar tokens anteriores do mesmo usuário
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    // Inserir novo token
    const query = `
      INSERT INTO password_resets (user_id, email, token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, token, expires_at
    `;

    const result = await pool.query(query, [userId, email, token, expiresAt]);
    return result.rows[0];
  }

  // Verificar se token é válido
  static async verifyToken(token) {
    const query = `
      SELECT pr.*, u.email, u.nome
      FROM password_resets pr
      JOIN usuarios u ON pr.user_id = u.id
      WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false
    `;

    const result = await pool.query(query, [token]);
    return result.rows[0];
  }

  // Marcar token como usado
  static async markAsUsed(token) {
    const query = 'UPDATE password_resets SET used = true WHERE token = $1';
    await pool.query(query, [token]);
  }

  // Limpar tokens expirados (manutenção)
  static async cleanExpiredTokens() {
    const query = 'DELETE FROM password_resets WHERE expires_at < NOW()';
    const result = await pool.query(query);
    return result.rowCount;
  }
}

export default PasswordReset;
