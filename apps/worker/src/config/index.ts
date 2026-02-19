// ============================================================
// apps/worker/src/config/index.ts
// Configuração centralizada do Worker
// ============================================================

export const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  pje: {
    baseUrl: process.env.PJE_BASE_URL || 'https://pje.tjba.jus.br',
    ssoUrl: process.env.PJE_SSO_URL || 'https://sso.cloud.pje.jus.br',
    frontendOrigin: process.env.PJE_FRONTEND_ORIGIN || 'https://frontend.cloud.pje.jus.br',
    legacyApp: 'pje-tjba-1g',
    restBase: '/pje/seam/resource/rest/pje-legacy',
    sessionTtl: 8 * 60 * 60,
    defaultPageSize: 500,
    downloadBatchSize: 10,
    downloadPollInterval: 10_000,
    downloadTimeout: 300_000,
    maxRetries: 2,
    requestDelay: 1_000,
  },

  storage: {
    basePath: process.env.DOWNLOAD_PATH || '/tmp/pje-downloads',
  },

  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/forumhub',
  },
};
