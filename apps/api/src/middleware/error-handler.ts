// ============================================================
// apps/api/src/middleware/error-handler.ts
// Error handler global — padroniza todas as respostas de erro
// ============================================================

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode || 500;
  const code = (error as any).code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    request.log.error({ err: error, req: request }, 'Erro interno do servidor');
  } else if (statusCode >= 400) {
    request.log.warn({ err: error, req: request }, `Erro do cliente: ${error.message}`);
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message: statusCode >= 500 ? 'Erro interno do servidor.' : error.message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    },
  };

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    response.error.details = {
      originalMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    };
  }

  return reply.status(statusCode).send(response);
}
