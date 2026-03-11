import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionStore } from '../services/pje-auth';
import { UrlExtractor, type PendingProcess } from '../services/download/url-extractor';
import { registerProxyUrl } from './proxy.controller';
import {
  serializeCookies, serializeAllCookies, buildPjeHeaders,
  PJE_REST_BASE, PJE_FRONTEND_ORIGIN, PJE_LEGACY_APP,
} from '../../../shared/pje-api-client';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const activeStreams = new Map<string, { count: number; startedAt: number }>();
const MAX_STREAMS_PER_USER = 1;
const MAX_STREAMS_GLOBAL = 5;

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

    if (!sessionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_SESSION', message: 'sessionId é obrigatório.', statusCode: 400 },
      });
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      console.error(`[STREAM] Sessão não encontrada no store: ${sessionId.slice(0, 20)}...`);
      return reply.status(401).send({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Sessão PJE expirada. Faça login novamente.', statusCode: 401 },
      });
    }

    console.log(`[STREAM] Validando sessão PJE...`);
    const sessionValid = await validatePjeSession(session);
    if (!sessionValid) {
      console.error(`[STREAM] Sessão PJE inválida (currentUser falhou)`);
      sessionStore.delete(sessionId);
      return reply.status(401).send({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Sessão PJE expirada no servidor do PJE. Faça login novamente.', statusCode: 401 },
      });
    }
    console.log(`[STREAM] Sessão PJE válida`);

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

    console.log(`[STREAM] Iniciando stream-batch | mode=${mode} | taskName=${taskName || '-'} | tagId=${tagId || '-'}`);

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
      const entry = activeStreams.get(userId);
      if (entry) {
        entry.count--;
        if (entry.count <= 0) activeStreams.delete(userId);
      }
    });

    try {
      const extractor = new UrlExtractor(session);

      send('auth', { status: 'ok', user: session.idUsuarioLocalizacao });

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

      send('listing', { total: processos.length });

      if (processos.length === 0 || cancelled) {
        send('done', { total: processos.length, success: 0, failed: 0, queued: 0, elapsed: 0 });
        reply.raw.end();
        return;
      }

      const startTime = Date.now();
      let success = 0;
      let failed = 0;
      const pendingQueue: PendingProcess[] = [];

      for (let i = 0; i < processos.length; i++) {
        if (cancelled) break;

        const proc = processos[i];
        console.log(`[STREAM] [${i + 1}/${processos.length}] Extraindo URL: ${proc.numeroProcesso}`);

        send('progress', {
          index: i + 1,
          total: processos.length,
          processNumber: proc.numeroProcesso,
          status: 'requesting',
        });

        try {
          const result = await extractor.extractDownloadUrl(proc);
          console.log(`[STREAM] [${i + 1}/${processos.length}] ${proc.numeroProcesso} → ${result.type}${result.url ? ' (URL OK)' : ''}${result.error ? ` (${result.error})` : ''}`);

          if (result.type === 'direct' && result.url) {
            const proxyToken = registerProxyUrl(result.url);
            send('url', {
              processNumber: proc.numeroProcesso,
              downloadUrl: result.url,
              proxyUrl: `/api/pje/downloads/proxy/${proxyToken}`,
              fileName: `${proc.numeroProcesso}.pdf`,
              fileSize: result.fileSize,
              method: 'direct',
            });
            success++;
          } else if (result.type === 'queued') {
            send('queued', {
              processNumber: proc.numeroProcesso,
              message: 'Aguardando PJE gerar PDF...',
              estimatedWait: 30,
            });
            pendingQueue.push({ proc, requestedAt: Date.now() });
          } else {
            send('error', {
              processNumber: proc.numeroProcesso,
              message: result.error || 'Erro desconhecido',
              code: 'EXTRACT_FAILED',
            });
            failed++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro';
          console.error(`[STREAM] [${i + 1}/${processos.length}] ${proc.numeroProcesso} EXCEPTION: ${msg}`);
          send('error', {
            processNumber: proc.numeroProcesso,
            message: msg,
            code: 'UNEXPECTED',
          });
          failed++;
        }

        if (i < processos.length - 1) await sleep(1500);

        if (pendingQueue.length >= 10 || i === processos.length - 1) {
          if (pendingQueue.length > 0 && !cancelled) {
            console.log(`[STREAM] Coletando ${pendingQueue.length} downloads pendentes...`);
            const collected = await extractor.collectPendingUrls(pendingQueue, () => cancelled);

            for (const item of collected) {
              if (item.url) {
                const proxyToken = registerProxyUrl(item.url);
                send('url', {
                  processNumber: item.processNumber,
                  downloadUrl: item.url,
                  proxyUrl: `/api/pje/downloads/proxy/${proxyToken}`,
                  fileName: `${item.processNumber}.pdf`,
                  method: 'polled',
                });
                success++;
              } else {
                send('error', {
                  processNumber: item.processNumber,
                  message: item.error || 'Timeout',
                  code: 'POLL_TIMEOUT',
                });
                failed++;
              }
            }
            pendingQueue.length = 0;
          }
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[STREAM] Concluído: ${success} ok, ${failed} falhas (${Math.round(elapsed / 1000)}s)`);

      send('done', {
        total: processos.length,
        success,
        failed,
        queued: pendingQueue.length,
        elapsed,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro fatal no servidor';
      console.error(`[STREAM] FATAL: ${msg}`, err);
      send('fatal', { message: msg });
    } finally {
      try { reply.raw.end(); } catch { /* already closed */ }
      const entry = activeStreams.get(userId);
      if (entry) {
        entry.count--;
        if (entry.count <= 0) activeStreams.delete(userId);
      }
    }
  });
}
