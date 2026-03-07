import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDownloadRepository } from '../../../modules/pje-download/repositories/download.repository.memory';

describe('MemoryDownloadRepository', () => {
  let repo: MemoryDownloadRepository;

  beforeEach(() => {
    repo = new MemoryDownloadRepository();
  });

  it('deve criar e encontrar job', async () => {
    const job = await repo.createJob({ id: 'test-1', userId: 1, mode: 'by_task', params: {} });
    expect(job.id).toBe('test-1');
    expect(job.status).toBe('pending');

    const found = await repo.findJobById('test-1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('test-1');
  });

  it('deve retornar null para job inexistente', async () => {
    expect(await repo.findJobById('nope')).toBeNull();
  });

  it('deve atualizar status do job', async () => {
    await repo.createJob({ id: 'test-1', userId: 1, mode: 'by_task', params: {} });
    await repo.updateJob({ id: 'test-1', status: 'downloading', progress: 50 });

    const job = await repo.findJobById('test-1');
    expect(job!.status).toBe('downloading');
    expect(job!.progress).toBe(50);
  });

  it('deve listar jobs por usuário ordenados por data', async () => {
    await repo.createJob({ id: 'a', userId: 1, mode: 'by_task', params: {} });
    await repo.createJob({ id: 'b', userId: 1, mode: 'by_tag', params: {} });
    await repo.createJob({ id: 'c', userId: 2, mode: 'by_task', params: {} });

    const { jobs, total } = await repo.findJobsByUser(1, 10, 0);
    expect(total).toBe(2);
    expect(jobs).toHaveLength(2);
    expect(jobs.every((j) => j.userId === 1)).toBe(true);
  });

  it('deve contar jobs ativos por usuário', async () => {
    await repo.createJob({ id: 'a', userId: 1, mode: 'by_task', params: {} });
    await repo.createJob({ id: 'b', userId: 1, mode: 'by_task', params: {} });
    await repo.updateJob({ id: 'b', status: 'completed' });

    expect(await repo.countActiveJobsByUser(1)).toBe(1);
  });

  it('deve paginar resultados', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.createJob({ id: `job-${i}`, userId: 1, mode: 'by_task', params: {} });
    }
    const { jobs } = await repo.findJobsByUser(1, 2, 2);
    expect(jobs).toHaveLength(2);
  });
});
