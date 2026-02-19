import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  PJE_QUEUE_NAME,
  PJE_REDIS_KEYS,
  PJE_2FA_TTL,
  PJE_MAX_CONCURRENT_JOBS,
  type CreateDownloadJobDTO,
  type Submit2FADTO,
  type PJEDownloadJobPayload,
  type DownloadJobResponse,
  type PJEDownloadProgress,
} from 'shared';
import { PJEDownloadRepository } from '../repositories/pje-download.repository';

export class PJEDownloadService {
  private queue: Queue;

  constructor(
    private repository: PJEDownloadRepository,
    private redis: Redis,
    queueConnection: { host: string; port: number; password?: string }
  ) {
    this.queue = new Queue(PJE_QUEUE_NAME, { connection: queueConnection });
  }

  async createJob(
    userId: number,
    userName: string,
    dto: CreateDownloadJobDTO
  ): Promise<DownloadJobResponse> {
    const activeCount = await this.repository.countActiveJobsByUser(userId);
    if (activeCount >= PJE_MAX_CONCURRENT_JOBS) {
      throw new PJEDownloadError(
        'LIMIT_EXCEEDED',
        `Limite de ${PJE_MAX_CONCURRENT_JOBS} downloads simultâneos atingido.`
      );
    }

    this.validateDTO(dto);

    const jobId = randomUUID();

    const job = await this.repository.createJob({
      id: jobId,
      userId,
      mode: dto.mode,
      params: {
        processNumbers: dto.processNumbers,
        taskName: dto.taskName,
        isFavorite: dto.isFavorite,
        tagId: dto.tagId,
        tagName: dto.tagName,
        documentType: dto.documentType,
        pjeProfileIndex: dto.pjeProfileIndex,
      },
    });

    const payload: PJEDownloadJobPayload = {
      jobId,
      userId,
      requestedBy: userName,
      credentials: {
        cpf: dto.credentials.cpf,
        password: dto.credentials.password,
      },
      mode: dto.mode,
      processNumbers: dto.processNumbers,
      taskName: dto.taskName,
      isFavorite: dto.isFavorite,
      tagId: dto.tagId,
      tagName: dto.tagName,
      documentType: dto.documentType,
      pjeProfileIndex: dto.pjeProfileIndex,
    };

    await this.queue.add('download', payload, {
      jobId,
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 72 * 3600 },
      attempts: 1,
    });

    return job;
  }

  async getJob(jobId: string, userId: number): Promise<DownloadJobResponse> {
    const job = await this.repository.findJobById(jobId);
    if (!job || job.userId !== userId) {
      throw new PJEDownloadError('NOT_FOUND', 'Job não encontrado.');
    }
    return job;
  }

  async listJobs(userId: number, limit = 20, offset = 0) {
    return this.repository.findJobsByUser(userId, limit, offset);
  }

  async submit2FA(jobId: string, userId: number, dto: Submit2FADTO): Promise<void> {
    const job = await this.getJob(jobId, userId);

    if (job.status !== 'awaiting_2fa') {
      throw new PJEDownloadError('INVALID_STATE', 'Este job não está aguardando código 2FA.');
    }

    if (!/^\d{6}$/.test(dto.code)) {
      throw new PJEDownloadError('INVALID_CODE', 'O código 2FA deve ter exatamente 6 dígitos.');
    }

    const key = PJE_REDIS_KEYS.twoFaCode(jobId);
    await this.redis.set(key, dto.code, 'EX', PJE_2FA_TTL);
  }

  async cancelJob(jobId: string, userId: number): Promise<void> {
    const job = await this.getJob(jobId, userId);

    const cancellableStatuses = [
      'pending', 'authenticating', 'awaiting_2fa',
      'selecting_profile', 'processing', 'downloading',
    ];

    if (!cancellableStatuses.includes(job.status)) {
      throw new PJEDownloadError('INVALID_STATE', `Não é possível cancelar um job com status "${job.status}".`);
    }

    await this.redis.set(`pje:cancel:${jobId}`, '1', 'EX', 3600);

    const bullJob = await this.queue.getJob(jobId);
    if (bullJob) {
      const state = await bullJob.getState();
      if (state === 'waiting' || state === 'delayed') {
        await bullJob.remove();
      }
    }

    await this.repository.updateJob({ id: jobId, status: 'cancelled' });
  }

  async getProgress(jobId: string): Promise<PJEDownloadProgress | null> {
    const raw = await this.redis.get(PJE_REDIS_KEYS.progress(jobId));
    if (!raw) return null;
    return JSON.parse(raw) as PJEDownloadProgress;
  }

  async getFiles(jobId: string, userId: number) {
    const job = await this.getJob(jobId, userId);
    return job.files;
  }

  async getAudit(jobId: string, userId: number) {
    await this.getJob(jobId, userId);
    return this.repository.findAuditByJob(jobId);
  }

  private validateDTO(dto: CreateDownloadJobDTO): void {
    if (!dto.credentials?.cpf || !dto.credentials?.password) {
      throw new PJEDownloadError('MISSING_CREDENTIALS', 'CPF e senha do PJE são obrigatórios.');
    }

    switch (dto.mode) {
      case 'by_number':
        if (!dto.processNumbers?.length) {
          throw new PJEDownloadError('MISSING_PARAMS', 'Informe ao menos um número de processo.');
        }
        const cnjPattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
        for (const num of dto.processNumbers) {
          if (!cnjPattern.test(num)) {
            throw new PJEDownloadError('INVALID_PROCESS_NUMBER', `Número inválido: "${num}". Use NNNNNNN-DD.AAAA.J.TT.OOOO`);
          }
        }
        break;
      case 'by_task':
        if (!dto.taskName) throw new PJEDownloadError('MISSING_PARAMS', 'Informe o nome da tarefa.');
        break;
      case 'by_tag':
        if (!dto.tagId && !dto.tagName) throw new PJEDownloadError('MISSING_PARAMS', 'Informe o ID ou nome da etiqueta.');
        break;
    }
  }
}

export class PJEDownloadError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PJEDownloadError';
  }
}
