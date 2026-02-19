// ============================================================
// apps/worker/src/processors/pje-download.processor.ts
// Processor — orquestra o fluxo completo de download PJE
// ============================================================

import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { join } from 'node:path';
import {
  type PJEDownloadJobPayload,
  type PJEDownloadProgress,
  type PJEDownloadedFile,
  type PJEDownloadError,
  type PJEJobStatus,
  PJE_REDIS_KEYS,
  PJE_DOWNLOAD_BATCH_SIZE,
  PJE_MAX_RETRIES,
} from 'shared';
import { PJEClient, type PJEProcess, type DownloadResult } from '../services/pje-client';
import { config } from '../config';

export async function processDownloadJob(
  job: Job<PJEDownloadJobPayload>,
  redis: Redis
): Promise<void> {
  const { data } = job;
  const client = new PJEClient(redis);

  const state: ProgressState = {
    jobId: data.jobId,
    status: 'authenticating',
    progress: 0,
    totalProcesses: 0,
    successCount: 0,
    failureCount: 0,
    files: [],
    errors: [],
    message: 'Iniciando autenticação...',
  };

  const publish = async () => publishProgress(redis, state);

  try {
    // ── FASE 1: Autenticação ─────────────────────────────

    await publish();

    if (await client.isCancelled(data.jobId)) {
      state.status = 'cancelled';
      state.message = 'Job cancelado pelo usuário.';
      await publish();
      return;
    }

    const loginResult = await client.authenticate(
      data.userId,
      data.credentials!.cpf,
      data.credentials!.password
    );

    // Descartar credenciais da memória
    data.credentials = undefined;

    if (loginResult.needs2FA) {
      state.status = 'awaiting_2fa';
      state.message = 'Código 2FA necessário. Verifique seu email.';
      await publish();

      await redis.set(
        PJE_REDIS_KEYS.twoFaRequest(data.jobId),
        '1',
        'EX',
        300
      );

      const twoFaResult = await client.waitFor2FA(data.jobId);
      if (!twoFaResult.success) {
        state.status = 'failed';
        state.message = twoFaResult.error || 'Falha na autenticação 2FA.';
        state.errors.push({
          message: state.message,
          code: '2FA_FAILED',
          timestamp: new Date().toISOString(),
        });
        await publish();
        return;
      }

      if (twoFaResult.session) {
        await client.cacheSession(data.userId, twoFaResult.session);
      }
    } else if (!loginResult.success) {
      state.status = 'failed';
      state.message = loginResult.error || 'Falha na autenticação.';
      state.errors.push({
        message: state.message,
        code: 'AUTH_FAILED',
        timestamp: new Date().toISOString(),
      });
      await publish();
      return;
    }

    state.status = 'processing';
    state.message = 'Autenticado. Coletando processos...';
    await publish();

    // ── FASE 2: Coletar processos ────────────────────────

    if (await client.isCancelled(data.jobId)) {
      state.status = 'cancelled';
      await publish();
      return;
    }

    const processes = await collectProcesses(client, data, state, publish);

    if (processes.length === 0) {
      state.status = 'completed';
      state.message = 'Nenhum processo encontrado para download.';
      state.progress = 100;
      await publish();
      return;
    }

    state.totalProcesses = processes.length;
    state.message = `${processes.length} processo(s) encontrado(s). Iniciando downloads...`;
    await publish();

    // ── FASE 3: Download em lotes ────────────────────────

    state.status = 'downloading';

    const outputDir = join(
      config.storage.basePath,
      String(data.userId),
      data.downloadDir || data.jobId
    );

    for (let i = 0; i < processes.length; i++) {
      if (await client.isCancelled(data.jobId)) {
        state.status = 'cancelled';
        state.message = 'Job cancelado pelo usuário.';
        await publish();
        return;
      }

      const proc = processes[i];
      state.progress = Math.round(((i + 1) / processes.length) * 80);
      state.message = `Baixando ${i + 1}/${processes.length}: ${proc.numeroProcesso}`;
      await publish();

      const result = await client.downloadProcess(
        {
          idProcesso: proc.idProcesso,
          numeroProcesso: proc.numeroProcesso,
          idTaskInstance: proc.idTaskInstance,
          documentType: data.documentType,
        },
        outputDir
      );

      if (result.success && result.fileName) {
        state.successCount++;
        state.files.push({
          processNumber: proc.numeroProcesso,
          fileName: result.fileName!,
          filePath: result.filePath!,
          fileSize: result.fileSize!,
          downloadedAt: new Date().toISOString(),
        });
      } else {
        state.failureCount++;
        state.errors.push({
          processNumber: proc.numeroProcesso,
          message: result.error || 'Erro desconhecido no download.',
          timestamp: new Date().toISOString(),
        });
      }

      await sleep(config.pje.requestDelay);
    }

    // ── FASE 4: Verificação de integridade ───────────────

    state.status = 'checking_integrity';
    state.progress = 85;
    state.message = 'Verificando integridade dos downloads...';
    await publish();

    const missingProcesses = processes.filter((proc) => {
      const digits = proc.numeroProcesso.replace(/\D/g, '');
      return !state.files.some((f) => f.processNumber.replace(/\D/g, '') === digits);
    });

    // ── FASE 5: Retries ──────────────────────────────────

    if (missingProcesses.length > 0) {
      state.status = 'retrying';

      for (let retry = 1; retry <= PJE_MAX_RETRIES; retry++) {
        if (missingProcesses.length === 0) break;
        if (await client.isCancelled(data.jobId)) break;

        state.message = `Retry ${retry}/${PJE_MAX_RETRIES}: ${missingProcesses.length} processo(s) faltando...`;
        state.progress = 85 + (retry / PJE_MAX_RETRIES) * 10;
        await publish();

        for (let i = missingProcesses.length - 1; i >= 0; i--) {
          const proc = missingProcesses[i];

          const result = await client.downloadProcess(
            {
              idProcesso: proc.idProcesso,
              numeroProcesso: proc.numeroProcesso,
              documentType: data.documentType,
            },
            outputDir
          );

          if (result.success && result.fileName) {
            state.successCount++;
            state.failureCount = Math.max(0, state.failureCount - 1);
            state.files.push({
              processNumber: proc.numeroProcesso,
              fileName: result.fileName!,
              filePath: result.filePath!,
              fileSize: result.fileSize!,
              downloadedAt: new Date().toISOString(),
            });

            state.errors = state.errors.filter(
              (e) => e.processNumber !== proc.numeroProcesso
            );

            missingProcesses.splice(i, 1);
          }

          await sleep(config.pje.requestDelay);
        }
      }
    }

    // ── FASE 6: Resultado final ──────────────────────────

    state.progress = 100;

    if (state.failureCount === 0) {
      state.status = 'completed';
      state.message = `Download concluído: ${state.successCount} processo(s) baixado(s) com sucesso.`;
    } else if (state.successCount > 0) {
      state.status = 'partial';
      state.message = `Download parcial: ${state.successCount} sucesso(s), ${state.failureCount} falha(s).`;
    } else {
      state.status = 'failed';
      state.message = `Download falhou: ${state.failureCount} erro(s).`;
    }

    await publish();
  } catch (err) {
    state.status = 'failed';
    state.message = err instanceof Error ? err.message : 'Erro inesperado no processamento.';
    state.errors.push({
      message: state.message,
      code: 'UNEXPECTED_ERROR',
      timestamp: new Date().toISOString(),
    });
    await publishProgress(redis, state);
    throw err;
  }
}

// ── Coletar processos conforme o modo ──────────────────────

async function collectProcesses(
  client: PJEClient,
  data: PJEDownloadJobPayload,
  state: ProgressState,
  publish: () => Promise<void>
): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];

  switch (data.mode) {
    case 'by_number': {
      const numbers = data.processNumbers || [];
      state.totalProcesses = numbers.length;
      state.message = `Buscando ${numbers.length} processo(s) por número...`;
      await publish();

      for (const num of numbers) {
        const result = await client.findProcessByNumber(num);
        if (result) {
          processes.push({
            idProcesso: result.idProcesso,
            numeroProcesso: result.numeroProcesso,
          });
        } else {
          state.errors.push({
            processNumber: num,
            message: `Processo não encontrado: ${num}`,
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
          });
          state.failureCount++;
        }
        await sleep(config.pje.requestDelay);
      }
      break;
    }

    case 'by_task': {
      const taskName = data.taskName!;
      const isFavorite = data.isFavorite ?? false;
      state.message = `Coletando processos da tarefa "${taskName}"...`;
      await publish();

      for await (const batch of client.getAllTaskProcesses(taskName, isFavorite)) {
        for (const proc of batch) {
          processes.push({
            idProcesso: proc.idProcesso,
            numeroProcesso: proc.numeroProcesso,
            idTaskInstance: (proc as any).idTaskInstance,
          });
        }
        state.totalProcesses = processes.length;
        state.message = `Coletados ${processes.length} processos...`;
        await publish();
      }
      break;
    }

    case 'by_tag': {
      let tagId = data.tagId;

      if (!tagId && data.tagName) {
        const tag = await client.findTagByName(data.tagName);
        if (!tag) {
          state.errors.push({
            message: `Etiqueta não encontrada: "${data.tagName}"`,
            code: 'TAG_NOT_FOUND',
            timestamp: new Date().toISOString(),
          });
          return [];
        }
        tagId = tag.id;
      }

      if (!tagId) return [];

      state.message = `Coletando processos da etiqueta...`;
      await publish();

      for await (const batch of client.getAllTagProcesses(tagId)) {
        for (const proc of batch) {
          processes.push({
            idProcesso: proc.idProcesso,
            numeroProcesso: proc.numeroProcesso,
          });
        }
        state.totalProcesses = processes.length;
        state.message = `Coletados ${processes.length} processos...`;
        await publish();
      }
      break;
    }
  }

  return processes;
}

// ── Publicar progresso via Redis ───────────────────────────

async function publishProgress(redis: Redis, state: ProgressState): Promise<void> {
  const progress: PJEDownloadProgress = {
    ...state,
    timestamp: Date.now(),
  };

  const key = PJE_REDIS_KEYS.progress(state.jobId);
  const channel = `pje:progress:${state.jobId}`;

  await redis.set(key, JSON.stringify(progress), 'EX', 86400);
  await redis.publish(channel, JSON.stringify(progress));
}

// ── Tipos internos ─────────────────────────────────────────

interface ProgressState {
  jobId: string;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  message: string;
}

interface ProcessInfo {
  idProcesso: number;
  numeroProcesso: string;
  idTaskInstance?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
