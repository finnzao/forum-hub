// ============================================================
// apps/api/src/modules/pje-download/index.ts
// Module — registra rotas PJE Download (modo in-memory)
// Sem Redis, sem PostgreSQL. Ideal para desenvolvimento/testes.
// ============================================================

import type { FastifyInstance } from 'fastify';
import { PJEDownloadRepositoryMemory } from './repositories/pje-download.repository.memory';
import { PJEDownloadService } from './services/pje-download.service';
import { pjeDownloadRoutes } from './controllers/pje-download.controller';
import { PJEDownloadWorker } from './services/pje-download-worker';

export async function registerPJEDownloadModule(fastify: FastifyInstance) {
  const repository = new PJEDownloadRepositoryMemory();
  const service = new PJEDownloadService(repository);

  // Iniciar worker que processa jobs em background
  const worker = new PJEDownloadWorker(service, repository);
  worker.start();

  await fastify.register(pjeDownloadRoutes(service), {
    prefix: '/api/pje/downloads',
  });

  const cleanupInterval = setInterval(() => {
    service.cleanup();
  }, 10 * 60 * 1000);

  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
    worker.stop();
  });

  fastify.log.info('✅ Módulo PJE Download registrado em /api/pje/downloads (storage: memory, worker: ativo)');
}
