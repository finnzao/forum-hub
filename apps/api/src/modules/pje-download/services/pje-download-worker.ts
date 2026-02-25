// ============================================================
// apps/api/src/modules/pje-download/services/pje-download-worker.ts
// Worker in-process — processa jobs de download do PJE
//
// Correções v7:
//  - situacaoDownload: aceita 'S' (real) além de 'DISPONIVEL'
//  - idUsuario para recuperarDownloadsDisponiveis usa
//    idUsuario do currentUser (NÃO idUsuarioLocalizacaoMagistradoServidor)
//    Confirmado pelo HAR: idUsuario=14552753 funciona, 
//    idUsuarioLocalizacaoMagistradoServidor=1463158 NÃO funciona
//  - Download flow melhorado: solicita download → polling robusto
//    com backoff progressivo e verificação de múltiplos status
//  - Extração do botão de download mais robusta
//  - Suporte a download em lotes com coleta de pendentes
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
import * as fs from 'node:fs';
import * as path from 'node:path';

const PJE_BASE = 'https://pje.tjba.jus.br';
const PJE_REST_BASE = `${PJE_BASE}/pje/seam/resource/rest/pje-legacy`;
const PJE_FRONTEND_ORIGIN = 'https://frontend.cloud.pje.jus.br';
const PJE_LEGACY_APP = 'pje-tjba-1g';

// Configuração
const POLL_INTERVAL = 3000;             // Verificar novos jobs a cada 3s
const DOWNLOAD_DELAY = 2000;            // Delay entre downloads individuais
const DOWNLOAD_POLL_INTERVAL = 10000;   // Verificar área de downloads a cada 10s
const DOWNLOAD_POLL_INITIAL = 5000;     // Primeira verificação após 5s
const DOWNLOAD_TIMEOUT = 600000;        // 10 min timeout para download ficar disponível
const DOWNLOAD_BATCH_SIZE = 10;         // Solicitar N downloads antes de aguardar
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

// Status que indicam download disponível na API do PJE
// O PJE usa 'S' (sim) como situação de disponível, não 'DISPONIVEL'
const DOWNLOAD_AVAILABLE_STATUSES = ['S', 'DISPONIVEL', 'AVAILABLE'];

export class PJEDownloadWorker {
  private running = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private processingJobs = new Set<string>();

  constructor(
    private service: PJEDownloadService,
    private repository: IPJEDownloadRepository,
  ) {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log('[PJE-WORKER] Worker iniciado — verificando jobs pendentes a cada 3s');
    this.intervalHandle = setInterval(() => this.checkPendingJobs(), POLL_INTERVAL);
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
      const { jobs } = await this.repository.findJobsByUser(1, 50, 0);
      const pending = jobs.filter(
        (j) => j.status === 'pending' && !this.processingJobs.has(j.id)
      );
      for (const job of pending) {
        this.processJob(job).catch((err) => {
          console.error(`[PJE-WORKER] Erro fatal no job ${job.id.slice(0, 8)}:`, err);
        });
      }
    } catch { /* silencioso */ }
  }

  // ══════════════════════════════════════════════════════════
  // PROCESSAMENTO PRINCIPAL DO JOB
  // ══════════════════════════════════════════════════════════

  private async processJob(job: DownloadJobResponse): Promise<void> {
    const jobId = job.id;
    const shortId = jobId.slice(0, 8);

    if (this.processingJobs.has(jobId)) return;
    this.processingJobs.add(jobId);

    console.log(`[PJE-WORKER] ══════ Processando job ${shortId} | modo=${job.mode} ══════`);

    try {
      const params = (job as any).params || {};
      const credentials = params.credentials || {};
      const cpf = credentials.cpf || '';
      const password = credentials.password || '';

      if (!cpf || !password) {
        await this.failJob(jobId, 'Credenciais não encontradas no job.');
        return;
      }

      // ── 1. Autenticar ──────────────────────────────────────
      await this.updateStatus(jobId, 'authenticating', 0, 'Autenticando no PJE...');

      const proxy = new PJEAuthProxy();
      const loginResult = await proxy.login(cpf, password);

      if (this.service.isCancelled(jobId)) return;

      if (loginResult.needs2FA) {
        await this.failJob(jobId, '2FA necessário. Faça login primeiro na interface para validar o dispositivo.');
        return;
      }

      if (loginResult.error || !loginResult.user) {
        await this.failJob(jobId, loginResult.error || 'Falha na autenticação.');
        return;
      }

      const sessionId = loginResult.sessionId!;
      console.log(`[PJE-WORKER] Job ${shortId} autenticado como ${loginResult.user.nomeUsuario}`);

      // ── 2. Selecionar perfil ───────────────────────────────
      const profileIndex = params.pjeProfileIndex ?? 0;
      await this.updateStatus(jobId, 'selecting_profile', 5, `Selecionando perfil #${profileIndex}...`);

      const profileResult = await proxy.selectProfile(sessionId, profileIndex);
      if (profileResult.error) {
        await this.failJob(jobId, `Erro ao selecionar perfil: ${profileResult.error}`);
        return;
      }
      if (this.service.isCancelled(jobId)) return;

      console.log(`[PJE-WORKER] Job ${shortId} perfil selecionado — ${profileResult.tasks.length} tarefas`);

      const stored = sessionStore.get(sessionId);
      if (!stored) {
        await this.failJob(jobId, 'Sessão perdida após seleção de perfil.');
        return;
      }

      // ── 3. Listar processos ────────────────────────────────
      await this.updateStatus(jobId, 'processing', 10, 'Listando processos...');

      interface ProcessoInfo {
        idProcesso: number;
        numeroProcesso: string;
        idTaskInstance?: number;
      }

      let processos: ProcessoInfo[] = [];

      switch (job.mode) {
        case 'by_number': {
          const numbers: string[] = params.processNumbers || [];
          for (const num of numbers) {
            processos.push({ idProcesso: 0, numeroProcesso: num });
          }
          break;
        }

        case 'by_task': {
          const taskName = params.taskName || '';
          const isFavorite = params.isFavorite === true;
          processos = await this.listProcessesByTask(stored, taskName, isFavorite);
          break;
        }

        case 'by_tag': {
          const tagId = params.tagId;
          if (tagId) {
            processos = await this.listProcessesByTag(stored, tagId);
          }
          break;
        }
      }

      if (this.service.isCancelled(jobId)) return;

      if (processos.length === 0) {
        await this.updateStatus(jobId, 'completed', 100, 'Nenhum processo encontrado.');
        await this.repository.updateJob({
          id: jobId, status: 'completed', totalProcesses: 0, successCount: 0, completedAt: new Date(),
        });
        console.log(`[PJE-WORKER] Job ${shortId} — nenhum processo encontrado`);
        return;
      }

      console.log(`[PJE-WORKER] Job ${shortId} — ${processos.length} processos para baixar`);
      const total = processos.length;

      await this.repository.updateJob({
        id: jobId, status: 'downloading', totalProcesses: total, startedAt: new Date(),
      });

      // ── 4. Download em lotes ───────────────────────────────
      // Estratégia: solicita downloads em lotes de DOWNLOAD_BATCH_SIZE,
      // depois aguarda todos os pendentes ficarem disponíveis na área
      // de downloads antes de solicitar o próximo lote.

      const files: PJEDownloadedFile[] = [];
      const errors: PJEDownloadErrorType[] = [];
      let successCount = 0;
      let failureCount = 0;

      // Processos cujo download foi solicitado mas ainda não baixado
      const pendingDownloads: Array<{
        proc: ProcessoInfo;
        requestedAt: number;
      }> = [];

      for (let i = 0; i < processos.length; i++) {
        if (this.service.isCancelled(jobId)) {
          console.log(`[PJE-WORKER] Job ${shortId} cancelado no processo ${i + 1}/${total}`);
          break;
        }

        const proc = processos[i];
        const progressPct = 15 + Math.round((i / total) * 70);

        await this.updateStatus(
          jobId, 'downloading', progressPct,
          `Solicitando download ${i + 1}/${total}: ${proc.numeroProcesso}`,
          proc.numeroProcesso, total, successCount, failureCount, files, errors,
        );

        try {
          const result = await this.requestDownload(stored, proc);

          if (result.type === 'direct' && result.file) {
            // Download direto (URL S3 imediata)
            files.push(result.file);
            successCount++;
            console.log(`[PJE-WORKER] Job ${shortId} ✓ ${proc.numeroProcesso} (direto)`);
          } else if (result.type === 'queued') {
            // Download foi para a fila — será coletado em batch
            pendingDownloads.push({ proc, requestedAt: Date.now() });
            console.log(`[PJE-WORKER] Job ${shortId} ⏳ ${proc.numeroProcesso} (na fila)`);
          } else {
            failureCount++;
            errors.push({
              processNumber: proc.numeroProcesso,
              message: result.error || 'Erro ao solicitar download',
              code: 'REQUEST_FAILED',
              timestamp: new Date().toISOString(),
            });
            console.log(`[PJE-WORKER] Job ${shortId} ✗ ${proc.numeroProcesso}: ${result.error}`);
          }
        } catch (err) {
          failureCount++;
          errors.push({
            processNumber: proc.numeroProcesso,
            message: err instanceof Error ? err.message : 'Erro inesperado',
            code: 'UNEXPECTED_ERROR',
            timestamp: new Date().toISOString(),
          });
        }

        // A cada lote, coletar downloads pendentes
        if (pendingDownloads.length >= DOWNLOAD_BATCH_SIZE || i === processos.length - 1) {
          if (pendingDownloads.length > 0) {
            await this.updateStatus(
              jobId, 'downloading', progressPct,
              `Aguardando ${pendingDownloads.length} download(s) ficarem disponíveis...`,
              undefined, total, successCount, failureCount, files, errors,
            );

            const batchResults = await this.collectPendingDownloads(
              stored, pendingDownloads, jobId
            );

            for (const br of batchResults) {
              if (br.file) {
                files.push(br.file);
                successCount++;
                console.log(`[PJE-WORKER] Job ${shortId} ✓ ${br.processNumber} (coletado)`);
              } else {
                failureCount++;
                errors.push({
                  processNumber: br.processNumber,
                  message: br.error || 'Timeout aguardando download',
                  code: 'DOWNLOAD_TIMEOUT',
                  timestamp: new Date().toISOString(),
                });
                console.log(`[PJE-WORKER] Job ${shortId} ✗ ${br.processNumber}: ${br.error}`);
              }
            }

            pendingDownloads.length = 0;
          }
        }

        // Delay entre solicitações
        if (i < processos.length - 1) {
          await this.sleep(DOWNLOAD_DELAY);
        }
      }

      // ── 5. Verificação de integridade ──────────────────────
      await this.updateStatus(
        jobId, 'checking_integrity', 90,
        'Verificando integridade dos downloads...',
        undefined, total, successCount, failureCount, files, errors,
      );

      const downloadedDigits = new Set(
        files.map(f => f.processNumber.replace(/\D/g, ''))
      );

      const missingProcesses = processos.filter(proc => {
        const digits = proc.numeroProcesso.replace(/\D/g, '');
        return !downloadedDigits.has(digits);
      });

      // ── 6. Retries automáticos ─────────────────────────────
      if (missingProcesses.length > 0 && !this.service.isCancelled(jobId)) {
        await this.updateStatus(
          jobId, 'retrying', 92,
          `Retentando ${missingProcesses.length} processo(s) faltante(s)...`,
          undefined, total, successCount, failureCount, files, errors,
        );

        for (let retry = 0; retry < 2; retry++) {
          if (missingProcesses.length === 0 || this.service.isCancelled(jobId)) break;

          console.log(`[PJE-WORKER] Job ${shortId} retry ${retry + 1}/2: ${missingProcesses.length} faltando`);

          const retryPending: Array<{ proc: ProcessoInfo; requestedAt: number }> = [];

          for (let i = missingProcesses.length - 1; i >= 0; i--) {
            const proc = missingProcesses[i];

            try {
              const result = await this.requestDownload(stored, proc);

              if (result.type === 'direct' && result.file) {
                files.push(result.file);
                successCount++;
                failureCount = Math.max(0, failureCount - 1);
                errors.splice(errors.findIndex(e => e.processNumber === proc.numeroProcesso), 1);
                missingProcesses.splice(i, 1);
              } else if (result.type === 'queued') {
                retryPending.push({ proc, requestedAt: Date.now() });
              }
            } catch { /* continua */ }

            await this.sleep(DOWNLOAD_DELAY);
          }

          // Coletar pendentes do retry
          if (retryPending.length > 0) {
            const batchResults = await this.collectPendingDownloads(stored, retryPending, jobId);

            for (const br of batchResults) {
              if (br.file) {
                files.push(br.file);
                successCount++;
                failureCount = Math.max(0, failureCount - 1);
                const errIdx = errors.findIndex(e => e.processNumber === br.processNumber);
                if (errIdx >= 0) errors.splice(errIdx, 1);
                const missIdx = missingProcesses.findIndex(p => p.numeroProcesso === br.processNumber);
                if (missIdx >= 0) missingProcesses.splice(missIdx, 1);
              }
            }
          }
        }
      }

      // ── 7. Finalizar ──────────────────────────────────────
      const finalStatus: PJEJobStatus =
        this.service.isCancelled(jobId) ? 'cancelled' :
        failureCount === 0 ? 'completed' :
        successCount === 0 ? 'failed' :
        'partial';

      await this.repository.updateJob({
        id: jobId, status: finalStatus, progress: 100,
        totalProcesses: total, successCount, failureCount,
        files, errors, completedAt: new Date(),
      });

      await this.updateStatus(
        jobId, finalStatus, 100,
        `Concluído: ${successCount}/${total} processos baixados.`,
        undefined, total, successCount, failureCount, files, errors,
      );

      console.log(`[PJE-WORKER] ══════ Job ${shortId} finalizado: ${finalStatus} (${successCount}/${total}) ══════`);

    } catch (err) {
      console.error(`[PJE-WORKER] Erro no job ${shortId}:`, err);
      await this.failJob(jobId, err instanceof Error ? err.message : 'Erro interno do worker');
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  // ══════════════════════════════════════════════════════════
  // SOLICITAR DOWNLOAD DE UM PROCESSO
  // Retorna: 'direct' (com file), 'queued' (aguardando), ou 'error'
  // ══════════════════════════════════════════════════════════

  private async requestDownload(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    proc: { idProcesso: number; numeroProcesso: string; idTaskInstance?: number },
  ): Promise<{
    type: 'direct' | 'queued' | 'error';
    file?: PJEDownloadedFile;
    error?: string;
  }> {
    const { idProcesso, numeroProcesso, idTaskInstance } = proc;

    if (!idProcesso) {
      return { type: 'error', error: `idProcesso não disponível para ${numeroProcesso}` };
    }

    try {
      // 1. Gerar chave de acesso (ca)
      const caRaw = await this.apiGet<string>(
        stored,
        `painelUsuario/gerarChaveAcessoProcesso/${idProcesso}`
      );

      if (!caRaw || typeof caRaw !== 'string' || caRaw.length < 10) {
        return { type: 'error', error: `Chave de acesso inválida para ${numeroProcesso}` };
      }

      const ca = caRaw.replace(/^"|"$/g, '');

      // 2. Abrir página de autos digitais
      const autosUrl = `${PJE_BASE}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=${idProcesso}&ca=${ca}${idTaskInstance ? `&idTaskInstance=${idTaskInstance}` : ''}`;

      const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
      const autosRes = await fetch(autosUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });

      const autosHtml = await autosRes.text();

      // 3. Extrair ViewState
      const viewStateMatch = autosHtml.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
      const viewState = viewStateMatch?.[1];

      if (!viewState) {
        return { type: 'error', error: `ViewState não encontrado para ${numeroProcesso}` };
      }

      // 4. Extrair ID do botão de download
      // O botão de download tem padrões como:
      //   navbar:j_id267, navbar:j_id280 etc.
      // Estratégia: buscar todos os navbar:j_idN e filtrar pelo contexto
      const downloadBtnId = this.extractDownloadButtonId(autosHtml);

      if (!downloadBtnId) {
        return { type: 'error', error: `Botão de download não encontrado para ${numeroProcesso}` };
      }

      // 5. POST AJAX para solicitar download
      const now = new Date();
      const currentDate = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const postBody = new URLSearchParams({
        'AJAXREQUEST': '_viewRoot',
        'navbar:cbTipoDocumento': '0',
        'navbar:idDe': '',
        'navbar:idAte': '',
        'navbar:dtInicioInputDate': '',
        'navbar:dtInicioInputCurrentDate': currentDate,
        'navbar:dtFimInputDate': '',
        'navbar:dtFimInputCurrentDate': currentDate,
        'navbar:cbCronologia': 'DESC',
        '': 'on',
        'navbar': 'navbar',
        'autoScroll': '',
        'javax.faces.ViewState': viewState,
        [downloadBtnId]: downloadBtnId,
        'AJAX:EVENTS_COUNT': '1',
      });

      const downloadRes = await fetch(
        `${PJE_BASE}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookieStr,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Faces-Request': 'partial/ajax',
          },
          body: postBody.toString(),
          redirect: 'follow',
        }
      );

      const responseHtml = await downloadRes.text();

      // 6. Analisar resposta

      // a) URL S3 imediata — window.open('https://...s3...pdf...')
      const s3UrlMatch = responseHtml.match(
        /window\.open\('(https:\/\/[^']*s3[^']*\.pdf[^']*?)'/
      );
      if (s3UrlMatch && s3UrlMatch[1]) {
        const file = await this.downloadFromS3(s3UrlMatch[1], numeroProcesso);
        return { type: 'direct', file };
      }

      // b) "será disponibilizado" ou "está sendo gerado" — vai para a fila
      if (
        responseHtml.includes('será disponibilizado') ||
        responseHtml.includes('será gerado') ||
        responseHtml.includes('está sendo gerado') ||
        responseHtml.includes('Área de download')
      ) {
        return { type: 'queued' };
      }

      // c) Verificar se window.open tem URL vazia (significa queued)
      // Padrão: window.open('') — download será assíncrono
      const emptyWindowOpen = responseHtml.match(/window\.open\(''\)/);
      if (emptyWindowOpen) {
        return { type: 'queued' };
      }

      // d) Se a resposta é muito grande (página completa), provavelmente
      // é o caso de "será disponibilizado" com HTML completo
      if (responseHtml.length > 5000) {
        console.log(`[PJE-WORKER] ${numeroProcesso}: resposta grande (${responseHtml.length} chars), tratando como queued`);
        return { type: 'queued' };
      }

      // e) Erro
      return { type: 'error', error: `Resposta inesperada ao solicitar download de ${numeroProcesso}` };

    } catch (err) {
      return {
        type: 'error',
        error: err instanceof Error ? err.message : 'Erro ao solicitar download',
      };
    }
  }

  // ══════════════════════════════════════════════════════════
  // EXTRAIR ID DO BOTÃO DE DOWNLOAD
  // Busca o botão que dispara o download dos autos digitais.
  // O botão tem ID no padrão navbar:j_idN e geralmente está
  // associado a texto "Download" ou "Baixar" ou ao onclick
  // que gera o download completo.
  // ══════════════════════════════════════════════════════════

  private extractDownloadButtonId(html: string): string | null {
    // Estratégia 1: botão com texto "Download" e ID navbar:j_idN
    // Padrão: value="Download" ... id="navbar:j_id267" ou vice-versa
    const downloadBtnPatterns = [
      // Botão com value="Download" no navbar
      /id="(navbar:j_id\d+)"[^>]*value="Download"/i,
      /value="Download"[^>]*id="(navbar:j_id\d+)"/i,
      // onclick que referencia navbar:j_idN com 'Download' por perto
      /(navbar:j_id\d+)[^}]*'parameters'[^}]*\}[^<]*?Download/i,
      // Botão com onclick que abre window.open e tem navbar:j_idN
      /(navbar:j_id\d+)(?='[^}]*oncomplete[^}]*window\.open)/i,
    ];

    for (const pattern of downloadBtnPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        console.log(`[PJE-WORKER] Botão download encontrado: ${match[1]} (padrão específico)`);
        return match[1];
      }
    }

    // Estratégia 2: encontrar todos os navbar:j_idN e escolher o
    // que está associado ao download. O botão de download geralmente
    // é o que tem onclick com AJAX request e está dentro do navbar form.
    const allButtons = new Map<string, number>(); // id -> posição
    const btnRegex = /(navbar:j_id(\d+))/g;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(html)) !== null) {
      if (!allButtons.has(btnMatch[1])) {
        allButtons.set(btnMatch[1], btnMatch.index);
      }
    }

    if (allButtons.size === 0) return null;

    // Filtrar apenas os que aparecem como submit buttons (não inputs/selects)
    // O botão de download geralmente tem o maior j_id numérico no navbar
    const candidates = [...allButtons.keys()]
      .filter(id => {
        const pos = allButtons.get(id)!;
        // Verificar contexto: deve estar perto de "Download" ou "download"
        const context = html.substring(Math.max(0, pos - 200), Math.min(html.length, pos + 500));
        return /download|baixar|gerar/i.test(context);
      });

    if (candidates.length > 0) {
      // Pegar o que tem o contexto mais relevante
      const best = candidates[candidates.length - 1];
      console.log(`[PJE-WORKER] Botão download encontrado: ${best} (por contexto)`);
      return best;
    }

    // Fallback: pegar o último navbar:j_idN (geralmente é o download)
    const allIds = [...allButtons.keys()];
    const last = allIds[allIds.length - 1];
    console.log(`[PJE-WORKER] Botão download (fallback): ${last}`);
    return last;
  }

  // ══════════════════════════════════════════════════════════
  // COLETAR DOWNLOADS PENDENTES DA ÁREA DE DOWNLOADS
  //
  // Fluxo:
  //  1. Aguardar um tempo inicial para o PJE gerar os arquivos
  //  2. Polling na API recuperarDownloadsDisponiveis
  //  3. Para cada download disponível que match com nossos processos,
  //     gerar URL S3 e baixar
  //  4. Repetir até todos coletados ou timeout
  // ══════════════════════════════════════════════════════════

  private async collectPendingDownloads(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    pendingList: Array<{ proc: { idProcesso: number; numeroProcesso: string }; requestedAt: number }>,
    jobId: string,
  ): Promise<Array<{
    processNumber: string;
    file?: PJEDownloadedFile;
    error?: string;
  }>> {
    const results: Array<{
      processNumber: string;
      file?: PJEDownloadedFile;
      error?: string;
    }> = [];

    if (pendingList.length === 0) return results;

    // Mapa de processos pendentes: dígitos do número -> info
    const remaining = new Map<string, {
      proc: { idProcesso: number; numeroProcesso: string };
      requestedAt: number;
    }>();

    for (const item of pendingList) {
      const digits = item.proc.numeroProcesso.replace(/\D/g, '');
      remaining.set(digits, item);
    }

    console.log(`[PJE-WORKER] Aguardando ${remaining.size} download(s) na área de downloads...`);

    // Aguardar tempo inicial
    await this.sleep(DOWNLOAD_POLL_INITIAL);

    const startTime = Date.now();
    let pollCount = 0;

    while (remaining.size > 0 && Date.now() - startTime < DOWNLOAD_TIMEOUT) {
      if (this.service.isCancelled(jobId)) break;

      pollCount++;

      try {
        const downloads = await this.fetchAvailableDownloads(stored);

        for (const dl of downloads) {
          // Verificar se está disponível
          const status = (dl.situacaoDownload || '').toUpperCase();
          if (!DOWNLOAD_AVAILABLE_STATUSES.includes(status)) {
            continue;
          }

          // Verificar se match com algum processo pendente
          const nomeArquivo = dl.nomeArquivo || '';
          const dlDigits = nomeArquivo.replace(/\D/g, '');

          // Tentar match por itens do download
          let matchedDigits: string | null = null;

          for (const item of (dl.itens || [])) {
            const itemDigits = (item.numeroProcesso || '').replace(/\D/g, '');
            if (remaining.has(itemDigits)) {
              matchedDigits = itemDigits;
              break;
            }
            if (item.idProcesso && [...remaining.values()].some(r => r.proc.idProcesso === item.idProcesso)) {
              const found = [...remaining.entries()].find(([, r]) => r.proc.idProcesso === item.idProcesso);
              if (found) {
                matchedDigits = found[0];
                break;
              }
            }
          }

          // Fallback: match pelo nome do arquivo
          if (!matchedDigits) {
            for (const [digits] of remaining) {
              if (dlDigits.includes(digits)) {
                matchedDigits = digits;
                break;
              }
            }
          }

          if (matchedDigits && dl.hashDownload) {
            const item = remaining.get(matchedDigits)!;

            try {
              // Gerar URL S3
              const s3Url = await this.generateS3DownloadUrl(stored, dl.hashDownload);

              if (s3Url) {
                const file = await this.downloadFromS3(s3Url, item.proc.numeroProcesso);
                results.push({ processNumber: item.proc.numeroProcesso, file });
                remaining.delete(matchedDigits);
                console.log(`[PJE-WORKER] ✓ Coletado da área de downloads: ${item.proc.numeroProcesso} (poll #${pollCount})`);
              }
            } catch (err) {
              console.warn(`[PJE-WORKER] Erro ao baixar ${item.proc.numeroProcesso} da área:`, err);
              // Não remove de remaining — tentará novamente no próximo poll
            }
          }
        }
      } catch (err) {
        console.warn(`[PJE-WORKER] Erro no polling de downloads (tentativa ${pollCount}):`, err);
      }

      if (remaining.size > 0) {
        // Backoff progressivo: 10s, 15s, 20s, 25s, max 30s
        const delay = Math.min(DOWNLOAD_POLL_INTERVAL + (pollCount * 2500), 30000);
        await this.sleep(delay);
      }
    }

    // Processos que não ficaram disponíveis — timeout
    for (const [digits, item] of remaining) {
      results.push({
        processNumber: item.proc.numeroProcesso,
        error: `Timeout (${Math.round(DOWNLOAD_TIMEOUT / 1000)}s) aguardando download ficar disponível`,
      });
    }

    return results;
  }

  // ══════════════════════════════════════════════════════════
  // BUSCAR DOWNLOADS DISPONÍVEIS NA ÁREA DE DOWNLOADS
  // Endpoint: GET /pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis
  //
  // NOTA CRÍTICA (v7): o parâmetro idUsuario espera o campo idUsuario
  // do currentUser (ex: 14552753), NÃO idUsuarioLocalizacaoMagistradoServidor
  // (ex: 1463158). Confirmado pelo HAR do browser real.
  // ══════════════════════════════════════════════════════════

  private async fetchAvailableDownloads(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
  ): Promise<Array<{
    nomeArquivo: string;
    hashDownload: string;
    situacaoDownload: string;
    itens: Array<{ idProcesso: number; numeroProcesso: string }>;
  }>> {
    try {
      const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');

      // CRÍTICO: usar idUsuario (do currentUser), NÃO idUsuarioLocalizacao
      const userId = stored.idUsuario || stored.idUsuarioLocalizacao;
      const url = `${PJE_REST_BASE}/pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis?idUsuario=${userId}&sistemaOrigem=PRIMEIRA_INSTANCIA`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.buildHeaders(stored),
          'Cookie': cookieStr,
        },
      });

      if (!res.ok) {
        console.warn(`[PJE-WORKER] recuperarDownloadsDisponiveis retornou ${res.status}`);
        return [];
      }

      const data = await res.json() as any;
      return data?.downloadsDisponiveis || [];
    } catch (err) {
      console.warn(`[PJE-WORKER] Erro ao buscar downloads disponíveis:`, err);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════
  // GERAR URL DE DOWNLOAD S3
  // Endpoint: GET /pjedocs-api/v2/repositorio/gerar-url-download
  // ══════════════════════════════════════════════════════════

  private async generateS3DownloadUrl(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    hashDownload: string,
  ): Promise<string | null> {
    try {
      const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');

      const url = `${PJE_REST_BASE}/pjedocs-api/v2/repositorio/gerar-url-download?hashDownload=${encodeURIComponent(hashDownload)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.buildHeaders(stored),
          'Cookie': cookieStr,
        },
      });

      if (!res.ok) return null;

      const s3Url = await res.text();
      return s3Url ? s3Url.replace(/^"|"$/g, '').trim() : null;
    } catch {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // LISTAR PROCESSOS POR TAREFA
  // ══════════════════════════════════════════════════════════

  private async listProcessesByTask(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    taskName: string,
    isFavorite: boolean,
  ): Promise<Array<{ idProcesso: number; numeroProcesso: string; idTaskInstance?: number }>> {
    try {
      const encodedName = encodeURIComponent(taskName);
      const endpoint = `painelUsuario/recuperarProcessosTarefaPendenteComCriterios/${encodedName}/${isFavorite}`;

      const body = {
        numeroProcesso: '',
        classe: null,
        tags: [],
        tagsString: null,
        poloAtivo: null,
        poloPassivo: null,
        orgao: null,
        ordem: null,
        page: 0,
        maxResults: 500,
        idTaskInstance: null,
        apelidoSessao: null,
        idTipoSessao: null,
        dataSessao: null,
        somenteFavoritas: null,
        objeto: null,
        semEtiqueta: null,
        assunto: null,
        dataAutuacao: null,
        nomeParte: null,
        nomeFiltro: null,
        numeroDocumento: null,
        competencia: '',
        relator: null,
        orgaoJulgador: null,
        somenteLembrete: null,
        somenteSigiloso: null,
        somenteLiminar: null,
        eleicao: null,
        estado: null,
        municipio: null,
        prioridadeProcesso: null,
        cpfCnpj: null,
        porEtiqueta: null,
        conferidos: null,
        orgaoJulgadorColegiado: null,
        naoLidos: null,
        tipoProcessoDocumento: null,
      };

      console.log(`[PJE-WORKER] Listando processos da tarefa "${taskName}" (favorita=${isFavorite})`);

      const result = await this.apiPost<any>(stored, endpoint, body);
      const entities = result?.entities || (Array.isArray(result) ? result : []);
      const total = result?.count ?? entities.length;

      console.log(`[PJE-WORKER] Tarefa "${taskName}": ${entities.length} processos retornados (total: ${total})`);

      const processos = entities.map((p: any) => ({
        idProcesso: p.idProcesso || 0,
        numeroProcesso: p.numeroProcesso || '',
        idTaskInstance: p.idTaskInstance,
      })).filter((p: any) => p.numeroProcesso);

      // Paginação
      if (total > 500 && entities.length >= 500) {
        let offset = 500;
        while (offset < total) {
          const nextBody = { ...body, page: offset };
          const nextResult = await this.apiPost<any>(stored, endpoint, nextBody);
          const nextEntities = nextResult?.entities || (Array.isArray(nextResult) ? nextResult : []);

          for (const p of nextEntities) {
            if (p.numeroProcesso) {
              processos.push({
                idProcesso: p.idProcesso || 0,
                numeroProcesso: p.numeroProcesso,
                idTaskInstance: p.idTaskInstance,
              });
            }
          }

          if (nextEntities.length < 500) break;
          offset += 500;
          await this.sleep(500);
        }
      }

      return processos;
    } catch (err) {
      console.error(`[PJE-WORKER] Erro ao listar processos da tarefa "${taskName}":`, err);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════
  // LISTAR PROCESSOS POR ETIQUETA
  // ══════════════════════════════════════════════════════════

  private async listProcessesByTag(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    tagId: number,
  ): Promise<Array<{ idProcesso: number; numeroProcesso: string }>> {
    try {
      const totalStr = await this.apiGet<string>(stored, `painelUsuario/etiquetas/${tagId}/processos/total`);
      const total = parseInt(String(totalStr), 10) || 0;

      console.log(`[PJE-WORKER] Etiqueta ${tagId}: ${total} processos`);

      if (total === 0) return [];

      const processos: Array<{ idProcesso: number; numeroProcesso: string }> = [];
      let offset = 0;

      while (offset < total) {
        const result = await this.apiGet<any[]>(
          stored,
          `painelUsuario/etiquetas/${tagId}/processos?limit=500&offset=${offset}`
        );

        const entities = Array.isArray(result) ? result : [];
        for (const p of entities) {
          if (p.numeroProcesso) {
            processos.push({
              idProcesso: p.idProcesso || 0,
              numeroProcesso: p.numeroProcesso,
            });
          }
        }

        if (entities.length < 500) break;
        offset += 500;
        await this.sleep(500);
      }

      return processos;
    } catch (err) {
      console.error(`[PJE-WORKER] Erro ao listar processos da etiqueta ${tagId}:`, err);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════
  // DOWNLOAD DO ARQUIVO S3
  // ══════════════════════════════════════════════════════════

  private async downloadFromS3(url: string, numeroProcesso: string): Promise<PJEDownloadedFile> {
    const fileName = `${numeroProcesso}-processo.pdf`;
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    const res = await fetch(url, { method: 'GET', redirect: 'follow' });

    if (!res.ok) {
      throw new Error(`Falha ao baixar de S3: HTTP ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return {
      processNumber: numeroProcesso,
      fileName,
      filePath,
      fileSize: buffer.length,
      downloadedAt: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

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
    this.service.setProgress(jobId, {
      jobId, status, progress, totalProcesses, successCount,
      failureCount, currentProcess, files, errors, message,
      timestamp: Date.now(),
    });
  }

  private async failJob(jobId: string, message: string): Promise<void> {
    console.error(`[PJE-WORKER] Job ${jobId.slice(0, 8)} falhou: ${message}`);
    await this.repository.updateJob({
      id: jobId, status: 'failed', completedAt: new Date(),
      errors: [{ message, code: 'WORKER_ERROR', timestamp: new Date().toISOString() }],
    });
    await this.updateStatus(jobId, 'failed', 0, message);
  }

  private buildHeaders(stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string }): Record<string, string> {
    const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': PJE_LEGACY_APP,
      'Origin': PJE_FRONTEND_ORIGIN,
      'Referer': `${PJE_FRONTEND_ORIGIN}/`,
      'X-pje-cookies': cookieStr,
      'X-pje-usuario-localizacao': stored.idUsuarioLocalizacao,
    };
  }

  private async apiGet<T>(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    endpoint: string,
  ): Promise<T> {
    const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'GET',
      headers: { ...this.buildHeaders(stored), 'Cookie': cookieStr },
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private async apiPost<T>(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: string },
    endpoint: string,
    body: any,
  ): Promise<T> {
    const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { ...this.buildHeaders(stored), 'Cookie': cookieStr },
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
