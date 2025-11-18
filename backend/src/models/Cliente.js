import pool from '../config/database.js';

class Cliente {
  // Criar novo cliente com TODOS os campos do formulário
  static async create(clienteData) {
    const {
      // Dados Básicos
      nome,
      cpf,
      telefone,
      email,

      // Dados Pessoais
      data_nascimento,
      estado_civil,
      nacionalidade,
      cidade_nascimento,
      nome_mae,
      profissao,
      remuneracao,

      // Contatos
      telefone_residencial,
      telefone_comercial,
      telefone_celular,
      telefone_celular_2,

      // Documentação
      tipo_documento,
      numero_documento,
      orgao_emissor,
      data_emissao,

      // Dados do Cônjuge
      cpf_conjuge,
      nome_conjuge,

      // Endereço
      cep,
      tipo_logradouro,
      endereco,
      numero_endereco,
      complemento,
      bairro,
      cidade,
      estado,

      // Pagamento - 1ª Parcela
      forma_pagamento_primeira,
      data_pre_datado,
      valor_cheque,
      numero_cheque,
      data_vencimento_cheque,
      banco_cheque,
      agencia_cheque,
      conta_cheque,

      // Pagamento - Demais Parcelas
      forma_pagamento_demais,
      nome_correntista,
      cpf_correntista,
      banco_debito,
      agencia_debito,
      conta_debito,

      // Seguro
      aceita_seguro,

      // Dados do Consórcio
      valor_carta,
      administradora,
      grupo,
      cota,
      observacao,

      // Controle
      etapa = 'novo_contato',
      vendedor_id
    } = clienteData;

    const query = `
      INSERT INTO clientes (
        nome, cpf, telefone, email,
        data_nascimento, estado_civil, nacionalidade, cidade_nascimento, nome_mae, profissao, remuneracao,
        telefone_residencial, telefone_comercial, telefone_celular, telefone_celular_2,
        tipo_documento, numero_documento, orgao_emissor, data_emissao,
        cpf_conjuge, nome_conjuge,
        cep, tipo_logradouro, endereco, numero_endereco, complemento, bairro, cidade, estado,
        forma_pagamento_primeira, data_pre_datado, valor_cheque, numero_cheque, data_vencimento_cheque,
        banco_cheque, agencia_cheque, conta_cheque,
        forma_pagamento_demais, nome_correntista, cpf_correntista, banco_debito, agencia_debito, conta_debito,
        aceita_seguro,
        valor_carta, administradora, grupo, cota, observacao,
        etapa, vendedor_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36, $37,
        $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
      )
      RETURNING *
    `;

    const values = [
      nome, cpf, telefone, email,
      data_nascimento, estado_civil, nacionalidade, cidade_nascimento, nome_mae, profissao, remuneracao,
      telefone_residencial, telefone_comercial, telefone_celular, telefone_celular_2,
      tipo_documento, numero_documento, orgao_emissor, data_emissao,
      cpf_conjuge, nome_conjuge,
      cep, tipo_logradouro, endereco, numero_endereco, complemento, bairro, cidade, estado,
      forma_pagamento_primeira, data_pre_datado, valor_cheque, numero_cheque, data_vencimento_cheque,
      banco_cheque, agencia_cheque, conta_cheque,
      forma_pagamento_demais, nome_correntista, cpf_correntista, banco_debito, agencia_debito, conta_debito,
      aceita_seguro,
      valor_carta, administradora, grupo, cota, observacao,
      etapa, vendedor_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar clientes (com filtro por vendedor se não for admin)
  static async list(vendedorId = null) {
    let query = `
      SELECT c.*, u.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
    `;

    const values = [];

    if (vendedorId) {
      query += ' WHERE c.vendedor_id = $1';
      values.push(vendedorId);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Listar clientes por lista de vendedores (para gerentes)
  static async listByVendedores(vendedoresIds) {
    if (!vendedoresIds || vendedoresIds.length === 0) {
      return [];
    }

    // Criar placeholders para o IN clause: $1, $2, $3, etc
    const placeholders = vendedoresIds.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      SELECT c.*, u.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.vendedor_id IN (${placeholders})
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, vendedoresIds);
    return result.rows;
  }

  // Buscar cliente por ID
  static async findById(id, vendedorId = null) {
    let query = `
      SELECT c.*, u.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.id = $1
    `;

    const values = [id];

    if (vendedorId) {
      query += ' AND c.vendedor_id = $2';
      values.push(vendedorId);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Atualizar cliente
  static async update(id, clienteData, vendedorId = null) {
    const {
      // Dados Básicos
      nome,
      cpf,
      email,

      // Dados Pessoais
      data_nascimento,
      estado_civil,
      nacionalidade,
      cidade_nascimento,
      nome_mae,
      profissao,
      remuneracao,

      // Contatos
      telefone_residencial,
      telefone_comercial,
      telefone_celular,
      telefone_celular_2,

      // Documentação
      tipo_documento,
      numero_documento,
      orgao_emissor,
      data_emissao,

      // Dados do Cônjuge
      cpf_conjuge,
      nome_conjuge,

      // Endereço
      cep,
      tipo_logradouro,
      endereco,
      numero_endereco,
      complemento,
      bairro,
      cidade,
      estado,

      // Pagamento
      forma_pagamento_primeira,
      data_pre_datado,
      valor_cheque,
      numero_cheque,
      data_vencimento_cheque,
      banco_cheque,
      agencia_cheque,
      conta_cheque,
      forma_pagamento_demais,
      nome_correntista,
      cpf_correntista,
      banco_debito,
      agencia_debito,
      conta_debito,

      // Seguro
      aceita_seguro,

      // Dados do Consórcio
      valor_carta,
      administradora,
      grupo,
      cota,
      observacao,
      etapa
    } = clienteData;

    let query = `
      UPDATE clientes
      SET nome = $1, cpf = $2, email = $3,
          data_nascimento = $4, estado_civil = $5, nacionalidade = $6,
          cidade_nascimento = $7, nome_mae = $8, profissao = $9, remuneracao = $10,
          telefone_residencial = $11, telefone_comercial = $12, telefone_celular = $13, telefone_celular_2 = $14,
          tipo_documento = $15, numero_documento = $16, orgao_emissor = $17, data_emissao = $18,
          cpf_conjuge = $19, nome_conjuge = $20,
          cep = $21, tipo_logradouro = $22, endereco = $23, numero_endereco = $24,
          complemento = $25, bairro = $26, cidade = $27, estado = $28,
          forma_pagamento_primeira = $29, data_pre_datado = $30, valor_cheque = $31,
          numero_cheque = $32, data_vencimento_cheque = $33, banco_cheque = $34,
          agencia_cheque = $35, conta_cheque = $36,
          forma_pagamento_demais = $37, nome_correntista = $38, cpf_correntista = $39,
          banco_debito = $40, agencia_debito = $41, conta_debito = $42,
          aceita_seguro = $43,
          valor_carta = $44, administradora = $45, grupo = $46, cota = $47, observacao = $48, etapa = $49
      WHERE id = $50
    `;

    const values = [
      nome, cpf, email,
      data_nascimento, estado_civil, nacionalidade, cidade_nascimento, nome_mae, profissao, remuneracao,
      telefone_residencial, telefone_comercial, telefone_celular, telefone_celular_2,
      tipo_documento, numero_documento, orgao_emissor, data_emissao,
      cpf_conjuge, nome_conjuge,
      cep, tipo_logradouro, endereco, numero_endereco, complemento, bairro, cidade, estado,
      forma_pagamento_primeira, data_pre_datado, valor_cheque, numero_cheque, data_vencimento_cheque,
      banco_cheque, agencia_cheque, conta_cheque,
      forma_pagamento_demais, nome_correntista, cpf_correntista, banco_debito, agencia_debito, conta_debito,
      aceita_seguro,
      valor_carta, administradora, grupo, cota, observacao, etapa,
      id
    ];

    if (vendedorId) {
      query += ' AND vendedor_id = $51';
      values.push(vendedorId);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Atualizar apenas a etapa (para o Kanban)
  static async updateEtapa(id, etapa, vendedorId = null) {
    let query = 'UPDATE clientes SET etapa = $1 WHERE id = $2';
    const values = [etapa, id];

    if (vendedorId) {
      query += ' AND vendedor_id = $3';
      values.push(vendedorId);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar cliente
  static async delete(id, vendedorId = null) {
    let query = 'DELETE FROM clientes WHERE id = $1';
    const values = [id];

    if (vendedorId) {
      query += ' AND vendedor_id = $2';
      values.push(vendedorId);
    }

    query += ' RETURNING id';

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Estatísticas por etapa
  static async estatisticasPorEtapa(vendedorId = null) {
    let query = `
      SELECT etapa, COUNT(*) as total
      FROM clientes
    `;

    const values = [];

    if (vendedorId) {
      query += ' WHERE vendedor_id = $1';
      values.push(vendedorId);
    }

    query += ' GROUP BY etapa';

    const result = await pool.query(query, values);
    return result.rows;
  }
}

export default Cliente;
