import type { FastifyInstance } from 'fastify';
import { MemoryDownloadRepository } from './repositories/download.repository.memory';
import { PJEDownloadService } from './services/pje-download.service';
import { PJEDownloadWorker } from './services/pje-download-worker';
import { PjeAdvogadosService } from './services/pje-advogados/index';
import { authRoutes } from './controllers/auth.controller';
import { jobsRoutes } from './controllers/jobs.controller';
import { advogadosRoutes } from './controllers/advogados.controller';

export async function registerPJEDownloadModule(fastify: FastifyInstance) {
  const repository = new MemoryDownloadRepository();
  const service = new PJEDownloadService(repository);
  const worker = new PJEDownloadWorker(service, repository);
  worker.start();

  await fastify.register(authRoutes, { prefix: '/api/pje/downloads/auth' });
  await fastify.register(jobsRoutes(service), { prefix: '/api/pje/downloads' });

  const advogadosService = new PjeAdvogadosService();
  await fastify.register(advogadosRoutes(advogadosService), { prefix: '/api/pje/advogados' });

  const cleanupInterval = setInterval(() => service.cleanup(), 10 * 60 * 1000);

  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
    worker.stop();
  });
}
