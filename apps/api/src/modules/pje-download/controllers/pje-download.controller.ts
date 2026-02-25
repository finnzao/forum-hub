// ============================================================
// apps/api/src/modules/pje-download/controllers/pje-download.controller.ts
// Controller — rotas HTTP do PJE Download
//
// Auth routes agora usam PJEAuthProxy para login REAL no PJE.
// ============================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { CreateDownloadJobDTO, Submit2FADTO } from 'shared';
import { PJEDownloadService, PJEDownloadError } from '../services/pje-download.service';
import { PJEAuthProxy } from '../services/pje-auth-proxy.service';

// ── Tipos ─────────────────────────────────────────────────────

interface AuthenticatedUser {
  id: number;
  name: string;
  role: string;
}

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

function ok<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  reply.status(statusCode).send(response);
}

// ── Rotas ─────────────────────────────────────────────────────

export function pjeDownloadRoutes(service: PJEDownloadService) {
  return async function (fastify: FastifyInstance) {

    // ── Middleware: autenticação ──────────────────────────────

    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.url.includes('/auth/')) return;

      try {
        const userHeader = request.headers['x-user'] as string;
        if (!userHeader) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Header x-user não encontrado.', statusCode: 401 },
          });
        }

        let user: AuthenticatedUser;
        try { user = JSON.parse(userHeader); } catch {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_AUTH', message: 'Header x-user contém JSON inválido.', statusCode: 401 },
          });
        }

        if (!user.id || !user.name || !user.role) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_AUTH', message: 'Header x-user incompleto.', statusCode: 401 },
          });
        }

        if (user.role !== 'magistrado') {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acesso restrito a magistrados.', statusCode: 403 },
          });
        }

        (request as any).user = user;
      } catch (err) {
        request.log.error({ err }, 'Erro no middleware de autenticação');
        return reply.status(500).send({
          success: false,
          error: { code: 'AUTH_ERROR', message: 'Erro interno na autenticação.', statusCode: 500 },
        });
      }
    });

    // ══════════════════════════════════════════════════════════
    // ROTAS DE AUTENTICAÇÃO PJE — CHAMADAS REAIS AO SSO
    // ══════════════════════════════════════════════════════════

    // POST /auth/login — Login real no PJE SSO
    fastify.post<{ Body: { cpf: string; password: string } }>(
      '/auth/login',
      async (request, reply) => {
        const { cpf, password } = request.body || {};

        if (!cpf || !password) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_CREDENTIALS', message: 'CPF e senha são obrigatórios.', statusCode: 400 },
          });
        }

        const cpfDigits = cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_CPF', message: 'CPF deve ter exatamente 11 dígitos.', statusCode: 400 },
          });
        }

        request.log.info(`[AUTH] Login PJE real: CPF ***${cpfDigits.slice(-4)}`);

        const proxy = new PJEAuthProxy();
        const result = await proxy.login(cpfDigits, password);

        if (result.error && !result.needs2FA && !result.user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_FAILED', message: result.error, statusCode: 401 },
          });
        }

        request.log.info(
          `[AUTH] Resultado: needs2FA=${result.needs2FA}, user=${result.user?.nomeUsuario || 'N/A'}, profiles=${result.profiles?.length || 0}`
        );

        ok(reply, {
          needs2FA: result.needs2FA,
          sessionId: result.sessionId,
          user: result.user,
          profiles: result.profiles,
        });
      }
    );

    // POST /auth/2fa — Enviar código 2FA real
    fastify.post<{ Body: { sessionId: string; code: string } }>(
      '/auth/2fa',
      async (request, reply) => {
        const { sessionId, code } = request.body || {};

        if (!code || !/^\d{6}$/.test(code)) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_CODE', message: 'Código 2FA deve ter 6 dígitos numéricos.', statusCode: 400 },
          });
        }

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_SESSION', message: 'sessionId é obrigatório para 2FA.', statusCode: 400 },
          });
        }

        request.log.info(`[AUTH] 2FA real: session=${sessionId.slice(0, 12)}...`);

        const proxy = new PJEAuthProxy();
        const result = await proxy.submit2FA(sessionId, code);

        if (result.error && !result.needs2FA && !result.user) {
          return reply.status(401).send({
            success: false,
            error: { code: '2FA_FAILED', message: result.error, statusCode: 401 },
          });
        }

        ok(reply, {
          needs2FA: result.needs2FA,
          sessionId: result.sessionId,
          user: result.user,
          profiles: result.profiles,
        });
      }
    );

    // POST /auth/profile — Selecionar perfil PJE real
    fastify.post<{ Body: { sessionId: string; profileIndex: number } }>(
      '/auth/profile',
      async (request, reply) => {
        const { sessionId, profileIndex } = request.body || {};

        if (profileIndex === undefined || profileIndex === null) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_PARAMS', message: 'profileIndex é obrigatório.', statusCode: 400 },
          });
        }

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_SESSION', message: 'sessionId é obrigatório.', statusCode: 400 },
          });
        }

        request.log.info(`[AUTH] Perfil real: session=${sessionId.slice(0, 12)}... index=${profileIndex}`);

        const proxy = new PJEAuthProxy();
        const result = await proxy.selectProfile(sessionId, profileIndex);

        if (result.error) {
          return reply.status(400).send({
            success: false,
            error: { code: 'PROFILE_ERROR', message: result.error, statusCode: 400 },
          });
        }

        request.log.info(
          `[AUTH] Perfil OK: ${result.tasks.length} tarefas, ${result.favoriteTasks.length} favoritas, ${result.tags.length} etiquetas`
        );

        ok(reply, {
          tasks: result.tasks,
          favoriteTasks: result.favoriteTasks,
          tags: result.tags,
        });
      }
    );

    // GET /auth/debug-profiles — Retorna HTML raw da página de perfis (para debug)
    fastify.get<{ Querystring: { sessionId: string } }>(
      '/auth/debug-profiles',
      async (request, reply) => {
        const sessionId = (request.query as any).sessionId;
        if (!sessionId) {
          return reply.status(400).send({ error: 'sessionId required' });
        }

        const proxy = new PJEAuthProxy();
        const html = await proxy.debugGetProfilesHtml(sessionId);
        reply.type('text/html').send(html);
      }
    );

    // ══════════════════════════════════════════════════════════
    // ROTAS DE JOBS (inalteradas)
    // ══════════════════════════════════════════════════════════

    fastify.post<{ Body: CreateDownloadJobDTO }>('/', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { ok(reply, await service.createJob(user.id, user.name, request.body), 201); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      const limit = parseInt(request.query.limit || '20', 10);
      const offset = parseInt(request.query.offset || '0', 10);
      try { ok(reply, await service.listJobs(user.id, limit, offset)); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { ok(reply, await service.getJob(request.params.jobId, user.id)); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId/progress', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        await service.getJob(request.params.jobId, user.id);
        const progress = await service.getProgress(request.params.jobId);
        ok(reply, progress ?? { status: 'pending', progress: 0, message: 'Aguardando processamento...' });
      } catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.post<{ Params: { jobId: string }; Body: Submit2FADTO }>('/:jobId/2fa', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { await service.submit2FA(request.params.jobId, user.id, request.body); ok(reply, { message: 'Código 2FA recebido.' }); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.delete<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { await service.cancelJob(request.params.jobId, user.id); ok(reply, { message: 'Job cancelado.' }); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId/files', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { ok(reply, await service.getFiles(request.params.jobId, user.id)); }
      catch (err) { handleServiceError(err, request, reply); }
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId/audit', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try { ok(reply, await service.getAudit(request.params.jobId, user.id)); }
      catch (err) { handleServiceError(err, request, reply); }
    });
  };
}

function handleServiceError(err: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (err instanceof PJEDownloadError) {
    const sc = err.statusCode || 400;
    if (sc >= 500) request.log.error({ err }, `[PJE] ${err.message}`);
    else request.log.warn(`[PJE] ${err.code}: ${err.message}`);
    return reply.status(sc).send({
      success: false,
      error: { code: err.code, message: err.message, statusCode: sc, timestamp: new Date().toISOString() },
    });
  }
  request.log.error({ err }, '[PJE] Erro inesperado');
  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.', statusCode: 500, timestamp: new Date().toISOString() },
  });
}
