
-- ==========================================
-- MEU FINANCEIRO
-- Banco de dados PostgreSQL
-- ==========================================

-- 1. USUÁRIOS

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TRANSAÇÕES FINANCEIRAS

CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    categoria_id INTEGER,

    descricao VARCHAR(200) NOT NULL,

    tipo VARCHAR(10) NOT NULL
        CHECK (tipo IN ('receita', 'despesa')),

    valor NUMERIC(12,2) NOT NULL
        CHECK (valor > 0),

    data DATE NOT NULL DEFAULT CURRENT_DATE,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. METAS FINANCEIRAS

CREATE TABLE IF NOT EXISTS metas (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    nome VARCHAR(120) NOT NULL,

    valor_alvo NUMERIC(12,2) NOT NULL
        CHECK (valor_alvo > 0),

    valor_atual NUMERIC(12,2) NOT NULL
        DEFAULT 0
        CHECK (valor_atual >= 0),

    prazo DATE,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ÍNDICES PARA MELHORAR AS CONSULTAS

CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_data
ON transacoes (usuario_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_metas_usuario
ON metas (usuario_id);

-- 5. CONFERIR AS TABELAS CRIADAS

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
