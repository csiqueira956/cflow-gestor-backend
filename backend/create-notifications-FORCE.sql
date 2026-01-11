-- =====================================================
-- CRIAR TABELA NOTIFICATIONS - VERSÃO FORÇADA
-- Execute este SQL se o anterior não funcionou
-- =====================================================

-- 1. Deletar tabela se já existir (limpar qualquer inconsistência)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Criar tabela explicitamente no schema public
CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  link VARCHAR(500),
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP,
  metadados JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Adicionar foreign keys DEPOIS (mais seguro)
ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_company
  FOREIGN KEY (company_id)
  REFERENCES public.companies(id)
  ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_lida_por
  FOREIGN KEY (lida_por)
  REFERENCES public.usuarios(id)
  ON DELETE SET NULL;

-- 4. Criar índices
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_lida ON public.notifications(lida);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_expira_em ON public.notifications(expira_em);

-- 5. Verificar se criou
SELECT 'Tabela criada com sucesso!' as status;
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'notifications';

-- 6. Testar inserção
INSERT INTO public.notifications (company_id, tipo, titulo, mensagem)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'sistema',
  'Sistema de notificações ativado',
  'As notificações estão funcionando!'
);

-- 7. Verificar se inseriu
SELECT COUNT(*) as total_notifications FROM public.notifications;
