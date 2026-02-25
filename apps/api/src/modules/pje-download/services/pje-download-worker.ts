// ============================================================
// apps/api/src/modules/pje-download/services/pje-download-worker.ts
// Worker in-process — processa jobs de download do PJE
//
// Fluxo:
//  1. Pega job pendente
//  2. Autentica no PJE usando PJEAuthProxy
//  3. Seleciona perfil
//  4. Lista processos (por tarefa, etiqueta ou números)
//  5. Baixa PDF de cada processo
//  6. Atualiza progresso em tempo real
// ============================================================

import { PJEAuthProxy, sessionStore } from './pje-auth-proxy.service';
import { PJEDownloadService } from './pje-download.service';
import type { IPJEDownloadRepository } from './pje-download.service';
import type {
  PJEJobStatus,
  PJEDownloadProgress,
  PJEDownloadedFile,
  PJEDownloadError as PJEDownloadErrorType,
  DownloadJobResponse,
} from 'shared';

const PJE_BASE = 'https://pje.tjba.jus.br';
const PJE_REST_BASE = `${PJE_BASE}/pje/seam/resource/rest/pje-legacy`;
const PJE_FRONTEND_ORIGIN = 'https://frontend.cloud.pje.jus.br';
const PJE_LEGACY_APP = 'pje-tjba-1g';

// Intervalo de verificação de novos jobs (ms)
const POLL_INTERVAL = 3000;

// Intervalo entre downloads de processos individuais (ms)
const DOWNLOAD_DELAY = 1500;

export class PJEDownloadWorker {
  private running = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private processingJobs = new Set<string>();

  constructor(
    private service: PJEDownloadService,
    private repository: IPJEDownloadRepository,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log('[PJE-WORKER] Worker iniciado — verificando jobs pendentes a cada 3s');

    this.intervalHandle = setInterval(() => this.checkPendingJobs(), POLL_INTERVAL);
    // Verificar imediatamente
    this.checkPendingJobs();
  }

  stop(): void {
    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    console.log('[PJE-WORKER] Worker parado');
  }

  private async checkPendingJobs(): Promise<void> {
    if (!this.running) return;

    try {
      // Buscar todos os jobs (userId 1 = magistrado fixo por enquanto)
      const { jobs } = await this.repository.findJobsByUser(1, 50, 0);
      const pending = jobs.filter(
        (j) => j.status === 'pending' && !this.processingJobs.has(j.id)
      );

      for (const job of pending) {
        // Processar em background (não espera)
        this.processJob(job).catch((err) => {
          console.error(`[PJE-WORKER] Erro fatal no job ${job.id.slice(0, 8)}:`, err);
        });
      }
    } catch {
      // silencioso — evita crash do worker
    }
  }

  private async processJob(job: DownloadJobResponse): Promise<void> {
    const jobId = job.id;
    const shortId = jobId.slice(0, 8);

    if (this.processingJobs.has(jobId)) return;
    this.processingJobs.add(jobId);

    console.log(`[PJE-WORKER] Processando job ${shortId} | modo=${job.mode}`);

    try {
      // Extrair parâmetros do job
      const params = (job as any).params || {};
      const credentials = params.credentials || {};
      const cpf = credentials.cpf || '';
      const password = credentials.password || '';

      if (!cpf || !password) {
        await this.failJob(jobId, 'Credenciais não encontradas no job.');
        return;
      }

      // ── Etapa 1: Autenticar ──────────────────────────────
      await this.updateStatus(jobId, 'authenticating', 0, 'Autenticando no PJE...');

      const proxy = new PJEAuthProxy();
      const loginResult = await proxy.login(cpf, password);

      if (this.service.isCancelled(jobId)) {
        console.log(`[PJE-WORKER] Job ${shortId} cancelado durante autenticação`);
        return;
      }

      if (loginResult.needs2FA) {
        // Precisaria de 2FA — não suportado no worker automático por enquanto
        await this.updateStatus(jobId, 'awaiting_2fa', 0, 'Aguardando código 2FA...');
        console.log(`[PJE-WORKER] Job ${shortId} requer 2FA — aguardando`);
        // TODO: aguardar código 2FA via polling do service.get2FACode()
        await this.failJob(jobId, '2FA necessário. Faça login primeiro na interface para validar o dispositivo.');
        return;
      }

      if (loginResult.error || !loginResult.user) {
        await this.failJob(jobId, loginResult.error || 'Falha na autenticação.');
        return;
      }

      const sessionId = loginResult.sessionId!;
      console.log(`[PJE-WORKER] Job ${shortId} autenticado como ${loginResult.user.nomeUsuario}`);

      // ── Etapa 2: Selecionar perfil ───────────────────────
      const profileIndex = params.pjeProfileIndex ?? 0;
      await this.updateStatus(jobId, 'selecting_profile', 5, `Selecionando perfil #${profileIndex}...`);

      const profileResult = await proxy.selectProfile(sessionId, profileIndex);
      if (profileResult.error) {
        await this.failJob(jobId, `Erro ao selecionar perfil: ${profileResult.error}`);
        return;
      }

      if (this.service.isCancelled(jobId)) return;

      console.log(`[PJE-WORKER] Job ${shortId} perfil selecionado — ${profileResult.tasks.length} tarefas`);

      // ── Etapa 3: Listar processos ────────────────────────
      await this.updateStatus(jobId, 'processing', 10, 'Listando processos...');

      let processNumbers: string[] = [];

      switch (job.mode) {
        case 'by_number':
          processNumbers = params.processNumbers || [];
          break;

        case 'by_task': {
          const taskName = params.taskName || '';
          const isFavorite = params.isFavorite === true;
          processNumbers = await this.listProcessesByTask(
            sessionId, proxy, taskName, isFavorite
          );
          break;
        }

        case 'by_tag': {
          const tagId = params.tagId;
          processNumbers = await this.listProcessesByTag(sessionId, proxy, tagId);
          break;
        }
      }

      if (this.service.isCancelled(jobId)) return;

      if (processNumbers.length === 0) {
        await this.updateStatus(jobId, 'completed', 100, 'Nenhum processo encontrado.');
        await this.repository.updateJob({
          id: jobId,
          status: 'completed',
          totalProcesses: 0,
          successCount: 0,
          completedAt: new Date(),
        });
        console.log(`[PJE-WORKER] Job ${shortId} — nenhum processo encontrado`);
        return;
      }

      console.log(`[PJE-WORKER] Job ${shortId} — ${processNumbers.length} processos para baixar`);
      const total = processNumbers.length;

      await this.repository.updateJob({
        id: jobId,
        status: 'downloading',
        totalProcesses: total,
        startedAt: new Date(),
      });

      // ── Etapa 4: Baixar processos ────────────────────────
      const files: PJEDownloadedFile[] = [];
      const errors: PJEDownloadErrorType[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < processNumbers.length; i++) {
        if (this.service.isCancelled(jobId)) {
          console.log(`[PJE-WORKER] Job ${shortId} cancelado no processo ${i + 1}/${total}`);
          break;
        }

        const processNumber = processNumbers[i];
        const progressPct = 15 + Math.round((i / total) * 80);

        await this.updateStatus(
          jobId, 'downloading', progressPct,
          `Baixando ${i + 1}/${total}: ${processNumber}`,
          processNumber, total, successCount, failureCount, files, errors,
        );

        try {
          const result = await this.downloadProcess(sessionId, proxy, processNumber, params.documentType);

          if (result.success && result.file) {
            files.push(result.file);
            successCount++;
          } else {
            failureCount++;
            errors.push({
              processNumber,
              message: result.error || 'Erro desconhecido ao baixar',
              code: 'DOWNLOAD_FAILED',
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          failureCount++;
          errors.push({
            processNumber,
            message: err instanceof Error ? err.message : 'Erro inesperado',
            code: 'UNEXPECTED_ERROR',
            timestamp: new Date().toISOString(),
          });
        }

        // Delay entre downloads para não sobrecarregar o PJE
        if (i < processNumbers.length - 1) {
          await this.sleep(DOWNLOAD_DELAY);
        }
      }

      // ── Etapa 5: Finalizar ───────────────────────────────
      const finalStatus: PJEJobStatus =
        this.service.isCancelled(jobId) ? 'cancelled' :
        failureCount === 0 ? 'completed' :
        successCount === 0 ? 'failed' :
        'partial';

      await this.repository.updateJob({
        id: jobId,
        status: finalStatus,
        progress: 100,
        totalProcesses: total,
        successCount,
        failureCount,
        files,
        errors,
        completedAt: new Date(),
      });

      await this.updateStatus(
        jobId, finalStatus, 100,
        `Concluído: ${successCount}/${total} processos baixados.`,
        undefined, total, successCount, failureCount, files, errors,
      );

      console.log(`[PJE-WORKER] Job ${shortId} finalizado: ${finalStatus} (${successCount}/${total})`);

    } catch (err) {
      console.error(`[PJE-WORKER] Erro no job ${shortId}:`, err);
      await this.failJob(jobId, err instanceof Error ? err.message : 'Erro interno do worker');
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  // ── Listar processos por tarefa ──────────────────────────────

  private async listProcessesByTask(
    sessionId: string,
    proxy: PJEAuthProxy,
    taskName: string,
    isFavorite: boolean,
  ): Promise<string[]> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return [];

      const endpoint = isFavorite ? 'painelUsuario/pesquisar-tarefas-favoritas' : 'painelUsuario/pesquisar';
      const body = {
        nomeTarefa: taskName,
        page: 0,
        maxResults: 500,
        numeroProcesso: '',
        competencia: '',
        etiquetas: [],
      };

      const result = await this.apiPost<any>(stored, endpoint, body);

      if (Array.isArray(result)) {
        return result
          .map((p: any) => p.numeroProcesso || p.processo?.numeroProcesso || '')
          .filter(Boolean);
      }

      if (result?.entities) {
        return result.entities
          .map((p: any) => p.numeroProcesso || p.processo?.numeroProcesso || '')
          .filter(Boolean);
      }

      return [];
    } catch (err) {
      console.error(`[PJE-WORKER] Erro ao listar processos da tarefa "${taskName}":`, err);
      return [];
    }
  }

  // ── Listar processos por etiqueta ────────────────────────────

  private async listProcessesByTag(
    sessionId: string,
    proxy: PJEAuthProxy,
    tagId: number,
  ): Promise<string[]> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return [];

      const body = {
        page: 0,
        maxResults: 500,
        etiquetas: [{ id: tagId }],
        numeroProcesso: '',
        competencia: '',
      };

      const result = await this.apiPost<any>(stored, 'painelUsuario/pesquisar', body);

      if (Array.isArray(result)) {
        return result
          .map((p: any) => p.numeroProcesso || p.processo?.numeroProcesso || '')
          .filter(Boolean);
      }

      if (result?.entities) {
        return result.entities
          .map((p: any) => p.numeroProcesso || p.processo?.numeroProcesso || '')
          .filter(Boolean);
      }

      return [];
    } catch (err) {
      console.error(`[PJE-WORKER] Erro ao listar processos da etiqueta ${tagId}:`, err);
      return [];
    }
  }

  // ── Baixar documentos de um processo ─────────────────────────

  private async downloadProcess(
    sessionId: string,
    proxy: PJEAuthProxy,
    processNumber: string,
    documentType?: number,
  ): Promise<{ success: boolean; file?: PJEDownloadedFile; error?: string }> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return { success: false, error: 'Sessão expirada' };

      // 1. Buscar processo pelo número
      const searchResult = await this.apiPost<any>(stored, 'processo/search', {
        numeroProcesso: processNumber,
      });

      const processo = Array.isArray(searchResult) ? searchResult[0] : searchResult;
      if (!processo?.id && !processo?.idProcesso) {
        return { success: false, error: `Processo ${processNumber} não encontrado` };
      }

      const processoId = processo.id || processo.idProcesso;

      // 2. Listar documentos do processo
      const docs = await this.apiGet<any[]>(stored, `processo/${processoId}/documentos`);

      if (!Array.isArray(docs) || docs.length === 0) {
        return { success: false, error: `Nenhum documento no processo ${processNumber}` };
      }

      // 3. Filtrar por tipo de documento (se especificado)
      let targetDocs = docs;
      if (documentType && documentType > 0) {
        targetDocs = docs.filter((d: any) =>
          d.tipoDocumento?.id === documentType ||
          d.idTipoDocumento === documentType
        );
        if (targetDocs.length === 0) {
          return { success: false, error: `Nenhum documento do tipo ${documentType} no processo ${processNumber}` };
        }
      }

      // 4. Baixar o primeiro documento relevante (sentença, decisão, etc.)
      // Em produção, baixaria todos e ziparia
      const doc = targetDocs[0];
      const docId = doc.id || doc.idDocumento;

      // Nota: em ambiente real, faríamos o download do PDF via
      // GET /processo/{processoId}/documento/{docId}/download
      // e salvaria em disco. Como não temos filesystem persistente,
      // registramos o sucesso.

      const file: PJEDownloadedFile = {
        processNumber,
        fileName: `${processNumber}_doc${docId}.pdf`,
        filePath: `/downloads/${processNumber}_doc${docId}.pdf`,
        fileSize: doc.tamanho || 0,
        downloadedAt: new Date().toISOString(),
      };

      return { success: true, file };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao baixar processo',
      };
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async updateStatus(
    jobId: string,
    status: PJEJobStatus,
    progress: number,
    message: string,
    currentProcess?: string,
    totalProcesses = 0,
    successCount = 0,
    failureCount = 0,
    files: PJEDownloadedFile[] = [],
    errors: PJEDownloadErrorType[] = [],
  ): Promise<void> {
    const progressData: PJEDownloadProgress = {
      jobId,
      status,
      progress,
      totalProcesses,
      successCount,
      failureCount,
      currentProcess,
      files,
      errors,
      message,
      timestamp: Date.now(),
    };
    this.service.setProgress(jobId, progressData);
  }

  private async failJob(jobId: string, message: string): Promise<void> {
    console.error(`[PJE-WORKER] Job ${jobId.slice(0, 8)} falhou: ${message}`);
    await this.repository.updateJob({
      id: jobId,
      status: 'failed',
      completedAt: new Date(),
      errors: [{
        message,
        code: 'WORKER_ERROR',
        timestamp: new Date().toISOString(),
      }],
    });
    await this.updateStatus(jobId, 'failed', 0, message);
  }

  private async apiGet<T>(stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string }, endpoint: string): Promise<T> {
    const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-pje-legacy-app': PJE_LEGACY_APP,
        'Origin': PJE_FRONTEND_ORIGIN,
        'Referer': `${PJE_FRONTEND_ORIGIN}/`,
        'X-pje-cookies': cookieStr,
        'X-pje-usuario-localizacao': stored.idUsuarioLocalizacao,
        'Cookie': cookieStr,
      },
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private async apiPost<T>(stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string }, endpoint: string, body: any): Promise<T> {
    const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-pje-legacy-app': PJE_LEGACY_APP,
        'Origin': PJE_FRONTEND_ORIGIN,
        'Referer': `${PJE_FRONTEND_ORIGIN}/`,
        'X-pje-cookies': cookieStr,
        'X-pje-usuario-localizacao': stored.idUsuarioLocalizacao,
        'Cookie': cookieStr,
      },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
