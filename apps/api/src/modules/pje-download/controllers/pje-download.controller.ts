// ============================================================
// apps/api/src/modules/pje-download/controllers/pje-download.controller.ts
// Controller — rotas HTTP do PJE Download
// Formato de resposta padronizado + rotas de auth mock
// ============================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { CreateDownloadJobDTO, Submit2FADTO } from 'shared';
import { PJEDownloadService, PJEDownloadError } from '../services/pje-download.service';

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

// ── Helper de resposta padronizada ────────────────────────────

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
      // Rotas de auth não precisam de autenticação prévia
      if (request.url.includes('/auth/')) return;

      try {
        const userHeader = request.headers['x-user'] as string;
        if (!userHeader) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Header x-user não encontrado. Faça login primeiro.',
              statusCode: 401,
            },
          });
        }

        let user: AuthenticatedUser;
        try {
          user = JSON.parse(userHeader);
        } catch {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_AUTH',
              message: 'Header x-user contém JSON inválido.',
              statusCode: 401,
            },
          });
        }

        if (!user.id || !user.name || !user.role) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_AUTH',
              message: 'Header x-user incompleto. Campos obrigatórios: id, name, role.',
              statusCode: 401,
            },
          });
        }

        if (user.role !== 'magistrado') {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Acesso restrito a magistrados.',
              statusCode: 403,
            },
          });
        }

        (request as any).user = user;
      } catch (err) {
        request.log.error({ err }, 'Erro no middleware de autenticação');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Erro interno na autenticação.',
            statusCode: 500,
          },
        });
      }
    });

    // ══════════════════════════════════════════════════════════
    // ROTAS DE AUTENTICAÇÃO PJE (mock por enquanto)
    // Quando o worker estiver ativo, estas rotas farão proxy
    // para o PJE real via worker/pje-client
    // ══════════════════════════════════════════════════════════

    // POST /auth/login — Login no PJE
    fastify.post<{ Body: { cpf: string; password: string } }>(
      '/auth/login',
      async (request, reply) => {
        const { cpf, password } = request.body || {};

        if (!cpf || !password) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'MISSING_CREDENTIALS',
              message: 'CPF e senha são obrigatórios.',
              statusCode: 400,
            },
          });
        }

        const cpfDigits = cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_CPF',
              message: 'CPF deve ter exatamente 11 dígitos.',
              statusCode: 400,
            },
          });
        }

        request.log.info(`[AUTH] Login attempt: CPF ***${cpfDigits.slice(-4)}`);

        // TODO: Substituir por chamada real ao PJE SSO via worker
        // Por enquanto, simula login bem-sucedido para testar o fluxo
        //
        // IMPORTANTE: NÃO colocar "success" dentro de data.
        // O wrapper ok() já adiciona { success: true, data: ... }
        // O frontend unwrapResponse() extrai data automaticamente.
        ok(reply, {
          needs2FA: false,
          user: {
            idUsuario: 319167,
            nomeUsuario: 'FULANO DE TAL',
            login: cpfDigits,
            perfil: 'Assessoria',
            nomePerfil: 'Assessoria',
            idUsuarioLocalizacaoMagistradoServidor: 14552753,
          },
          profiles: [
            {
              indice: 0,
              nome: 'Assessoria',
              orgao: 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE RIO REAL',
              favorito: true,
            },
            {
              indice: 1,
              nome: 'Juiz Titular',
              orgao: 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE RIO REAL',
              favorito: false,
            },
          ],
        });
      }
    );

    // POST /auth/2fa — Enviar código 2FA
    fastify.post<{ Body: { sessionId: string; code: string } }>(
      '/auth/2fa',
      async (request, reply) => {
        const { code } = request.body || {};

        if (!code || !/^\d{6}$/.test(code)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_CODE',
              message: 'Código 2FA deve ter 6 dígitos numéricos.',
              statusCode: 400,
            },
          });
        }

        request.log.info(`[AUTH] 2FA attempt: code ***${code.slice(-2)}`);

        // TODO: Substituir por chamada real ao PJE SSO
        ok(reply, {
          needs2FA: false,
          user: {
            idUsuario: 319167,
            nomeUsuario: 'FULANO DE TAL',
            login: '00000000000',
            perfil: 'Assessoria',
            nomePerfil: 'Assessoria',
            idUsuarioLocalizacaoMagistradoServidor: 14552753,
          },
          profiles: [
            {
              indice: 0,
              nome: 'Assessoria',
              orgao: 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE RIO REAL',
              favorito: true,
            },
            {
              indice: 1,
              nome: 'Juiz Titular',
              orgao: 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE RIO REAL',
              favorito: false,
            },
          ],
        });
      }
    );

    // POST /auth/profile — Selecionar perfil PJE
    fastify.post<{ Body: { profileIndex: number } }>(
      '/auth/profile',
      async (request, reply) => {
        const { profileIndex } = request.body || {};

        if (profileIndex === undefined || profileIndex === null) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'MISSING_PARAMS',
              message: 'profileIndex é obrigatório.',
              statusCode: 400,
            },
          });
        }

        request.log.info(`[AUTH] Profile select: index=${profileIndex}`);

        // TODO: Substituir por chamada real ao PJE REST
        // Os campos aqui devem corresponder aos tipos do frontend:
        //   TarefaPJE: { id, nome, quantidadePendente }
        //   EtiquetaPJE: { id, nomeTag, nomeTagCompleto, favorita }
        ok(reply, {
          tasks: [
            { id: 7072316667, nome: 'Aguardar decurso de prazo', quantidadePendente: 339 },
            { id: 9868923599, nome: 'Documentos não lidos - ANALISAR', quantidadePendente: 3 },
            { id: 5937430130, nome: 'Conclusos para despacho', quantidadePendente: 45 },
            { id: 5937430131, nome: 'Conclusos para decisão', quantidadePendente: 23 },
            { id: 5937430132, nome: 'Conclusos para sentença', quantidadePendente: 12 },
          ],
          favoriteTasks: [
            { id: 5937430130, nome: 'Conclusos para despacho', quantidadePendente: 45 },
            { id: 7072316667, nome: 'Aguardar decurso de prazo', quantidadePendente: 339 },
          ],
          tags: [
            { id: 796950, nomeTag: 'AGUARDANDO TRANSITO EM JULGADO - SEM CUSTAS', nomeTagCompleto: 'AGUARDANDO TRANSITO EM JULGADO - SEM CUSTAS', favorita: false },
            { id: 796951, nomeTag: 'AGUARDANDO TRANSITO EM JULGADO - COM CUSTAS', nomeTagCompleto: 'AGUARDANDO TRANSITO EM JULGADO - COM CUSTAS', favorita: false },
            { id: 796952, nomeTag: 'COBRAR CUSTAS', nomeTagCompleto: 'COBRAR CUSTAS', favorita: true },
            { id: 796953, nomeTag: 'URGENTE', nomeTagCompleto: 'URGENTE', favorita: true },
          ],
        });
      }
    );

    // ══════════════════════════════════════════════════════════
    // ROTAS DE JOBS
    // ══════════════════════════════════════════════════════════

    // POST / — Criar job de download
    fastify.post<{ Body: CreateDownloadJobDTO }>(
      '/',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          const job = await service.createJob(user.id, user.name, request.body);
          ok(reply, job, 201);
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // GET / — Listar jobs do usuário
    fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
      '/',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        const limit = parseInt(request.query.limit || '20', 10);
        const offset = parseInt(request.query.offset || '0', 10);

        if (isNaN(limit) || isNaN(offset)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_PARAM',
              message: 'limit e offset devem ser números.',
              statusCode: 400,
            },
          });
        }

        try {
          const result = await service.listJobs(user.id, limit, offset);
          ok(reply, result);
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // GET /:jobId — Status de um job
    fastify.get<{ Params: { jobId: string } }>(
      '/:jobId',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          const job = await service.getJob(request.params.jobId, user.id);
          ok(reply, job);
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // GET /:jobId/progress — Progresso do job
    fastify.get<{ Params: { jobId: string } }>(
      '/:jobId/progress',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          await service.getJob(request.params.jobId, user.id);
          const progress = await service.getProgress(request.params.jobId);
          ok(reply, progress ?? { status: 'pending', progress: 0, message: 'Aguardando processamento...' });
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // POST /:jobId/2fa — Enviar código 2FA para o job
    fastify.post<{ Params: { jobId: string }; Body: Submit2FADTO }>(
      '/:jobId/2fa',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          await service.submit2FA(request.params.jobId, user.id, request.body);
          ok(reply, { message: 'Código 2FA recebido. O worker será notificado.' });
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // DELETE /:jobId — Cancelar job
    fastify.delete<{ Params: { jobId: string } }>(
      '/:jobId',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          await service.cancelJob(request.params.jobId, user.id);
          ok(reply, { message: 'Job cancelado com sucesso.' });
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // GET /:jobId/files — Arquivos do job
    fastify.get<{ Params: { jobId: string } }>(
      '/:jobId/files',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          const files = await service.getFiles(request.params.jobId, user.id);
          ok(reply, files);
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );

    // GET /:jobId/audit — Auditoria do job
    fastify.get<{ Params: { jobId: string } }>(
      '/:jobId/audit',
      async (request, reply) => {
        const user = (request as any).user as AuthenticatedUser;
        try {
          const audit = await service.getAudit(request.params.jobId, user.id);
          ok(reply, audit);
        } catch (err) {
          handleServiceError(err, request, reply);
        }
      }
    );
  };
}

// ── Error handler do service ──────────────────────────────────

function handleServiceError(
  err: unknown,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (err instanceof PJEDownloadError) {
    const statusCode = err.statusCode || 400;

    if (statusCode >= 500) {
      request.log.error({ err }, `[PJE] Erro interno: ${err.message}`);
    } else {
      request.log.warn(`[PJE] ${err.code}: ${err.message}`);
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Erro inesperado
  request.log.error({ err }, '[PJE] Erro inesperado');
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    },
  });
}