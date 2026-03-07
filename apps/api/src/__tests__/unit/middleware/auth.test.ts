import { describe, it, expect, vi } from 'vitest';
import { authMiddleware, getUser } from '../../../middleware/auth';

function mockRequest(headers: Record<string, string> = {}, url = '/test'): any {
  return { headers, url, log: { warn: vi.fn() } };
}

function mockReply(): any {
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => { reply.statusCode = code; return reply; });
  reply.send = vi.fn(() => reply);
  return reply;
}

describe('authMiddleware', () => {
  const middleware = authMiddleware({ requiredRole: 'magistrado' });

  it('deve aceitar header x-user válido', async () => {
    const user = { id: 1, name: 'Test', role: 'magistrado' };
    const req = mockRequest({ 'x-user': JSON.stringify(user) });
    const reply = mockReply();

    await middleware(req, reply);

    expect(getUser(req)).toEqual(user);
    expect(reply.send).not.toHaveBeenCalled();
  });

  it('deve rejeitar header x-user com JSON inválido', async () => {
    const req = mockRequest({ 'x-user': '{invalid' });
    const reply = mockReply();

    await middleware(req, reply);

    expect(reply.statusCode).toBe(401);
  });

  it('deve rejeitar header x-user incompleto', async () => {
    const req = mockRequest({ 'x-user': JSON.stringify({ id: 1 }) });
    const reply = mockReply();

    await middleware(req, reply);

    expect(reply.statusCode).toBe(401);
  });

  it('deve rejeitar role incorreta', async () => {
    const req = mockRequest({ 'x-user': JSON.stringify({ id: 1, name: 'Test', role: 'servidor' }) });
    const reply = mockReply();

    await middleware(req, reply);

    expect(reply.statusCode).toBe(403);
  });

  it('deve usar dev user em desenvolvimento quando header ausente', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const req = mockRequest();
    const reply = mockReply();

    await middleware(req, reply);

    expect(getUser(req).name).toBe('Dev User');
    expect(reply.send).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('deve pular paths configurados', async () => {
    const skipMiddleware = authMiddleware({ skipPaths: ['/auth/'] });
    const req = mockRequest({}, '/auth/login');
    const reply = mockReply();

    await skipMiddleware(req, reply);

    expect(reply.send).not.toHaveBeenCalled();
  });
});
