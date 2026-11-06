-- ==============================================================================
-- GESTOR MEI — MIGRAÇÃO CRÍTICA DE PRODUÇÃO (PostgreSQL / Neon)
-- Alinhamento do ENUM userrole e compatibilidade com papéis RBAC legados
-- ==============================================================================

-- 1. Expansão dos valores do ENUM userrole no catálogo PostgreSQL
-- Nota: Executado fora de transação multi-statement para persistência imediata
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MASTER';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'CONSULTOR';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'OPERATOR';

-- 2. Migração segura dos registros legados para os novos papéis canônicos
UPDATE users 
SET role = 'OWNER' 
WHERE UPPER(role::text) = 'ADMIN';

UPDATE users 
SET role = 'OPERATOR' 
WHERE UPPER(role::text) = 'OPERADOR';

-- 3. Confirmação dos valores migrados
SELECT id, email, role, ativo, ultimo_acesso 
FROM users 
WHERE role IN ('MASTER', 'OWNER', 'CONSULTOR', 'OPERATOR');
