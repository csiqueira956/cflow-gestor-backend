-- Script para adicionar empresas de exemplo
-- Executar após create-empresas-tables.sql

-- Inserir empresas de exemplo
INSERT OR IGNORE INTO empresas (id, nome, email, cnpj, telefone, endereco, cidade, estado, cep, status) VALUES
(2, 'TechStart Soluções', 'admin@techstart.com.br', '12.345.678/0001-90', '(11) 98765-4321', 'Rua da Inovação, 123', 'São Paulo', 'SP', '01234-567', 'ACTIVE'),
(3, 'Vendas Premium LTDA', 'contato@vendaspremium.com', '23.456.789/0001-01', '(21) 97654-3210', 'Av. Comercial, 456', 'Rio de Janeiro', 'RJ', '20000-000', 'ACTIVE'),
(4, 'Startup Crescimento', 'admin@startupcrescimento.com', '34.567.890/0001-12', '(31) 96543-2109', 'Rua dos Empreendedores, 789', 'Belo Horizonte', 'MG', '30000-000', 'TRIAL'),
(5, 'Mega Corp Enterprises', 'admin@megacorp.com.br', '45.678.901/0001-23', '(11) 95432-1098', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', 'ACTIVE'),
(6, 'Pequena Empresa ME', 'contato@pequenaempresa.com', '56.789.012/0001-34', '(48) 94321-0987', 'Rua Principal, 321', 'Florianópolis', 'SC', '88000-000', 'OVERDUE'),
(7, 'Inovação Digital', 'admin@inovacaodigital.com', '67.890.123/0001-45', '(85) 93210-9876', 'Av. Tecnologia, 654', 'Fortaleza', 'CE', '60000-000', 'ACTIVE'),
(8, 'Testes Trial Corp', 'teste@trialcorp.com', '78.901.234/0001-56', '(61) 92109-8765', 'SQN 123, Bloco A', 'Brasília', 'DF', '70000-000', 'TRIAL'),
(9, 'Empresa Cancelada LTDA', 'admin@cancelada.com', '89.012.345/0001-67', '(41) 91098-7654', 'Rua das Araucárias, 987', 'Curitiba', 'PR', '80000-000', 'SUSPENDED'),
(10, 'Consórcios Master', 'admin@consorciosmaster.com', '90.123.456/0001-78', '(71) 90987-6543', 'Av. Oceânica, 2000', 'Salvador', 'BA', '40000-000', 'ACTIVE');

-- Criar usuários admin para cada empresa
INSERT OR IGNORE INTO usuarios (email, senha_hash, nome, role, company_id) VALUES
('admin@techstart.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Carlos Silva', 'admin', 2),
('contato@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Maria Santos', 'admin', 3),
('admin@startupcrescimento.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'João Oliveira', 'admin', 4),
('admin@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Ana Costa', 'admin', 5),
('contato@pequenaempresa.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Pedro Almeida', 'admin', 6),
('admin@inovacaodigital.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Juliana Ferreira', 'admin', 7),
('teste@trialcorp.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Roberto Lima', 'admin', 8),
('admin@cancelada.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Fernanda Rocha', 'admin', 9),
('admin@consorciosmaster.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Lucas Barbosa', 'admin', 10);

-- Criar assinaturas para as empresas
INSERT OR IGNORE INTO assinaturas (company_id, plano_id, status, data_inicio, data_fim_trial, data_proximo_vencimento, valor_mensal, usuarios_contratados) VALUES
-- TechStart Soluções - Plano Básico ATIVO
(2, 1, 'ACTIVE', datetime('now', '-3 months'), NULL, datetime('now', '+25 days'), 99.90, 3),

-- Vendas Premium - Plano Profissional ATIVO
(3, 2, 'ACTIVE', datetime('now', '-6 months'), NULL, datetime('now', '+15 days'), 299.90, 12),

-- Startup Crescimento - Plano Trial
(4, 4, 'TRIAL', datetime('now', '-5 days'), datetime('now', '+9 days'), NULL, 0, 2),

-- Mega Corp - Plano Empresarial ATIVO (cobrado por usuário)
(5, 3, 'ACTIVE', datetime('now', '-1 year'), NULL, datetime('now', '+20 days'), 858.00, 20),

-- Pequena Empresa - Plano Básico ATRASADO
(6, 1, 'OVERDUE', datetime('now', '-8 months'), NULL, datetime('now', '-10 days'), 99.90, 4),

-- Inovação Digital - Plano Profissional ATIVO
(7, 2, 'ACTIVE', datetime('now', '-4 months'), NULL, datetime('now', '+5 days'), 299.90, 15),

-- Testes Trial - Trial
(8, 4, 'TRIAL', datetime('now', '-2 days'), datetime('now', '+12 days'), NULL, 0, 1),

-- Empresa Cancelada - CANCELADA (estava no Básico)
(9, 1, 'CANCELLED', datetime('now', '-1 year'), NULL, datetime('now', '-60 days'), 0, 0),

-- Consórcios Master - Plano Profissional ATIVO
(10, 2, 'ACTIVE', datetime('now', '-9 months'), NULL, datetime('now', '+18 days'), 299.90, 18);

-- Adicionar alguns vendedores e leads para dar mais realismo
INSERT OR IGNORE INTO usuarios (email, senha_hash, nome, role, company_id) VALUES
-- TechStart (2-4 usuários)
('vendedor1@techstart.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Tech 1', 'vendedor', 2),
('vendedor2@techstart.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Tech 2', 'vendedor', 2),

-- Vendas Premium (8-12 usuários)
('v1@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Premium 1', 'vendedor', 3),
('v2@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Premium 2', 'vendedor', 3),
('v3@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Premium 3', 'vendedor', 3),
('v4@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Premium 4', 'vendedor', 3),
('v5@vendaspremium.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Premium 5', 'vendedor', 3),

-- Mega Corp (15-20 usuários)
('vendedor1@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Mega 1', 'vendedor', 5),
('vendedor2@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Mega 2', 'vendedor', 5),
('vendedor3@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Mega 3', 'vendedor', 5),
('vendedor4@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Mega 4', 'vendedor', 5),
('vendedor5@megacorp.com.br', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Mega 5', 'vendedor', 5),

-- Inovação Digital (10-15 usuários)
('v1@inovacaodigital.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Inovação 1', 'vendedor', 7),
('v2@inovacaodigital.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Inovação 2', 'vendedor', 7),
('v3@inovacaodigital.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Inovação 3', 'vendedor', 7),

-- Consórcios Master (12-18 usuários)
('v1@consorciosmaster.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Master 1', 'vendedor', 10),
('v2@consorciosmaster.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Master 2', 'vendedor', 10),
('v3@consorciosmaster.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Master 3', 'vendedor', 10),
('v4@consorciosmaster.com', '$2a$10$rZ8qY5xJ5nX8qY5xJ5nX8.5xJ5nX8qY5xJ5nX8qY5xJ5nX8qY5xJ5n', 'Vendedor Master 4', 'vendedor', 10);

-- Adicionar alguns leads (clientes) de exemplo
INSERT OR IGNORE INTO clientes (nome, email, telefone, company_id, etapa, vendedor_id) VALUES
-- TechStart
('Cliente Tech 1', 'cliente1@example.com', '(11) 91111-1111', 2, 'novo_contato', (SELECT id FROM usuarios WHERE email = 'vendedor1@techstart.com.br')),
('Cliente Tech 2', 'cliente2@example.com', '(11) 92222-2222', 2, 'negociacao', (SELECT id FROM usuarios WHERE email = 'vendedor2@techstart.com.br')),
('Cliente Tech 3', 'cliente3@example.com', '(11) 93333-3333', 2, 'proposta_enviada', (SELECT id FROM usuarios WHERE email = 'vendedor1@techstart.com.br')),

-- Vendas Premium
('Cliente Premium 1', 'cp1@example.com', '(21) 91111-1111', 3, 'novo_contato', (SELECT id FROM usuarios WHERE email = 'v1@vendaspremium.com')),
('Cliente Premium 2', 'cp2@example.com', '(21) 92222-2222', 3, 'negociacao', (SELECT id FROM usuarios WHERE email = 'v2@vendaspremium.com')),
('Cliente Premium 3', 'cp3@example.com', '(21) 93333-3333', 3, 'fechado', (SELECT id FROM usuarios WHERE email = 'v3@vendaspremium.com')),
('Cliente Premium 4', 'cp4@example.com', '(21) 94444-4444', 3, 'fechado', (SELECT id FROM usuarios WHERE email = 'v4@vendaspremium.com')),
('Cliente Premium 5', 'cp5@example.com', '(21) 95555-5555', 3, 'proposta_enviada', (SELECT id FROM usuarios WHERE email = 'v5@vendaspremium.com')),

-- Mega Corp
('Cliente Mega 1', 'cm1@example.com', '(11) 91111-2222', 5, 'novo_contato', (SELECT id FROM usuarios WHERE email = 'vendedor1@megacorp.com.br')),
('Cliente Mega 2', 'cm2@example.com', '(11) 92222-3333', 5, 'fechado', (SELECT id FROM usuarios WHERE email = 'vendedor2@megacorp.com.br')),
('Cliente Mega 3', 'cm3@example.com', '(11) 93333-4444', 5, 'fechado', (SELECT id FROM usuarios WHERE email = 'vendedor3@megacorp.com.br')),
('Cliente Mega 4', 'cm4@example.com', '(11) 94444-5555', 5, 'negociacao', (SELECT id FROM usuarios WHERE email = 'vendedor4@megacorp.com.br')),
('Cliente Mega 5', 'cm5@example.com', '(11) 95555-6666', 5, 'fechado', (SELECT id FROM usuarios WHERE email = 'vendedor5@megacorp.com.br')),

-- Inovação Digital
('Cliente Inovação 1', 'ci1@example.com', '(85) 91111-1111', 7, 'novo_contato', (SELECT id FROM usuarios WHERE email = 'v1@inovacaodigital.com')),
('Cliente Inovação 2', 'ci2@example.com', '(85) 92222-2222', 7, 'fechado', (SELECT id FROM usuarios WHERE email = 'v2@inovacaodigital.com')),
('Cliente Inovação 3', 'ci3@example.com', '(85) 93333-3333', 7, 'proposta_enviada', (SELECT id FROM usuarios WHERE email = 'v3@inovacaodigital.com')),

-- Consórcios Master
('Cliente Master 1', 'cma1@example.com', '(71) 91111-1111', 10, 'fechado', (SELECT id FROM usuarios WHERE email = 'v1@consorciosmaster.com')),
('Cliente Master 2', 'cma2@example.com', '(71) 92222-2222', 10, 'fechado', (SELECT id FROM usuarios WHERE email = 'v2@consorciosmaster.com')),
('Cliente Master 3', 'cma3@example.com', '(71) 93333-3333', 10, 'novo_contato', (SELECT id FROM usuarios WHERE email = 'v3@consorciosmaster.com')),
('Cliente Master 4', 'cma4@example.com', '(71) 94444-4444', 10, 'negociacao', (SELECT id FROM usuarios WHERE email = 'v4@consorciosmaster.com'));

-- Adicionar histórico de pagamentos
INSERT OR IGNORE INTO pagamentos (assinatura_id, company_id, valor, data_vencimento, data_pagamento, status, metodo_pagamento) VALUES
-- TechStart - últimos 3 meses pagos
((SELECT id FROM assinaturas WHERE company_id = 2), 2, 99.90, date('now', '-3 months'), date('now', '-3 months'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 2), 2, 99.90, date('now', '-2 months'), date('now', '-2 months'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 2), 2, 99.90, date('now', '-1 month'), date('now', '-1 month'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 2), 2, 99.90, date('now', '+25 days'), NULL, 'PENDING', NULL),

-- Vendas Premium - histórico completo
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-6 months'), date('now', '-6 months'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-5 months'), date('now', '-5 months'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-4 months'), date('now', '-4 months'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-3 months'), date('now', '-3 months'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-2 months'), date('now', '-2 months'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '-1 month'), date('now', '-1 month'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 3), 3, 299.90, date('now', '+15 days'), NULL, 'PENDING', NULL),

-- Mega Corp - empresa grande pagando em dia
((SELECT id FROM assinaturas WHERE company_id = 5), 5, 858.00, date('now', '-2 months'), date('now', '-2 months'), 'PAID', 'Transferência'),
((SELECT id FROM assinaturas WHERE company_id = 5), 5, 858.00, date('now', '-1 month'), date('now', '-1 month'), 'PAID', 'Transferência'),
((SELECT id FROM assinaturas WHERE company_id = 5), 5, 858.00, date('now', '+20 days'), NULL, 'PENDING', NULL),

-- Pequena Empresa - com atraso
((SELECT id FROM assinaturas WHERE company_id = 6), 6, 99.90, date('now', '-3 months'), date('now', '-2 months', '-15 days'), 'PAID', 'Boleto'),
((SELECT id FROM assinaturas WHERE company_id = 6), 6, 99.90, date('now', '-2 months'), NULL, 'OVERDUE', NULL),
((SELECT id FROM assinaturas WHERE company_id = 6), 6, 99.90, date('now', '-1 month'), NULL, 'OVERDUE', NULL),
((SELECT id FROM assinaturas WHERE company_id = 6), 6, 99.90, date('now', '-10 days'), NULL, 'OVERDUE', NULL),

-- Inovação Digital
((SELECT id FROM assinaturas WHERE company_id = 7), 7, 299.90, date('now', '-4 months'), date('now', '-4 months'), 'PAID', 'PIX'),
((SELECT id FROM assinaturas WHERE company_id = 7), 7, 299.90, date('now', '-3 months'), date('now', '-3 months'), 'PAID', 'PIX'),
((SELECT id FROM assinaturas WHERE company_id = 7), 7, 299.90, date('now', '-2 months'), date('now', '-2 months'), 'PAID', 'PIX'),
((SELECT id FROM assinaturas WHERE company_id = 7), 7, 299.90, date('now', '-1 month'), date('now', '-1 month'), 'PAID', 'PIX'),
((SELECT id FROM assinaturas WHERE company_id = 7), 7, 299.90, date('now', '+5 days'), NULL, 'PENDING', NULL),

-- Consórcios Master
((SELECT id FROM assinaturas WHERE company_id = 10), 10, 299.90, date('now', '-3 months'), date('now', '-3 months'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 10), 10, 299.90, date('now', '-2 months'), date('now', '-2 months'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 10), 10, 299.90, date('now', '-1 month'), date('now', '-1 month'), 'PAID', 'Cartão de Crédito'),
((SELECT id FROM assinaturas WHERE company_id = 10), 10, 299.90, date('now', '+18 days'), NULL, 'PENDING', NULL);
