// ============================================================
// apps/api/src/modules/pje-download/index.ts
// Module — registra rotas e inicializa dependências
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { PJEDownloadRepository } from './repositories/pje-download.repository';
import { PJEDownloadService } from './services/pje-download.service';
import { pjeDownloadRoutes } from './controllers/pje-download.controller';

interface PJEDownloadModuleOptions {
  pool: Pool;
  redis: Redis;
  redisConnection: { host: string; port: number; password?: string };
}

export async function registerPJEDownloadModule(
  fastify: FastifyInstance,
  options: PJEDownloadModuleOptions
) {
  const repository = new PJEDownloadRepository(options.pool);
  const service = new PJEDownloadService(
    repository,
    options.redis,
    options.redisConnection
  );

  await fastify.register(pjeDownloadRoutes(service), {
    prefix: '/api/pje/downloads',
  });

  fastify.log.info('Módulo PJE Download registrado em /api/pje/downloads');
}
