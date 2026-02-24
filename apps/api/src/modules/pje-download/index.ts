// ============================================================
// apps/api/src/modules/pje-download/index.ts
// Module — registra rotas PJE Download (modo in-memory)
// Sem Redis, sem PostgreSQL. Ideal para desenvolvimento/testes.
// ============================================================

import type { FastifyInstance } from 'fastify';
import { PJEDownloadRepositoryMemory } from './repositories/pje-download.repository.memory';
import { PJEDownloadService } from './services/pje-download.service';
import { pjeDownloadRoutes } from './controllers/pje-download.controller';

export async function registerPJEDownloadModule(fastify: FastifyInstance) {
  // Repositório in-memory (dados perdidos ao reiniciar)
  const repository = new PJEDownloadRepositoryMemory();

  // Service sem Redis — 2FA, progresso e cancelamento em memória
  const service = new PJEDownloadService(repository);

  // Registrar rotas
  await fastify.register(pjeDownloadRoutes(service), {
    prefix: '/api/pje/downloads',
  });

  // Limpeza periódica para evitar memory leak (a cada 10 minutos)
  const cleanupInterval = setInterval(() => {
    service.cleanup();
  }, 10 * 60 * 1000);

  // Limpar interval quando o server fechar
  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
  });

  fastify.log.info('✅ Módulo PJE Download registrado em /api/pje/downloads (storage: memory)');
}
