-- Migration: Criar tabela simulador_taxas para armazenar taxas de consórcio por administradora
-- Execute este SQL no banco de dados Supabase

CREATE TABLE IF NOT EXISTS simulador_taxas (
    id SERIAL PRIMARY KEY,
    administradora_id INTEGER NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('imovel', 'veiculo', 'servico', 'moto')),
    taxa_administracao DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    fundo_reserva DECIMAL(5,2) DEFAULT 2.00,
    seguro_mensal DECIMAL(5,3) DEFAULT 0.030,
    prazo_minimo INTEGER DEFAULT 12,
    prazo_maximo INTEGER DEFAULT 200,
    credito_minimo DECIMAL(15,2) DEFAULT 0,
    credito_maximo DECIMAL(15,2) DEFAULT 9999999999.99,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(administradora_id, categoria, company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_simulador_taxas_company ON simulador_taxas(company_id);
CREATE INDEX IF NOT EXISTS idx_simulador_taxas_admin ON simulador_taxas(administradora_id);
CREATE INDEX IF NOT EXISTS idx_simulador_taxas_categoria ON simulador_taxas(categoria);

-- Comentários
COMMENT ON TABLE simulador_taxas IS 'Taxas de consórcio por administradora para simulador';
COMMENT ON COLUMN simulador_taxas.categoria IS 'Categoria: imovel, veiculo, servico, moto';
COMMENT ON COLUMN simulador_taxas.taxa_administracao IS 'Taxa de administração em percentual (ex: 18.00 = 18%)';
COMMENT ON COLUMN simulador_taxas.fundo_reserva IS 'Fundo de reserva em percentual';
COMMENT ON COLUMN simulador_taxas.seguro_mensal IS 'Seguro mensal em percentual (ex: 0.030 = 0.03%)';

-- Adicionar coluna origem na tabela clientes se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'origem') THEN
        ALTER TABLE clientes ADD COLUMN origem VARCHAR(50) DEFAULT 'manual';
    END IF;
END $$;
