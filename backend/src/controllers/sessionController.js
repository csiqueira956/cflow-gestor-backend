import pool from '../config/database.js';

// Registrar sessão de login
export const registerSession = async (userId, companyId, ipAddress, userAgent) => {
  try {
    // Atualizar last_login no usuário
    await pool.query(
      `UPDATE usuarios SET last_login = NOW(), last_activity = NOW() WHERE id = $1`,
      [userId]
    );

    // Desativar sessões anteriores do mesmo usuário
    await pool.query(
      `UPDATE user_sessions SET is_active = false, logout_at = NOW() WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    // Criar nova sessão
    const result = await pool.query(
      `INSERT INTO user_sessions (user_id, company_id, login_at, last_activity, ip_address, user_agent, is_active)
       VALUES ($1, $2, NOW(), NOW(), $3, $4, true)
       RETURNING id`,
      [userId, companyId, ipAddress, userAgent]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao registrar sessão:', error);
    // Não falha o login se houver erro na sessão
    return null;
  }
};

// Atualizar última atividade
export const updateLastActivity = async (userId) => {
  try {
    await pool.query(
      `UPDATE usuarios SET last_activity = NOW() WHERE id = $1`,
      [userId]
    );

    await pool.query(
      `UPDATE user_sessions SET last_activity = NOW() WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
  }
};

// Registrar logout
export const registerLogout = async (userId) => {
  try {
    await pool.query(
      `UPDATE user_sessions SET is_active = false, logout_at = NOW() WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
  } catch (error) {
    console.error('Erro ao registrar logout:', error);
  }
};

// Listar usuários online (apenas super_admin)
// Considera online: atividade nos últimos 5 minutos
export const getOnlineUsers = async (req, res) => {
  try {
    const minutesThreshold = parseInt(req.query.minutes) || 5;

    const query = `
      SELECT
        u.id,
        u.nome,
        u.email,
        u.role,
        u.last_login,
        u.last_activity,
        c.nome as empresa_nome,
        c.id as company_id,
        s.login_at as session_start,
        s.ip_address,
        CASE
          WHEN u.last_activity > NOW() - INTERVAL '${minutesThreshold} minutes' THEN true
          ELSE false
        END as is_online,
        EXTRACT(EPOCH FROM (NOW() - s.login_at)) / 60 as session_duration_minutes
      FROM usuarios u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = true
      WHERE u.role != 'super_admin'
      ORDER BY u.last_activity DESC NULLS LAST
    `;

    const result = await pool.query(query);

    // Separar online e offline
    const users = result.rows.map(user => ({
      ...user,
      session_duration_formatted: user.session_duration_minutes
        ? formatDuration(user.session_duration_minutes)
        : null
    }));

    const online = users.filter(u => u.is_online);
    const offline = users.filter(u => !u.is_online);

    res.json({
      online: {
        count: online.length,
        users: online
      },
      offline: {
        count: offline.length,
        users: offline
      },
      total: users.length
    });
  } catch (error) {
    console.error('Erro ao buscar usuários online:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários online' });
  }
};

// Histórico de sessões de um usuário
export const getUserSessionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const query = `
      SELECT
        s.id,
        s.login_at,
        s.logout_at,
        s.last_activity,
        s.ip_address,
        s.is_active,
        EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60 as duration_minutes,
        u.nome as usuario_nome,
        c.nome as empresa_nome
      FROM user_sessions s
      JOIN usuarios u ON s.user_id = u.id
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.login_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    const sessions = result.rows.map(session => ({
      ...session,
      duration_formatted: formatDuration(session.duration_minutes)
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Erro ao buscar histórico de sessões:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de sessões' });
  }
};

// Estatísticas de sessões (super_admin)
export const getSessionStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Usuários online agora
    const onlineNow = await pool.query(`
      SELECT COUNT(*) as count
      FROM usuarios
      WHERE last_activity > NOW() - INTERVAL '5 minutes'
      AND role != 'super_admin'
    `);

    // Total de sessões no período
    const totalSessions = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE login_at > NOW() - INTERVAL '${days} days'
    `);

    // Média de tempo por sessão
    const avgDuration = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at)) / 60) as avg_minutes
      FROM user_sessions
      WHERE login_at > NOW() - INTERVAL '${days} days'
    `);

    // Sessões por dia
    const sessionsPerDay = await pool.query(`
      SELECT
        DATE(login_at) as date,
        COUNT(*) as sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_sessions
      WHERE login_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(login_at)
      ORDER BY date DESC
    `);

    // Usuários mais ativos
    const mostActiveUsers = await pool.query(`
      SELECT
        u.id,
        u.nome,
        u.email,
        c.nome as empresa_nome,
        COUNT(s.id) as total_sessions,
        SUM(EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60) as total_minutes
      FROM usuarios u
      LEFT JOIN user_sessions s ON u.id = s.user_id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE s.login_at > NOW() - INTERVAL '${days} days'
      AND u.role != 'super_admin'
      GROUP BY u.id, u.nome, u.email, c.nome
      ORDER BY total_minutes DESC
      LIMIT 10
    `);

    res.json({
      online_now: parseInt(onlineNow.rows[0].count),
      total_sessions: parseInt(totalSessions.rows[0].count),
      avg_session_minutes: Math.round(avgDuration.rows[0].avg_minutes || 0),
      avg_session_formatted: formatDuration(avgDuration.rows[0].avg_minutes || 0),
      sessions_per_day: sessionsPerDay.rows,
      most_active_users: mostActiveUsers.rows.map(u => ({
        ...u,
        total_time_formatted: formatDuration(u.total_minutes)
      })),
      period_days: days
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de sessões' });
  }
};

// Função auxiliar para formatar duração
function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0min';

  const mins = Math.round(minutes);

  if (mins < 60) {
    return `${mins}min`;
  }

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
