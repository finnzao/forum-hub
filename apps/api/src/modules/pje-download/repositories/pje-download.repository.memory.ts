// ============================================================
// apps/api/src/modules/pje-download/repositories/pje-download.repository.memory.ts
// Repositório IN-MEMORY — substitui o PostgreSQL
// Os dados vivem apenas enquanto o servidor está rodando.
// ============================================================

import type {
  PJEDownloadMode,
  PJEJobStatus,
  PJEDownloadedFile,
  PJEDownloadError,
  DownloadJobResponse,
} from 'shared';

interface StoredJob {
  id: string;
  userId: number;
  mode: PJEDownloadMode;
  params: Record<string, unknown>;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class PJEDownloadRepositoryMemory {
  private jobs = new Map<string, StoredJob>();
  private audit = new Map<string, any[]>();

  async createJob(params: {
    id: string;
    userId: number;
    mode: string;
    params: Record<string, unknown>;
  }): Promise<DownloadJobResponse> {
    const now = new Date();
    const job: StoredJob = {
      id: params.id,
      userId: params.userId,
      mode: params.mode as PJEDownloadMode,
      params: params.params,
      status: 'pending',
      progress: 0,
      totalProcesses: 0,
      successCount: 0,
      failureCount: 0,
      files: [],
      errors: [],
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(params.id, job);
    return this.toResponse(job);
  }

  async findJobById(id: string): Promise<DownloadJobResponse | null> {
    const job = this.jobs.get(id);
    return job ? this.toResponse(job) : null;
  }

  async findJobsByUser(
    userId: number,
    limit = 20,
    offset = 0
  ): Promise<{ jobs: DownloadJobResponse[]; total: number }> {
    const userJobs = [...this.jobs.values()]
      .filter((j) => j.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      jobs: userJobs.slice(offset, offset + limit).map((j) => this.toResponse(j)),
      total: userJobs.length,
    };
  }

  async updateJob(params: {
    id: string;
    status?: PJEJobStatus;
    progress?: number;
    totalProcesses?: number;
    successCount?: number;
    failureCount?: number;
    files?: PJEDownloadedFile[];
    errors?: PJEDownloadError[];
    startedAt?: Date;
    completedAt?: Date;
  }): Promise<void> {
    const job = this.jobs.get(params.id);
    if (!job) return;

    if (params.status !== undefined) job.status = params.status;
    if (params.progress !== undefined) job.progress = params.progress;
    if (params.totalProcesses !== undefined) job.totalProcesses = params.totalProcesses;
    if (params.successCount !== undefined) job.successCount = params.successCount;
    if (params.failureCount !== undefined) job.failureCount = params.failureCount;
    if (params.files !== undefined) job.files = params.files;
    if (params.errors !== undefined) job.errors = params.errors;
    if (params.startedAt !== undefined) job.startedAt = params.startedAt;
    if (params.completedAt !== undefined) job.completedAt = params.completedAt;
    job.updatedAt = new Date();
  }

  async countActiveJobsByUser(userId: number): Promise<number> {
    const activeStatuses: PJEJobStatus[] = [
      'pending', 'authenticating', 'awaiting_2fa',
      'selecting_profile', 'processing', 'downloading',
      'checking_integrity', 'retrying',
    ];
    return [...this.jobs.values()].filter(
      (j) => j.userId === userId && activeStatuses.includes(j.status)
    ).length;
  }

  async findAuditByJob(jobId: string) {
    return this.audit.get(jobId) ?? [];
  }

  // Estatísticas para o health check
  getStats() {
    const jobs = [...this.jobs.values()];
    return {
      totalJobs: jobs.length,
      byStatus: jobs.reduce((acc, j) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private toResponse(job: StoredJob): DownloadJobResponse {
    return {
      id: job.id,
      userId: job.userId,
      mode: job.mode,
      status: job.status,
      progress: job.progress,
      totalProcesses: job.totalProcesses,
      successCount: job.successCount,
      failureCount: job.failureCount,
      files: job.files,
      errors: job.errors,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
  }
}
