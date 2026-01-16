-- Migration: Criar tabela de atividades/follow-ups
-- Data: 2025-01-15

-- Tabela de atividades (histórico de interações com clientes)
CREATE TABLE IF NOT EXISTS atividades (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Tipo de atividade
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN ('ligacao', 'email', 'whatsapp', 'visita', 'reuniao', 'proposta', 'outro')
  ),

  -- Detalhes
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,

  -- Resultado da atividade
  resultado VARCHAR(50) CHECK (
    resultado IN ('sucesso', 'sem_resposta', 'reagendar', 'interessado', 'nao_interessado', 'pendente')
  ),

  -- Agendamento de próximo follow-up
  proximo_followup TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  data_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_atividades_cliente_id ON atividades(cliente_id);
CREATE INDEX idx_atividades_usuario_id ON atividades(usuario_id);
CREATE INDEX idx_atividades_company_id ON atividades(company_id);
CREATE INDEX idx_atividades_data ON atividades(data_atividade DESC);
CREATE INDEX idx_atividades_proximo_followup ON atividades(proximo_followup) WHERE proximo_followup IS NOT NULL;

-- Adicionar coluna ultimo_followup na tabela clientes (para acesso rápido)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_followup TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_followup ON clientes(ultimo_followup);

-- Comentários
COMMENT ON TABLE atividades IS 'Histórico de interações/follow-ups com clientes';
COMMENT ON COLUMN atividades.tipo IS 'Tipo: ligacao, email, whatsapp, visita, reuniao, proposta, outro';
COMMENT ON COLUMN atividades.resultado IS 'Resultado: sucesso, sem_resposta, reagendar, interessado, nao_interessado, pendente';
