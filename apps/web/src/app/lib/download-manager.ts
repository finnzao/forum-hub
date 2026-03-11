import { FileSystemManager, buildFolderName } from './filesystem-manager';

export interface DownloadProgress {
  phase: 'initializing' | 'listing' | 'downloading' | 'collecting' | 'finalizing' | 'done' | 'error' | 'cancelled';
  totalProcesses: number;
  currentIndex: number;
  currentProcess: string;
  successCount: number;
  failedCount: number;
  queuedCount: number;
  bytesDownloaded: number;
  message: string;
  files: Array<{ name: string; size: number; status: 'ok' | 'downloading' | 'error'; error?: string }>;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadManagerParams {
  apiBase: string;
  sessionId: string;
  mode: 'by_task' | 'by_tag' | 'by_number';
  taskName?: string;
  tagName?: string;
  tagId?: number;
  isFavorite?: boolean;
  processNumbers?: string[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function downloadWithFallback(
  directUrl: string,
  proxyUrl: string,
  apiBase: string,
  signal?: AbortSignal,
): Promise<Blob> {
  try {
    const res = await fetch(directUrl, { mode: 'cors', signal });
    if (res.ok) return await res.blob();
    throw new Error(`HTTP ${res.status}`);
  } catch {
    const fullProxyUrl = proxyUrl.startsWith('/') ? `${apiBase}${proxyUrl}` : proxyUrl;
    const res = await fetch(fullProxyUrl, { signal });
    if (!res.ok) throw new Error(`Proxy falhou: HTTP ${res.status}`);
    return await res.blob();
  }
}

export class DownloadManager {
  private fs: FileSystemManager;
  private abortController: AbortController | null = null;
  private progress: DownloadProgress;

  constructor() {
    this.fs = new FileSystemManager();
    this.progress = this.initialProgress();
  }

  get isRunning(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }

  async execute(params: DownloadManagerParams, onProgress: ProgressCallback): Promise<void> {
    this.progress = this.initialProgress();
    this.abortController = new AbortController();

    try {
      this.progress.phase = 'initializing';
      this.progress.message = 'Escolha onde salvar os processos...';
      onProgress({ ...this.progress });

      const method = await this.fs.initialize();

      const folderName = buildFolderName({
        mode: params.mode,
        taskName: params.taskName,
        tagName: params.tagName,
      });
      await this.fs.createBatchFolder(folderName);

      this.progress.message = method === 'fsapi'
        ? `Salvando em: ${folderName}/`
        : 'Modo ZIP — arquivo será gerado ao final';
      onProgress({ ...this.progress });

      const sseUrl = new URL(`${params.apiBase}/api/pje/downloads/stream-batch`);
      sseUrl.searchParams.set('sessionId', params.sessionId);
      sseUrl.searchParams.set('mode', params.mode);
      if (params.taskName) sseUrl.searchParams.set('taskName', params.taskName);
      if (params.tagId) sseUrl.searchParams.set('tagId', String(params.tagId));
      if (params.isFavorite) sseUrl.searchParams.set('isFavorite', 'true');
      if (params.processNumbers?.length) {
        sseUrl.searchParams.set('processNumbers', params.processNumbers.join(','));
      }

      await this.processSSE(sseUrl.toString(), params.apiBase, onProgress);

      const report = this.buildReport(params, folderName);
      await this.fs.saveReport(report);

      this.progress.phase = 'finalizing';
      this.progress.message = method === 'fsapi'
        ? `${this.progress.successCount} processos salvos em ${folderName}/`
        : 'Gerando arquivo ZIP...';
      onProgress({ ...this.progress });

      await this.fs.finalize(folderName);

      this.progress.phase = 'done';
      this.progress.message = `Concluído: ${this.progress.successCount}/${this.progress.totalProcesses} processos baixados (${formatBytes(this.progress.bytesDownloaded)})`;
      onProgress({ ...this.progress });

    } catch (err) {
      if (this.abortController?.signal.aborted) {
        this.progress.phase = 'cancelled';
        this.progress.message = 'Cancelado pelo usuário';
      } else {
        this.progress.phase = 'error';
        this.progress.message = err instanceof Error ? err.message : 'Erro desconhecido';
      }
      onProgress({ ...this.progress });
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  dispose(): void {
    this.cancel();
    this.fs.dispose();
  }

  private processSSE(url: string, apiBase: string, onProgress: ProgressCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      const es = new EventSource(url);
      const signal = this.abortController!.signal;

      // Rastreia downloads em andamento para não finalizar antes de todos completarem
      const pendingDownloads: Promise<void>[] = [];
      let sseFinished = false;

      const tryResolve = () => {
        if (sseFinished && pendingDownloads.every(p => {
          // Check if all settled - we use a flag approach instead
          return true; // handled below
        })) {
          Promise.allSettled(pendingDownloads).then(() => resolve());
        }
      };

      signal.addEventListener('abort', () => {
        es.close();
        Promise.allSettled(pendingDownloads).then(() => resolve());
      });

      es.addEventListener('listing', (e: any) => {
        const data = JSON.parse(e.data);
        this.progress.phase = 'downloading';
        this.progress.totalProcesses = data.total;
        this.progress.message = `${data.total} processos encontrados`;
        onProgress({ ...this.progress });
      });

      es.addEventListener('progress', (e: any) => {
        const data = JSON.parse(e.data);
        this.progress.currentIndex = data.index;
        this.progress.currentProcess = data.processNumber;
        this.progress.message = `Solicitando ${data.index}/${data.total}: ${data.processNumber}`;
        onProgress({ ...this.progress });
      });

      es.addEventListener('url', (e: any) => {
        const data = JSON.parse(e.data);
        const fileName = data.fileName || `${data.processNumber}.pdf`;

        this.progress.files.push({ name: fileName, size: 0, status: 'downloading' });
        onProgress({ ...this.progress });

        const downloadPromise = (async () => {
          try {
            const blob = await downloadWithFallback(
              data.downloadUrl,
              data.proxyUrl || '',
              apiBase,
              signal,
            );

            await this.fs.saveFile(fileName, blob);

            const fileEntry = this.progress.files.find(f => f.name === fileName);
            if (fileEntry) { fileEntry.size = blob.size; fileEntry.status = 'ok'; }

            this.progress.successCount++;
            this.progress.bytesDownloaded += blob.size;
          } catch (err) {
            const fileEntry = this.progress.files.find(f => f.name === fileName);
            if (fileEntry) {
              fileEntry.status = 'error';
              fileEntry.error = err instanceof Error ? err.message : 'Erro';
            }
            this.progress.failedCount++;
          }
          onProgress({ ...this.progress });
        })();

        pendingDownloads.push(downloadPromise);
      });

      es.addEventListener('queued', (e: any) => {
        const data = JSON.parse(e.data);
        this.progress.queuedCount++;
        this.progress.message = `${data.processNumber}: aguardando PJE gerar PDF...`;
        onProgress({ ...this.progress });
      });

      es.addEventListener('error', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          this.progress.failedCount++;
          this.progress.files.push({
            name: `${data.processNumber}.pdf`,
            size: 0, status: 'error', error: data.message,
          });
          onProgress({ ...this.progress });
        } catch {
          es.close();
          Promise.allSettled(pendingDownloads).then(() => {
            reject(new Error('Conexão com servidor perdida'));
          });
        }
      });

      es.addEventListener('done', (e: any) => {
        const data = JSON.parse(e.data);
        this.progress.phase = 'collecting';
        this.progress.message = `Servidor concluiu: ${data.success} ok, ${data.failed} erros. Aguardando downloads finalizarem...`;
        onProgress({ ...this.progress });
        es.close();

        sseFinished = true;
        Promise.allSettled(pendingDownloads).then(() => {
          this.progress.message = `Downloads concluídos: ${this.progress.successCount} ok, ${this.progress.failedCount} erros`;
          onProgress({ ...this.progress });
          resolve();
        });
      });

      es.addEventListener('fatal', (e: any) => {
        const data = JSON.parse(e.data);
        es.close();
        Promise.allSettled(pendingDownloads).then(() => {
          reject(new Error(data.message));
        });
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          Promise.allSettled(pendingDownloads).then(() => {
            reject(new Error('Falha na conexão SSE'));
          });
        }
      };
    });
  }

  private buildReport(params: DownloadManagerParams, folderName: string): string {
    const lines: string[] = [
      `═══════════════════════════════════════════════════`,
      `  RELATÓRIO DE DOWNLOAD — PJE/TJBA`,
      `═══════════════════════════════════════════════════`,
      ``,
      `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      `Pasta: ${folderName}`,
      `Modo: ${params.mode === 'by_task' ? 'Por Tarefa' : params.mode === 'by_tag' ? 'Por Etiqueta' : 'Por Número'}`,
    ];

    if (params.taskName) lines.push(`Tarefa: ${params.taskName}`);
    if (params.tagName) lines.push(`Etiqueta: ${params.tagName}`);

    lines.push(
      ``,
      `RESULTADO:`,
      `  Total de processos: ${this.progress.totalProcesses}`,
      `  Downloads OK:       ${this.progress.successCount}`,
      `  Falhas:             ${this.progress.failedCount}`,
      `  Bytes baixados:     ${formatBytes(this.progress.bytesDownloaded)}`,
      ``,
    );

    const errors = this.progress.files.filter(f => f.status === 'error');
    if (errors.length > 0) {
      lines.push(`ERROS (${errors.length}):`);
      for (const f of errors) {
        lines.push(`  ✗ ${f.name}: ${f.error}`);
      }
    }

    const ok = this.progress.files.filter(f => f.status === 'ok');
    if (ok.length > 0) {
      lines.push(``, `ARQUIVOS BAIXADOS (${ok.length}):`);
      for (const f of ok) {
        lines.push(`  ✓ ${f.name} (${formatBytes(f.size)})`);
      }
    }

    lines.push(``, `═══════════════════════════════════════════════════`);
    return lines.join('\n');
  }

  private initialProgress(): DownloadProgress {
    return {
      phase: 'initializing', totalProcesses: 0, currentIndex: 0,
      currentProcess: '', successCount: 0, failedCount: 0,
      queuedCount: 0, bytesDownloaded: 0, message: '', files: [],
    };
  }
}
