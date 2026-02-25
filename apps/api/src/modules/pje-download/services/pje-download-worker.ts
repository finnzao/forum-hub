// ============================================================
// apps/api/src/modules/pje-download/services/pje-download-worker.ts
// Worker in-process — processa jobs de download do PJE
//
// Endpoints corretos conforme documentação PJE:
//  - POST /painelUsuario/recuperarProcessosTarefaPendenteComCriterios/{nome}/{isFav}
//  - GET  /painelUsuario/etiquetas/{id}/processos?limit=500&offset=0
//  - GET  /painelUsuario/gerarChaveAcessoProcesso/{idProcesso}
//  - GET  /pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis
//  - GET  /pjedocs-api/v2/repositorio/gerar-url-download?hashDownload=...
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
const POLL_INTERVAL = 3000;           // Verificar novos jobs a cada 3s
const DOWNLOAD_DELAY = 2000;          // Delay entre downloads individuais
const DOWNLOAD_POLL_INTERVAL = 10000; // Verificar área de downloads a cada 10s
const DOWNLOAD_TIMEOUT = 300000;      // 5 min timeout para download ficar disponível
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

export class PJEDownloadWorker {
  private running = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private processingJobs = new Set<string>();

  constructor(
    private service: PJEDownloadService,
    private repository: IPJEDownloadRepository,
  ) {
    // Criar diretório de downloads
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

      // Pegar sessão atualizada para as chamadas REST
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
          // Para by_number, já temos os números — preciso buscar idProcesso de cada
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

      // ── 4. Baixar cada processo ────────────────────────────
      const files: PJEDownloadedFile[] = [];
      const errors: PJEDownloadErrorType[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < processos.length; i++) {
        if (this.service.isCancelled(jobId)) {
          console.log(`[PJE-WORKER] Job ${shortId} cancelado no processo ${i + 1}/${total}`);
          break;
        }

        const proc = processos[i];
        const progressPct = 15 + Math.round((i / total) * 80);

        await this.updateStatus(
          jobId, 'downloading', progressPct,
          `Baixando ${i + 1}/${total}: ${proc.numeroProcesso}`,
          proc.numeroProcesso, total, successCount, failureCount, files, errors,
        );

        try {
          const result = await this.downloadSingleProcess(stored, proc);

          if (result.success && result.file) {
            files.push(result.file);
            successCount++;
            console.log(`[PJE-WORKER] Job ${shortId} ✓ ${proc.numeroProcesso}`);
          } else {
            failureCount++;
            errors.push({
              processNumber: proc.numeroProcesso,
              message: result.error || 'Erro desconhecido ao baixar',
              code: 'DOWNLOAD_FAILED',
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

        // Delay entre downloads
        if (i < processos.length - 1) {
          await this.sleep(DOWNLOAD_DELAY);
        }
      }

      // ── 5. Finalizar ──────────────────────────────────────
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
  // LISTAR PROCESSOS POR TAREFA
  // Endpoint: POST /painelUsuario/recuperarProcessosTarefaPendenteComCriterios/{nome}/{isFav}
  // ══════════════════════════════════════════════════════════

  private async listProcessesByTask(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
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

      // Resposta esperada: { count: N, entities: [...] }
      const entities = result?.entities || (Array.isArray(result) ? result : []);
      const total = result?.count ?? entities.length;

      console.log(`[PJE-WORKER] Tarefa "${taskName}": ${entities.length} processos retornados (total: ${total})`);

      const processos = entities.map((p: any) => ({
        idProcesso: p.idProcesso || 0,
        numeroProcesso: p.numeroProcesso || '',
        idTaskInstance: p.idTaskInstance,
      })).filter((p: any) => p.numeroProcesso);

      // Se há mais processos, buscar páginas adicionais
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
  // Endpoint: GET /painelUsuario/etiquetas/{id}/processos?limit=500&offset=0
  // ══════════════════════════════════════════════════════════

  private async listProcessesByTag(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
    tagId: number,
  ): Promise<Array<{ idProcesso: number; numeroProcesso: string }>> {
    try {
      // 1. Obter total
      const totalStr = await this.apiGet<string>(stored, `painelUsuario/etiquetas/${tagId}/processos/total`);
      const total = parseInt(String(totalStr), 10) || 0;

      console.log(`[PJE-WORKER] Etiqueta ${tagId}: ${total} processos`);

      if (total === 0) return [];

      // 2. Buscar processos paginados
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
  // DOWNLOAD DE UM ÚNICO PROCESSO
  // Fluxo: gerarChaveAcesso → listAutosDigitais → solicitar download
  //        → poll área de downloads → gerar URL S3 → baixar arquivo
  // ══════════════════════════════════════════════════════════

  private async downloadSingleProcess(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
    proc: { idProcesso: number; numeroProcesso: string; idTaskInstance?: number },
  ): Promise<{ success: boolean; file?: PJEDownloadedFile; error?: string }> {
    try {
      const { idProcesso, numeroProcesso, idTaskInstance } = proc;

      if (!idProcesso) {
        return { success: false, error: `idProcesso não disponível para ${numeroProcesso}` };
      }

      // 1. Gerar chave de acesso (ca)
      const ca = await this.apiGet<string>(
        stored,
        `painelUsuario/gerarChaveAcessoProcesso/${idProcesso}`
      );

      if (!ca || typeof ca !== 'string' || ca.length < 10) {
        return { success: false, error: `Chave de acesso inválida para ${numeroProcesso}` };
      }

      // Limpar aspas da resposta (vem como texto plano com aspas)
      const cleanCa = ca.replace(/^"|"$/g, '');

      // 2. Abrir página de autos digitais
      const autosUrl = `${PJE_BASE}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=${idProcesso}&ca=${cleanCa}${idTaskInstance ? `&idTaskInstance=${idTaskInstance}` : ''}`;

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

      // 3. Extrair ViewState e ID do botão de download
      const viewStateMatch = autosHtml.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
      const viewState = viewStateMatch?.[1];

      if (!viewState) {
        return { success: false, error: `ViewState não encontrado para ${numeroProcesso}` };
      }

      // O botão de download tem ID no padrão navbar:j_id{N}
      const btnMatch = autosHtml.match(/id="(navbar:j_id\d+)"[^>]*(?:download|Download|Baixar|baixar)/i)
        || autosHtml.match(/(navbar:j_id\d+)(?="[^>]*>[\s\S]{0,50}?(?:download|gerar|zip))/i)
        || autosHtml.match(/(navbar:j_id\d+)/g);

      let downloadBtnId = '';
      if (btnMatch) {
        // Se pegou array de matches, usar o último (geralmente o botão de download está no final do navbar)
        const candidates = Array.isArray(btnMatch) ? btnMatch : [btnMatch[1]];
        downloadBtnId = candidates[candidates.length - 1];
      }

      if (!downloadBtnId) {
        return { success: false, error: `Botão de download não encontrado para ${numeroProcesso}` };
      }

      // 4. POST AJAX para solicitar download
      const postBody = new URLSearchParams({
        'AJAXREQUEST': '_viewRoot',
        'navbar:cbTipoDocumento': '0',
        'navbar:idDe': '',
        'navbar:idAte': '',
        'navbar:dtInicioInputDate': '',
        'navbar:dtInicioInputCurrentDate': new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        'navbar:dtFimInputDate': '',
        'navbar:dtFimInputCurrentDate': new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
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

      const downloadHtml = await downloadRes.text();

      // 5. Verificar resposta
      // a) URL S3 imediata
      const s3UrlMatch = downloadHtml.match(/window\.open\('(https:\/\/[^']+\.pdf[^']*)'/);
      if (s3UrlMatch) {
        const file = await this.downloadFromS3(s3UrlMatch[1], numeroProcesso);
        return { success: true, file };
      }

      // b) "será disponibilizado" ou "está sendo gerado" — poll área de downloads
      if (downloadHtml.includes('será disponibilizado') || downloadHtml.includes('está sendo gerado')) {
        console.log(`[PJE-WORKER] ${numeroProcesso}: aguardando disponibilização...`);

        const file = await this.waitForDownload(stored, numeroProcesso, idProcesso);
        if (file) {
          return { success: true, file };
        }
        return { success: false, error: `Timeout aguardando download de ${numeroProcesso}` };
      }

      // c) Erro ou resposta inesperada
      if (downloadHtml.includes('error') || downloadHtml.includes('Erro')) {
        return { success: false, error: `Erro ao solicitar download de ${numeroProcesso}` };
      }

      // Se não identificou o tipo de resposta, tentar poll mesmo assim
      console.log(`[PJE-WORKER] ${numeroProcesso}: resposta não identificada, tentando poll...`);
      const file = await this.waitForDownload(stored, numeroProcesso, idProcesso);
      if (file) {
        return { success: true, file };
      }

      return { success: false, error: `Download não disponível para ${numeroProcesso}` };

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao baixar processo',
      };
    }
  }

  // ══════════════════════════════════════════════════════════
  // AGUARDAR DOWNLOAD NA ÁREA DE DOWNLOADS
  // Endpoint: GET /pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis
  // ══════════════════════════════════════════════════════════

  private async waitForDownload(
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
    numeroProcesso: string,
    idProcesso: number,
  ): Promise<PJEDownloadedFile | null> {
    const startTime = Date.now();
    const digits = numeroProcesso.replace(/\D/g, '');

    while (Date.now() - startTime < DOWNLOAD_TIMEOUT) {
      await this.sleep(DOWNLOAD_POLL_INTERVAL);

      try {
        // Buscar downloads disponíveis
        // O endpoint usa query params, não o REST base
        const cookieStr = Object.entries(stored.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
        const res = await fetch(
          `${PJE_REST_BASE}/pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis?idUsuario=${stored.idUsuarioLocalizacao}&sistemaOrigem=PRIMEIRA_INSTANCIA`,
          {
            method: 'GET',
            headers: {
              ...this.buildHeaders(stored),
              'Cookie': cookieStr,
            },
          }
        );

        if (!res.ok) continue;

        const data = await res.json() as any;
        const downloads = data?.downloadsDisponiveis || [];

        // Procurar pelo download do nosso processo
        for (const dl of downloads) {
          if (dl.situacaoDownload !== 'DISPONIVEL') continue;

          // Verificar se é do processo que queremos (comparar dígitos)
          const nomeArquivo = dl.nomeArquivo || '';
          const dlDigits = nomeArquivo.replace(/\D/g, '');

          const isMatch = dlDigits.includes(digits) ||
            (dl.itens || []).some((item: any) =>
              item.idProcesso === idProcesso ||
              item.numeroProcesso === numeroProcesso
            );

          if (isMatch && dl.hashDownload) {
            // Gerar URL de download S3
            const urlRes = await fetch(
              `${PJE_REST_BASE}/pjedocs-api/v2/repositorio/gerar-url-download?hashDownload=${encodeURIComponent(dl.hashDownload)}`,
              {
                method: 'GET',
                headers: {
                  ...this.buildHeaders(stored),
                  'Cookie': cookieStr,
                },
              }
            );

            if (urlRes.ok) {
              const s3Url = (await urlRes.text()).replace(/^"|"$/g, '');
              return await this.downloadFromS3(s3Url, numeroProcesso);
            }
          }
        }
      } catch {
        // Continuar tentando
      }
    }

    return null;
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

  private buildHeaders(stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string }): Record<string, string> {
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
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
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
    stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string },
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
