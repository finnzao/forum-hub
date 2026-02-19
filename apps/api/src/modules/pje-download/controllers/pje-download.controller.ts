import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { CreateDownloadJobDTO, Submit2FADTO } from 'shared';
import { PJEDownloadService, PJEDownloadError } from '../services/pje-download.service';

interface AuthenticatedUser {
  id: number;
  name: string;
  role: string;
}

export function pjeDownloadRoutes(service: PJEDownloadService) {
  return async function (fastify: FastifyInstance) {

    // Middleware: autenticação + RBAC
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Integrar com seu sistema de auth real (JWT, session, etc.)
        const userHeader = request.headers['x-user'] as string;
        if (!userHeader) {
          return reply.status(401).send({ error: 'Não autenticado.' });
        }

        const user: AuthenticatedUser = JSON.parse(userHeader);
        (request as any).user = user;

        if (user.role !== 'magistrado') {
          return reply.status(403).send({ error: 'Acesso restrito a magistrados.' });
        }
      } catch {
        return reply.status(401).send({ error: 'Token inválido.' });
      }
    });

    // POST / — Criar job
    fastify.post<{ Body: CreateDownloadJobDTO }>('/', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        const job = await service.createJob(user.id, user.name, request.body);
        return reply.status(201).send(job);
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // GET / — Listar jobs
    fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      const limit = parseInt(request.query.limit || '20', 10);
      const offset = parseInt(request.query.offset || '0', 10);
      const result = await service.listJobs(user.id, limit, offset);
      return reply.send(result);
    });

    // GET /:jobId — Status
    fastify.get<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        const job = await service.getJob(request.params.jobId, user.id);
        return reply.send(job);
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // GET /:jobId/progress — Progresso
    fastify.get<{ Params: { jobId: string } }>('/:jobId/progress', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        await service.getJob(request.params.jobId, user.id);
        const progress = await service.getProgress(request.params.jobId);
        return reply.send(progress ?? { status: 'pending', progress: 0 });
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // POST /:jobId/2fa — Código 2FA
    fastify.post<{ Params: { jobId: string }; Body: Submit2FADTO }>('/:jobId/2fa', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        await service.submit2FA(request.params.jobId, user.id, request.body);
        return reply.send({ message: 'Código 2FA enviado ao Worker.' });
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // DELETE /:jobId — Cancelar
    fastify.delete<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        await service.cancelJob(request.params.jobId, user.id);
        return reply.send({ message: 'Job cancelado.' });
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // GET /:jobId/files — Arquivos
    fastify.get<{ Params: { jobId: string } }>('/:jobId/files', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        const files = await service.getFiles(request.params.jobId, user.id);
        return reply.send(files);
      } catch (err) {
        return handleError(err, reply);
      }
    });

    // GET /:jobId/audit — Auditoria
    fastify.get<{ Params: { jobId: string } }>('/:jobId/audit', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      try {
        const audit = await service.getAudit(request.params.jobId, user.id);
        return reply.send(audit);
      } catch (err) {
        return handleError(err, reply);
      }
    });
  };
}

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof PJEDownloadError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      LIMIT_EXCEEDED: 429,
      MISSING_CREDENTIALS: 400,
      MISSING_PARAMS: 400,
      INVALID_PROCESS_NUMBER: 400,
      INVALID_STATE: 409,
      INVALID_CODE: 400,
    };
    const status = statusMap[err.code] ?? 400;
    return reply.status(status).send({ error: err.message, code: err.code });
  }

  console.error('[PJE Download] Erro inesperado:', err);
  return reply.status(500).send({ error: 'Erro interno do servidor.' });
}
