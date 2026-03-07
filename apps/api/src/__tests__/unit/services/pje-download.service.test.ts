import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDownloadRepository } from '../../../modules/pje-download/repositories/download.repository.memory';
import type { CreateDownloadJobDTO } from 'shared';
import { PJEDownloadService } from '../../../modules/pje-download/services/pje-download.service';

function makeDTO(overrides: Partial<CreateDownloadJobDTO> = {}): CreateDownloadJobDTO {
  return {
    mode: 'by_task',
    credentials: { cpf: '12345678901', password: 'senha123' },
    taskName: 'Minutar Sentença',
    ...overrides,
  };
}

describe('PJEDownloadService', () => {
  let service: PJEDownloadService;
  let repo: MemoryDownloadRepository;

  beforeEach(() => {
    repo = new MemoryDownloadRepository();
    service = new PJEDownloadService(repo);
  });

  describe('createJob', () => {
    it('deve criar job com dados válidos', async () => {
      const job = await service.createJob(1, 'Test User', makeDTO());
      expect(job.id).toBeTruthy();
      expect(job.status).toBe('pending');
      expect(job.mode).toBe('by_task');
    });

    it('deve rejeitar sem credenciais', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ credentials: { cpf: '', password: '' } }))
      ).rejects.toThrow('CPF e senha');
    });

    it('deve rejeitar CPF com menos de 11 dígitos', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ credentials: { cpf: '123', password: 'x' } }))
      ).rejects.toThrow('11 dígitos');
    });

    it('deve rejeitar modo inválido', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ mode: 'invalid' as any }))
      ).rejects.toThrow('inválido');
    });

    it('deve rejeitar by_task sem taskName', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ mode: 'by_task', taskName: '' }))
      ).rejects.toThrow('nome da tarefa');
    });

    it('deve rejeitar by_number sem números', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ mode: 'by_number', processNumbers: [] }))
      ).rejects.toThrow('ao menos um');
    });

    it('deve rejeitar by_number com formato inválido', async () => {
      await expect(
        service.createJob(1, 'Test', makeDTO({ mode: 'by_number', processNumbers: ['abc'] }))
      ).rejects.toThrow('inválido');
    });

    it('deve respeitar limite de jobs simultâneos', async () => {
      for (let i = 0; i < 3; i++) {
        await service.createJob(1, 'Test', makeDTO());
      }
      await expect(
        service.createJob(1, 'Test', makeDTO())
      ).rejects.toThrow('simultâneos');
    });
  });

  describe('getJob', () => {
    it('deve retornar job existente', async () => {
      const created = await service.createJob(1, 'Test', makeDTO());
      const found = await service.getJob(created.id, 1);
      expect(found.id).toBe(created.id);
    });

    it('deve rejeitar job de outro usuário', async () => {
      const created = await service.createJob(1, 'Test', makeDTO());
      await expect(service.getJob(created.id, 999)).rejects.toThrow('não encontrado');
    });

    it('deve rejeitar job inexistente', async () => {
      await expect(service.getJob('nope', 1)).rejects.toThrow('não encontrado');
    });
  });

  describe('cancelJob', () => {
    it('deve cancelar job pendente', async () => {
      const created = await service.createJob(1, 'Test', makeDTO());
      await service.cancelJob(created.id, 1);
      expect(service.isCancelled(created.id)).toBe(true);
    });
  });

  describe('submit2FA', () => {
    it('deve rejeitar código com formato inválido', async () => {
      const created = await service.createJob(1, 'Test', makeDTO());
      await repo.updateJob({ id: created.id, status: 'awaiting_2fa' });
      await expect(service.submit2FA(created.id, 1, { code: 'abc' })).rejects.toThrow('6 dígitos');
    });
  });

  describe('cleanup', () => {
    it('deve limpar 2FA codes expirados', () => {
      (service as any).twoFaCodes.set('test', { code: '123456', expiresAt: Date.now() - 1000 });
      service.cleanup();
      expect(service.get2FACode('test')).toBeNull();
    });
  });
});
