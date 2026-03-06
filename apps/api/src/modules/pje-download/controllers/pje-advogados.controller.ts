import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GerarPlanilhaAdvogadosDTO } from 'shared';
import { PjeAdvogadosService } from '../services/pje-advogados/index';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface AuthenticatedUser { id: number; name: string; role: string; }

function ok<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  reply.status(statusCode).send({ success: true, data, timestamp: new Date().toISOString() });
}

export function pjeAdvogadosRoutes(service: PjeAdvogadosService) {
  return async function (fastify: FastifyInstance) {

    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userHeader = request.headers['x-user'] as string;

        if (userHeader) {
          let user: AuthenticatedUser;
          try { user = JSON.parse(userHeader); } catch {
            return reply.status(401).send({ success: false, error: { code: 'INVALID_AUTH', message: 'Header x-user inválido.', statusCode: 401 } });
          }

          if (!user.id || !user.name || !user.role)
            return reply.status(401).send({ success: false, error: { code: 'INVALID_AUTH', message: 'Header x-user incompleto.', statusCode: 401 } });

          if (user.role !== 'magistrado')
            return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso restrito a magistrados.', statusCode: 403 } });

          (request as any).user = user;
          return;
        }

        if (process.env.NODE_ENV !== 'production') {
          (request as any).user = { id: 1, name: 'Dev User', role: 'magistrado' } as AuthenticatedUser;
          request.log.warn('[ADVOGADOS] Header x-user ausente — usando usuário padrão (dev mode)');
          return;
        }

        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Header x-user não encontrado.', statusCode: 401 } });
      } catch (err) {
        request.log.error({ err }, 'Erro no middleware');
        return reply.status(500).send({ success: false, error: { code: 'AUTH_ERROR', message: 'Erro interno.', statusCode: 500 } });
      }
    });

    fastify.post<{ Body: GerarPlanilhaAdvogadosDTO }>('/gerar', async (request, reply) => {
      const user = (request as any).user as AuthenticatedUser;
      const dto = request.body;

      if (!dto?.credentials?.cpf || !dto?.credentials?.password)
        return reply.status(400).send({ success: false, error: { code: 'MISSING_CREDENTIALS', message: 'CPF e senha são obrigatórios.', statusCode: 400 } });

      if (!dto.fonte || !['by_task', 'by_tag'].includes(dto.fonte))
        return reply.status(400).send({ success: false, error: { code: 'INVALID_FONTE', message: 'Fonte deve ser by_task ou by_tag.', statusCode: 400 } });

      if (dto.fonte === 'by_task' && !dto.taskName?.trim())
        return reply.status(400).send({ success: false, error: { code: 'MISSING_TASK', message: 'Nome da tarefa é obrigatório.', statusCode: 400 } });

      if (dto.fonte === 'by_tag' && !dto.tagId)
        return reply.status(400).send({ success: false, error: { code: 'MISSING_TAG', message: 'ID da etiqueta é obrigatório.', statusCode: 400 } });

      const jobId = randomUUID();

      service.gerar(jobId, user.id, dto).catch((err) => {
        request.log.error({ err }, `[ADVOGADOS] Erro no job ${jobId.slice(0, 8)}`);
      });

      ok(reply, { jobId, message: 'Geração de planilha iniciada.' }, 202);
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId/progress', async (request, reply) => {
      const progress = service.getProgress(request.params.jobId);
      ok(reply, progress ?? { status: 'pending', progress: 0, message: 'Aguardando...' });
    });

    fastify.delete<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
      service.cancel(request.params.jobId);
      ok(reply, { message: 'Cancelado.' });
    });

    fastify.get<{ Params: { jobId: string } }>('/:jobId/download', async (request, reply) => {
      const progress = service.getProgress(request.params.jobId);
      if (!progress || progress.status !== 'completed') {
        return reply.status(404).send({ success: false, error: { code: 'NOT_READY', message: 'Planilha ainda não está pronta.', statusCode: 404 } });
      }

      const downloadsDir = path.join(process.cwd(), 'downloads', 'planilhas');

      if (!fs.existsSync(downloadsDir)) {
        return reply.status(404).send({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Diretório de planilhas não encontrado.', statusCode: 404 } });
      }

      const files = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.xlsx') || f.endsWith('.csv'));
      const sorted = files.sort((a, b) => {
        const sa = fs.statSync(path.join(downloadsDir, a));
        const sb = fs.statSync(path.join(downloadsDir, b));
        return sb.mtimeMs - sa.mtimeMs;
      });

      if (sorted.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Arquivo não encontrado.', statusCode: 404 } });
      }

      const fileName = sorted[0];
      const filePath = path.join(downloadsDir, fileName);
      const stream = fs.createReadStream(filePath);

      // Content-Type dinâmico baseado na extensão
      const isXlsx = fileName.endsWith('.xlsx');
      const contentType = isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8';

      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      return reply.send(stream);
    });
  };
}
