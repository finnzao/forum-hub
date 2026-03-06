import type { FastifyInstance } from 'fastify';
import { PJEDownloadRepositoryMemory } from './repositories/pje-download.repository.memory';
import { PJEDownloadService } from './services/pje-download.service';
import { pjeDownloadRoutes } from './controllers/pje-download.controller';
import { PJEDownloadWorker } from './services/pje-download-worker';
import { PjeAdvogadosService } from './services/pje-advogados/index';
import { pjeAdvogadosRoutes } from './controllers/pje-advogados.controller';

export async function registerPJEDownloadModule(fastify: FastifyInstance) {
  const repository = new PJEDownloadRepositoryMemory();
  const service = new PJEDownloadService(repository);

  const worker = new PJEDownloadWorker(service, repository);
  worker.start();

  await fastify.register(pjeDownloadRoutes(service), {
    prefix: '/api/pje/downloads',
  });

  const advogadosService = new PjeAdvogadosService();
  await fastify.register(pjeAdvogadosRoutes(advogadosService), {
    prefix: '/api/pje/advogados',
  });

  const cleanupInterval = setInterval(() => {
    service.cleanup();
  }, 10 * 60 * 1000);

  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
    worker.stop();
  });
}
