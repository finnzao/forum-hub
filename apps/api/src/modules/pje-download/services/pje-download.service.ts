import { randomUUID } from 'node:crypto';
import {
  PJE_MAX_CONCURRENT_JOBS,
  type CreateDownloadJobDTO,
  type Submit2FADTO,
  type DownloadJobResponse,
  type PJEDownloadProgress,
  type PJEJobStatus,
  type PJEDownloadedFile,
  type PJEDownloadError as PJEDownloadErrorType,
} from 'shared';

export interface IPJEDownloadRepository {
  createJob(params: {
    id: string;
    userId: number;
    mode: string;
    params: Record<string, unknown>;
  }): Promise<DownloadJobResponse>;
  findJobById(id: string): Promise<DownloadJobResponse | null>;
  findJobsByUser(userId: number, limit: number, offset: number): Promise<{ jobs: DownloadJobResponse[]; total: number }>;
  updateJob(params: {
    id: string;
    status?: PJEJobStatus;
    progress?: number;
    totalProcesses?: number;
    successCount?: number;
    failureCount?: number;
    files?: PJEDownloadedFile[];
    errors?: PJEDownloadErrorType[];
    startedAt?: Date;
    completedAt?: Date;
  }): Promise<void>;
  countActiveJobsByUser(userId: number): Promise<number>;
  findAuditByJob(jobId: string): Promise<any[]>;
}

export class PJEDownloadService {
  private twoFaCodes = new Map<string, { code: string; expiresAt: number }>();
  private progressMap = new Map<string, PJEDownloadProgress>();
  private cancelFlags = new Set<string>();

  constructor(private repository: IPJEDownloadRepository) {}

  async createJob(
    userId: number,
    userName: string,
    dto: CreateDownloadJobDTO
  ): Promise<DownloadJobResponse> {
    this.validateDTO(dto);

    const activeCount = await this.repository.countActiveJobsByUser(userId);
    if (activeCount >= PJE_MAX_CONCURRENT_JOBS) {
      throw new PJEDownloadError(
        'LIMIT_EXCEEDED',
        `Limite de ${PJE_MAX_CONCURRENT_JOBS} downloads simultâneos atingido.`,
        429
      );
    }

    const jobId = randomUUID();

    const isFavorite = dto.isFavorite === true;

    const job = await this.repository.createJob({
      id: jobId,
      userId,
      mode: dto.mode,
      params: {
        credentials: { cpf: dto.credentials.cpf, password: dto.credentials.password },
        processNumbers: dto.processNumbers,
        taskName: dto.taskName,
        isFavorite,
        tagId: dto.tagId,
        tagName: dto.tagName,
        documentType: dto.documentType,
        pjeProfileIndex: dto.pjeProfileIndex,
        pjeSessionId: (dto as any).pjeSessionId,
      },
    });

    const tipoLista = isFavorite ? 'Minhas Tarefas' : 'Todas as Tarefas';
    console.log(`[PJE] Job ${jobId.slice(0, 8)} criado | usuário=${userName} modo=${dto.mode}${dto.mode === 'by_task' ? ` lista=${tipoLista} tarefa="${dto.taskName}"` : ''}`);
    return job;
  }

  async getJob(jobId: string, userId: number): Promise<DownloadJobResponse> {
    if (!jobId || typeof jobId !== 'string') {
      throw new PJEDownloadError('INVALID_PARAM', 'ID do job é obrigatório.', 400);
    }
    const job = await this.repository.findJobById(jobId);
    if (!job) {
      throw new PJEDownloadError('NOT_FOUND', `Job "${jobId.slice(0, 8)}..." não encontrado.`, 404);
    }
    if (job.userId !== userId) {
      throw new PJEDownloadError('NOT_FOUND', `Job "${jobId.slice(0, 8)}..." não encontrado.`, 404);
    }
    return job;
  }

  async listJobs(userId: number, limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);
    return this.repository.findJobsByUser(userId, safeLimit, safeOffset);
  }

  async submit2FA(jobId: string, userId: number, dto: Submit2FADTO): Promise<void> {
    const job = await this.getJob(jobId, userId);
    if (job.status !== 'awaiting_2fa') {
      throw new PJEDownloadError('INVALID_STATE', `Job não aguarda 2FA (status: ${job.status}).`, 409);
    }
    if (!dto.code || !/^\d{6}$/.test(dto.code)) {
      throw new PJEDownloadError('INVALID_CODE', 'Código 2FA deve ter 6 dígitos.', 400);
    }
    this.twoFaCodes.set(jobId, { code: dto.code, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`[PJE] 2FA recebido para job ${jobId.slice(0, 8)}`);
  }

  get2FACode(jobId: string): string | null {
    const entry = this.twoFaCodes.get(jobId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.twoFaCodes.delete(jobId);
      return null;
    }
    return entry.code;
  }

  async cancelJob(jobId: string, userId: number): Promise<void> {
    const job = await this.getJob(jobId, userId);
    const cancellable: PJEJobStatus[] = [
      'pending', 'authenticating', 'awaiting_2fa',
      'selecting_profile', 'processing', 'downloading',
    ];
    if (!cancellable.includes(job.status)) {
      throw new PJEDownloadError('INVALID_STATE', `Não é possível cancelar job com status "${job.status}".`, 409);
    }
    this.cancelFlags.add(jobId);
    await this.repository.updateJob({ id: jobId, status: 'cancelled' });
    console.log(`[PJE] Job ${jobId.slice(0, 8)} cancelado`);
  }

  isCancelled(jobId: string): boolean {
    return this.cancelFlags.has(jobId);
  }

  async getProgress(jobId: string): Promise<PJEDownloadProgress | null> {
    return this.progressMap.get(jobId) ?? null;
  }

  setProgress(jobId: string, progress: PJEDownloadProgress): void {
    this.progressMap.set(jobId, progress);
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
    if (!dto) {
      throw new PJEDownloadError('INVALID_BODY', 'Corpo da requisição é obrigatório.', 400);
    }

    if (!dto.credentials?.cpf || !dto.credentials?.password) {
      throw new PJEDownloadError('MISSING_CREDENTIALS', 'CPF e senha do PJE são obrigatórios.', 400);
    }

    const cpfDigits = dto.credentials.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      throw new PJEDownloadError('INVALID_CPF', 'CPF deve ter exatamente 11 dígitos.', 400);
    }

    if (!dto.mode) {
      throw new PJEDownloadError('MISSING_PARAMS', 'O modo de download é obrigatório.', 400);
    }

    const validModes = ['by_number', 'by_task', 'by_tag'];
    if (!validModes.includes(dto.mode)) {
      throw new PJEDownloadError('INVALID_MODE', `Modo "${dto.mode}" inválido. Válidos: ${validModes.join(', ')}.`, 400);
    }

    switch (dto.mode) {
      case 'by_number':
        if (!dto.processNumbers?.length) {
          throw new PJEDownloadError('MISSING_PARAMS', 'Informe ao menos um número de processo.', 400);
        }
        if (dto.processNumbers.length > 500) {
          throw new PJEDownloadError('LIMIT_EXCEEDED', `Máximo 500 processos. Enviou ${dto.processNumbers.length}.`, 400);
        }
        const cnjPattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
        const invalid = dto.processNumbers.filter((n) => !cnjPattern.test(n));
        if (invalid.length > 0) {
          throw new PJEDownloadError(
            'INVALID_PROCESS_NUMBER',
            `${invalid.length} número(s) inválido(s): ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}. Formato: NNNNNNN-DD.AAAA.J.TT.OOOO`,
            400
          );
        }
        break;

      case 'by_task':
        if (!dto.taskName?.trim()) {
          throw new PJEDownloadError('MISSING_PARAMS', 'Informe o nome da tarefa.', 400);
        }
        break;

      case 'by_tag':
        if (!dto.tagId && !dto.tagName?.trim()) {
          throw new PJEDownloadError('MISSING_PARAMS', 'Informe o ID ou nome da etiqueta.', 400);
        }
        break;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.twoFaCodes) {
      if (now > entry.expiresAt) this.twoFaCodes.delete(key);
    }
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    for (const [key, progress] of this.progressMap) {
      if (progress.timestamp && progress.timestamp < oneDayAgo) {
        this.progressMap.delete(key);
      }
    }
  }
}

export class PJEDownloadError extends Error {
  public statusCode: number;

  constructor(public code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'PJEDownloadError';
    this.statusCode = statusCode;
  }
}