import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionStore } from '../services/pje-auth';
import { UrlExtractor, type PendingProcess } from '../services/download/url-extractor';
import { registerProxyUrl } from './proxy.controller';
import {
  serializeCookies, serializeAllCookies, buildPjeHeaders,
  PJE_REST_BASE, PJE_FRONTEND_ORIGIN, PJE_LEGACY_APP,
} from '../../../shared/pje-api-client';
import { ParallelPool } from '../../../shared/parallel-pool';

// ── Configuração ────────────────────────────────────────────

/** Slots paralelos de download (requisições simultâneas ao PJE por stream) */
const PARALLEL_SLOTS = 3;

/** Delay mínimo entre a EMISSÃO de requisições ao PJE (evita rate-limit) */
const REQUEST_STAGGER_MS = 500;

/** Controle de streams ativas por usuário e global */
const MAX_STREAMS_PER_USER = 1;
const MAX_STREAMS_GLOBAL = 5;

const activeStreams = new Map<string, { count: number; startedAt: number }>();

// ── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function validatePjeSession(session: any): Promise<boolean> {
  try {
    const cookieStr = serializeCookies(session.cookies, 'pje.tjba.jus.br');
    const allCookieStr = serializeAllCookies(session.cookies);
    const res = await fetch(`${PJE_REST_BASE}/usuario/currentUser`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-pje-legacy-app': PJE_LEGACY_APP,
        'Origin': PJE_FRONTEND_ORIGIN,
        'Referer': `${PJE_FRONTEND_ORIGIN}/`,
        'X-pje-cookies': allCookieStr,
        'X-pje-usuario-localizacao': session.idUsuarioLocalizacao,
        'Cookie': cookieStr,
      },
    });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return false;
    const user = await res.json() as any;
    return !!(user?.idUsuario && user.idUsuario !== 0);
  } catch {
    return false;
  }
}

function releaseStream(userId: string): void {
  const entry = activeStreams.get(userId);
  if (entry) {
    entry.count--;
    if (entry.count <= 0) activeStreams.delete(userId);
  }
}

// ── Tipos internos ──────────────────────────────────────────

interface StreamContext {
  extractor: UrlExtractor;
  send: (event: string, data: unknown) => void;
  cancelled: () => boolean;
}

interface BatchResult {
  processNumber: string;
  type: 'success' | 'queued' | 'error';
  url?: string;
  proxyUrl?: string;
  fileSize?: number;
  error?: string;
}

// ── Processamento paralelo de um processo ────────────────────

async function processOneProcess(
  ctx: StreamContext,
  proc: { idProcesso: number; numeroProcesso: string; idTaskInstance?: number },
  index: number,
  total: number,
): Promise<BatchResult> {
  const { extractor, send, cancelled } = ctx;

  if (cancelled()) {
    return { processNumber: proc.numeroProcesso, type: 'error', error: 'Cancelado' };
  }

  send('progress', {
    index: index + 1,
    total,
    processNumber: proc.numeroProcesso,
    status: 'requesting',
  });

  try {
    const result = await extractor.extractDownloadUrl(proc);

    console.log(
      `[STREAM] [${index + 1}/${total}] ${proc.numeroProcesso} → ${result.type}`
      + `${result.url ? ' (URL OK)' : ''}${result.error ? ` (${result.error})` : ''}`,
    );

    if (result.type === 'direct' && result.url) {
      const proxyToken = registerProxyUrl(result.url);
      const proxyUrl = `/api/pje/downloads/proxy/${proxyToken}`;

      send('url', {
        processNumber: proc.numeroProcesso,
        downloadUrl: result.url,
        proxyUrl,
        fileName: `${proc.numeroProcesso}.pdf`,
        fileSize: result.fileSize,
        method: 'direct',
      });

      return {
        processNumber: proc.numeroProcesso,
        type: 'success',
        url: result.url,
        proxyUrl,
        fileSize: result.fileSize,
      };
    }

    if (result.type === 'queued') {
      send('queued', {
        processNumber: proc.numeroProcesso,
        message: 'Aguardando PJE gerar PDF...',
        estimatedWait: 30,
      });

      return { processNumber: proc.numeroProcesso, type: 'queued' };
    }

    // error
    send('error', {
      processNumber: proc.numeroProcesso,
      message: result.error || 'Erro desconhecido',
      code: 'EXTRACT_FAILED',
    });

    return {
      processNumber: proc.numeroProcesso,
      type: 'error',
      error: result.error || 'Erro desconhecido',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro';
    console.error(`[STREAM] [${index + 1}/${total}] ${proc.numeroProcesso} EXCEPTION: ${msg}`);

    send('error', {
      processNumber: proc.numeroProcesso,
      message: msg,
      code: 'UNEXPECTED',
    });

    return { processNumber: proc.numeroProcesso, type: 'error', error: msg };
  }
}

// ── Coleta de pendentes ─────────────────────────────────────

async function collectPending(
  ctx: StreamContext,
  pendingQueue: PendingProcess[],
): Promise<{ success: number; failed: number }> {
  if (pendingQueue.length === 0 || ctx.cancelled()) {
    return { success: 0, failed: 0 };
  }

  console.log(`[STREAM] Coletando ${pendingQueue.length} downloads pendentes...`);
  let success = 0;
  let failed = 0;

  const collected = await ctx.extractor.collectPendingUrls(
    pendingQueue,
    ctx.cancelled,
  );

  for (const item of collected) {
    if (item.url) {
      const proxyToken = registerProxyUrl(item.url);
      ctx.send('url', {
        processNumber: item.processNumber,
        downloadUrl: item.url,
        proxyUrl: `/api/pje/downloads/proxy/${proxyToken}`,
        fileName: `${item.processNumber}.pdf`,
        method: 'polled',
      });
      success++;
    } else {
      ctx.send('error', {
        processNumber: item.processNumber,
        message: item.error || 'Timeout',
        code: 'POLL_TIMEOUT',
      });
      failed++;
    }
  }

  return { success, failed };
}

// ── Route handler ───────────────────────────────────────────

export async function streamRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: {
      sessionId: string;
      mode: string;
      taskName?: string;
      tagId?: string;
      isFavorite?: string;
      processNumbers?: string;
    };
  }>('/stream-batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const { sessionId, mode, taskName, tagId, isFavorite, processNumbers } = query;

    // ── Validação de sessão ───────────────────────────────

    if (!sessionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_SESSION', message: 'sessionId é obrigatório.', statusCode: 400 },
      });
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      console.error(`[STREAM] Sessão não encontrada: ${sessionId.slice(0, 20)}...`);
      return reply.status(401).send({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Sessão PJE expirada. Faça login novamente.', statusCode: 401 },
      });
    }

    console.log(`[STREAM] Validando sessão PJE...`);
    const sessionValid = await validatePjeSession(session);
    if (!sessionValid) {
      console.error(`[STREAM] Sessão PJE inválida`);
      sessionStore.delete(sessionId);
      return reply.status(401).send({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Sessão PJE expirada no servidor do PJE. Faça login novamente.', statusCode: 401 },
      });
    }
    console.log(`[STREAM] Sessão PJE válida`);

    // ── Controle de concorrência global/usuário ────────────

    const userId = session.cpf || sessionId.slice(0, 16);

    let totalActive = 0;
    for (const entry of activeStreams.values()) totalActive += entry.count;
    if (totalActive >= MAX_STREAMS_GLOBAL) {
      return reply.status(429).send({
        success: false,
        error: { code: 'SERVER_BUSY', message: `Servidor ocupado (${totalActive} downloads ativos).`, statusCode: 429 },
      });
    }

    const userEntry = activeStreams.get(userId);
    if (userEntry && userEntry.count >= MAX_STREAMS_PER_USER) {
      return reply.status(429).send({
        success: false,
        error: { code: 'USER_LIMIT', message: 'Você já tem um download em andamento.', statusCode: 429 },
      });
    }

    activeStreams.set(userId, {
      count: (userEntry?.count || 0) + 1,
      startedAt: Date.now(),
    });

    console.log(`[STREAM] Iniciando stream-batch | mode=${mode} | taskName=${taskName || '-'} | tagId=${tagId || '-'} | parallel=${PARALLEL_SLOTS}`);

    // ── SSE headers ───────────────────────────────────────

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    const send = (event: string, data: unknown) => {
      try {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch { /* connection closed */ }
    };

    let cancelled = false;
    request.raw.on('close', () => {
      cancelled = true;
      console.log(`[STREAM] Cliente desconectou`);
      releaseStream(userId);
    });

    try {
      const extractor = new UrlExtractor(session);

      send('auth', { status: 'ok', user: session.idUsuarioLocalizacao });

      // ── Listar processos ────────────────────────────────

      const processNumbersArray = processNumbers
        ? processNumbers.split(',').map((n: string) => n.trim()).filter(Boolean)
        : undefined;

      console.log(`[STREAM] Listando processos... mode=${mode} taskName="${taskName}" isFavorite=${isFavorite}`);

      const processos = await extractor.listProcesses(mode, {
        taskName,
        tagId: tagId ? parseInt(tagId, 10) : undefined,
        isFavorite: isFavorite === 'true',
        processNumbers: processNumbersArray,
        onCancelled: () => cancelled,
      });

      console.log(`[STREAM] Processos encontrados: ${processos.length}`);
      send('listing', { total: processos.length, parallelSlots: PARALLEL_SLOTS });

      if (processos.length === 0 || cancelled) {
        send('done', { total: processos.length, success: 0, failed: 0, queued: 0, elapsed: 0 });
        reply.raw.end();
        return;
      }

      // ── Pipeline paralelo ───────────────────────────────

      const startTime = Date.now();
      let success = 0;
      let failed = 0;
      const pendingQueue: PendingProcess[] = [];

      const ctx: StreamContext = {
        extractor,
        send,
        cancelled: () => cancelled,
      };

      const pool = new ParallelPool(PARALLEL_SLOTS);

      /**
       * Threshold para coletar pendentes em batch.
       * Quando acumula PENDING_BATCH_THRESHOLD pendentes,
       * faz coleta sem esperar o fim de todos os processos.
       */
      const PENDING_BATCH_THRESHOLD = 10;

      for (let i = 0; i < processos.length; i++) {
        if (cancelled) break;

        const proc = processos[i];
        const idx = i;

        // Stagger: pequeno delay entre o ENVIO de cada tarefa ao pool
        // (não entre o término — as tarefas rodam em paralelo)
        if (i > 0) {
          await sleep(REQUEST_STAGGER_MS);
        }

        await pool.add(async () => {
          const result = await processOneProcess(ctx, proc, idx, processos.length);

          if (result.type === 'success') {
            success++;
          } else if (result.type === 'queued') {
            pendingQueue.push({ proc, requestedAt: Date.now() });
          } else {
            failed++;
          }
        });

        // Coleta intermediária de pendentes quando acumula demais
        if (pendingQueue.length >= PENDING_BATCH_THRESHOLD) {
          const batch = pendingQueue.splice(0, pendingQueue.length);
          // Roda coleta em paralelo sem bloquear o pipeline principal
          pool.add(async () => {
            const r = await collectPending(ctx, batch);
            success += r.success;
            failed += r.failed;
          });
        }
      }

      // Aguarda todas as tarefas do pool terminarem
      await pool.drain();

      // Coleta final de qualquer pendente restante
      if (pendingQueue.length > 0 && !cancelled) {
        const finalBatch = pendingQueue.splice(0, pendingQueue.length);
        const r = await collectPending(ctx, finalBatch);
        success += r.success;
        failed += r.failed;
      }

      const elapsed = Date.now() - startTime;
      console.log(`[STREAM] Concluído: ${success} ok, ${failed} falhas (${Math.round(elapsed / 1000)}s) [${PARALLEL_SLOTS} slots paralelos]`);

      send('done', {
        total: processos.length,
        success,
        failed,
        queued: 0,
        elapsed,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro fatal no servidor';
      console.error(`[STREAM] FATAL: ${msg}`, err);
      send('fatal', { message: msg });
    } finally {
      try { reply.raw.end(); } catch { /* already closed */ }
      releaseStream(userId);
    }
  });
}
