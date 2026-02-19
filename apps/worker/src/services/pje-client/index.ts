// ============================================================
// apps/worker/src/services/pje-client/index.ts
// PJE Client — fachada que reúne todos os serviços PJE
// ============================================================

import { Redis } from 'ioredis';
import { PJEHttpClient, type PJESession } from './http-client';
import { AuthService, type LoginResult, type CurrentUser } from './auth-service';
import { TaskService, type PJETask, type PJEProcess } from './task-service';
import { TagService, type PJETag } from './tag-service';
import { ProcessSearchService, type ProcessSearchResult } from './process-search-service';
import { DownloadService, type DownloadResult, type DownloadRequest } from './download-service';
import { PJE_REDIS_KEYS, PJE_SESSION_TTL, PJE_2FA_TTL } from 'shared';
import { config } from '../../config';

export {
  type PJESession,
  type LoginResult,
  type CurrentUser,
  type PJETask,
  type PJEProcess,
  type PJETag,
  type ProcessSearchResult,
  type DownloadResult,
  type DownloadRequest,
};

export class PJEClient {
  private http: PJEHttpClient;
  private auth: AuthService;
  private tasks: TaskService;
  private tags: TagService;
  private search: ProcessSearchService;
  private download: DownloadService;

  constructor(private redis: Redis) {
    this.http = new PJEHttpClient();
    this.auth = new AuthService(this.http);
    this.tasks = new TaskService(this.http);
    this.tags = new TagService(this.http);
    this.search = new ProcessSearchService(this.http, this.tasks);
    this.download = new DownloadService(this.http);
  }

  // ── Autenticação ───────────────────────────────────────

  async authenticate(
    userId: number,
    cpf: string,
    password: string
  ): Promise<LoginResult> {
    const cached = await this.restoreSession(userId);
    if (cached) {
      const user = await this.auth.validateSession();
      if (user) {
        return { success: true, needs2FA: false, session: cached };
      }
    }

    const result = await this.auth.login(cpf, password);

    if (result.success && result.session) {
      await this.cacheSession(userId, result.session);
    }

    return result;
  }

  async waitFor2FA(jobId: string): Promise<LoginResult> {
    const key = PJE_REDIS_KEYS.twoFaCode(jobId);
    const timeout = PJE_2FA_TTL * 1000;
    const pollInterval = 2_000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const code = await this.redis.get(key);
      if (code) {
        await this.redis.del(key);
        return this.auth.submit2FA(code);
      }
      await sleep(pollInterval);
    }

    return {
      success: false,
      needs2FA: false,
      error: 'Timeout aguardando código 2FA.',
    };
  }

  async cacheSession(userId: number, session: PJESession): Promise<void> {
    const key = PJE_REDIS_KEYS.session(userId);
    await this.redis.set(key, JSON.stringify(session), 'EX', PJE_SESSION_TTL);
  }

  async restoreSession(userId: number): Promise<PJESession | null> {
    const key = PJE_REDIS_KEYS.session(userId);
    const raw = await this.redis.get(key);
    if (!raw) return null;

    const session: PJESession = JSON.parse(raw);
    this.http.setSession(session);
    return session;
  }

  // ── Tarefas ────────────────────────────────────────────

  async listTasks(): Promise<PJETask[]> {
    return this.tasks.listTasks();
  }

  async listFavoriteTasks(): Promise<PJETask[]> {
    return this.tasks.listFavoriteTasks();
  }

  getAllTaskProcesses(taskName: string, isFavorite: boolean) {
    return this.tasks.getAllTaskProcesses(taskName, isFavorite);
  }

  // ── Etiquetas ──────────────────────────────────────────

  async searchTags(search?: string): Promise<PJETag[]> {
    return this.tags.searchTags(search);
  }

  async findTagByName(name: string): Promise<PJETag | null> {
    return this.tags.findTagByName(name);
  }

  getAllTagProcesses(tagId: number) {
    return this.tags.getAllTagProcesses(tagId);
  }

  // ── Busca por número ──────────────────────────────────

  async findProcessByNumber(numero: string): Promise<ProcessSearchResult | null> {
    return this.search.findByNumber(numero);
  }

  // ── Download ──────────────────────────────────────────

  async downloadProcess(request: DownloadRequest, outputDir: string): Promise<DownloadResult> {
    return this.download.downloadProcess(request, outputDir);
  }

  async generateAccessKey(idProcesso: number): Promise<string | null> {
    return this.download.generateAccessKey(idProcesso);
  }

  // ── Verificação de cancelamento ────────────────────────

  async isCancelled(jobId: string): Promise<boolean> {
    const flag = await this.redis.get(`pje:cancel:${jobId}`);
    return flag === '1';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
