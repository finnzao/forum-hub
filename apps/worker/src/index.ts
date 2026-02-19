// ============================================================
// apps/worker/src/index.ts
// Entry point — registra o Worker BullMQ
// ============================================================

import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PJE_QUEUE_NAME } from 'shared';
import { processDownloadJob } from './processors/pje-download.processor';
import { config } from './config';

async function main() {
  console.log('🚀 PJE Download Worker iniciando...');

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  });

  redis.on('connect', () => console.log('✅ Redis conectado'));
  redis.on('error', (err) => console.error('❌ Redis erro:', err.message));

  const worker = new Worker(
    PJE_QUEUE_NAME,
    async (job) => {
      console.log(`📥 Job recebido: ${job.id} | modo: ${job.data.mode}`);
      await processDownloadJob(job, redis);
      console.log(`✅ Job concluído: ${job.id}`);
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      concurrency: 3,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`🏁 Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err.message);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} recebido. Finalizando worker...`);
    await worker.close();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log(`✅ Worker escutando fila "${PJE_QUEUE_NAME}" com concurrency=3`);
}

main().catch((err) => {
  console.error('💥 Falha fatal ao iniciar worker:', err);
  process.exit(1);
});
