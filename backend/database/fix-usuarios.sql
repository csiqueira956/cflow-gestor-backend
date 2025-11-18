-- Atualizar usuários com hashes de senha corretos
-- Execute este script no SQL Editor do Supabase

-- Deletar usuários existentes (se houver)
DELETE FROM usuarios WHERE email IN ('admin@gestorconsorcios.com', 'vendedor@gestorconsorcios.com');

-- Inserir usuário admin com hash correto (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Administrador', 'admin@gestorconsorcios.com', '$2a$10$hOAjh62OYTYh2AjnLtuEbuIbNNLgo.y4ujJ9qFXNqH/29LL7mIN6a', 'admin');

-- Inserir usuário vendedor com hash correto (senha: vendedor123)
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Vendedor Exemplo', 'vendedor@gestorconsorcios.com', '$2a$10$xPfea7UP9eYet2BOOzNSf.iI3n4glgkOhR7K9oeD/PdfO2rcKsjui', 'vendedor');
