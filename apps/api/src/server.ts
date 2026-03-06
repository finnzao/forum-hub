import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerPJEDownloadModule } from './modules/pje-download';
import { errorHandler } from './middleware/error-handler';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
  });

  // ── CORS — aberto para desenvolvimento ───────────────────
  await fastify.register(cors, {
    origin: true, // aceita qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user', 'X-User'],
    credentials: true,
  });

  // ── Error handler global ─────────────────────────────────
  fastify.setErrorHandler(errorHandler);

  // ── Health check ─────────────────────────────────────────
  fastify.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: 'memory',
  }));

  // ── Módulo PJE Download (sem Redis, sem PostgreSQL) ──────
  await registerPJEDownloadModule(fastify);

  // ── Start ────────────────────────────────────────────────
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info(`🚀 API rodando na porta ${PORT} (storage: memory, redis: desabilitado)`);
}

main().catch((err) => {
  console.error('💥 Erro fatal ao iniciar API:', err);
  process.exit(1);
});
