-- ============================================================
-- Migration: Criar tabelas para download PJE
-- ============================================================

CREATE TABLE IF NOT EXISTS pje_download_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           INTEGER NOT NULL,
    mode              VARCHAR(20) NOT NULL CHECK (mode IN ('by_number', 'by_task', 'by_tag')),
    params            JSONB NOT NULL DEFAULT '{}',
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending', 'authenticating', 'awaiting_2fa', 'selecting_profile',
                        'processing', 'downloading', 'checking_integrity', 'retrying',
                        'completed', 'failed', 'cancelled', 'partial'
                      )),
    progress          INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    total_processes   INTEGER DEFAULT 0,
    success_count     INTEGER DEFAULT 0,
    failure_count     INTEGER DEFAULT 0,
    files             JSONB DEFAULT '[]'::jsonb,
    errors            JSONB DEFAULT '[]'::jsonb,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pje_download_audit (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES pje_download_jobs(id) ON DELETE CASCADE,
    user_id           INTEGER NOT NULL,
    process_number    VARCHAR(30) NOT NULL,
    process_id        INTEGER,
    file_name         VARCHAR(255),
    file_path         VARCHAR(500),
    file_size         BIGINT,
    status            VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message     TEXT,
    downloaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pje_jobs_user_id ON pje_download_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_pje_jobs_status ON pje_download_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pje_jobs_created_at ON pje_download_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pje_jobs_user_status ON pje_download_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_pje_audit_job_id ON pje_download_audit(job_id);
CREATE INDEX IF NOT EXISTS idx_pje_audit_user_id ON pje_download_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_pje_audit_process_number ON pje_download_audit(process_number);
CREATE INDEX IF NOT EXISTS idx_pje_audit_downloaded_at ON pje_download_audit(downloaded_at DESC);

COMMENT ON TABLE pje_download_jobs IS 'Jobs de download de processos do PJE. Credenciais NUNCA são armazenadas aqui.';
COMMENT ON TABLE pje_download_audit IS 'Auditoria append-only de cada download individual.';
COMMENT ON COLUMN pje_download_jobs.params IS 'Parâmetros do download (modo, números, etiqueta, etc). Sem credenciais.';
COMMENT ON COLUMN pje_download_jobs.files IS 'Array JSON de arquivos baixados com sucesso [{processNumber, fileName, filePath, fileSize, downloadedAt}].';
COMMENT ON COLUMN pje_download_jobs.errors IS 'Array JSON de erros [{processNumber, message, code, timestamp}].';
