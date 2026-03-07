import type { FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>, body: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        statusCode: 400,
        details: result.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
    return null;
  }
  return result.data;
}
