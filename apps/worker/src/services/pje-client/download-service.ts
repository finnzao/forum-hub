// ============================================================
// apps/worker/src/services/pje-client/download-service.ts
// Download Service — gera chaves, solicita e baixa PDFs
//
// Correções v7:
//  - situacaoDownload: aceita 'S' (valor real da API) além de 'DISPONIVEL'
//  - idUsuario no recuperarDownloadsDisponiveis usa session.idUsuario
//    (que corresponde ao campo idUsuario do currentUser, NÃO 
//    idUsuarioLocalizacaoMagistradoServidor — confirmado via HAR)
//  - Extração do botão de download mais robusta
//  - Polling com backoff progressivo
//  - Suporte a resposta HTML completa (não apenas snippet AJAX)
// ============================================================

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PJEHttpClient } from './http-client';
import { config } from '../../config';

// Status que indicam download disponível na API do PJE
const DOWNLOAD_AVAILABLE_STATUSES = ['S', 'DISPONIVEL', 'AVAILABLE'];

export interface DownloadRequest {
  idProcesso: number;
  numeroProcesso: string;
  ca?: string;
  idTaskInstance?: number;
  documentType?: number;
}

export interface DownloadResult {
  success: boolean;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

interface AvailableDownload {
  nomeArquivo: string;
  hashDownload: string;
  situacaoDownload: string;
  itens: Array<{ numeroProcesso: string; idProcesso: number }>;
}

export class DownloadService {
  constructor(private http: PJEHttpClient) {}

  async downloadProcess(
    request: DownloadRequest,
    outputDir: string
  ): Promise<DownloadResult> {
    const { idProcesso, numeroProcesso, documentType } = request;

    try {
      const ca = request.ca || await this.generateAccessKey(idProcesso);
      if (!ca) {
        return { success: false, error: 'Falha ao gerar chave de acesso.' };
      }

      const params: Record<string, string> = {
        idProcesso: String(idProcesso),
        ca,
      };
      if (request.idTaskInstance) {
        params.idTaskInstance = String(request.idTaskInstance);
      }

      const autosHtml = await this.http.webGet(
        '/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam',
        params
      );

      const viewState = this.extractViewState(autosHtml);
      const downloadBtnId = this.extractDownloadButton(autosHtml);

      if (!viewState || !downloadBtnId) {
        return { success: false, error: 'Não encontrou botão de download na página de autos.' };
      }

      const now = new Date();
      const currentDate = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const body = new URLSearchParams({
        AJAXREQUEST: '_viewRoot',
        'navbar:cbTipoDocumento': String(documentType ?? 0),
        'navbar:idDe': '',
        'navbar:idAte': '',
        'navbar:dtInicioInputDate': '',
        'navbar:dtInicioInputCurrentDate': currentDate,
        'navbar:dtFimInputDate': '',
        'navbar:dtFimInputCurrentDate': currentDate,
        'navbar:cbCronologia': 'DESC',
        '': 'on',
        navbar: 'navbar',
        autoScroll: '',
        'javax.faces.ViewState': viewState,
        [downloadBtnId]: downloadBtnId,
        'AJAX:EVENTS_COUNT': '1',
      });

      const responseHtml = await this.http.webPostAjax(
        '/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam',
        body
      );

      // Caso A: URL S3 imediata
      const s3Url = this.extractS3Url(responseHtml);
      if (s3Url) {
        return await this.downloadFromUrl(s3Url, numeroProcesso, outputDir);
      }

      // Caso B/C: Download na fila — polling
      if (
        responseHtml.includes('será disponibilizado') ||
        responseHtml.includes('será gerado') ||
        responseHtml.includes('está sendo gerado') ||
        responseHtml.includes('Área de download') ||
        // window.open('') com URL vazia = download assíncrono
        /window\.open\(''\)/.test(responseHtml) ||
        // Resposta HTML muito grande = página completa com mensagem de fila
        responseHtml.length > 5000
      ) {
        return await this.pollForDownload(idProcesso, numeroProcesso, outputDir);
      }

      return { success: false, error: 'Resposta inesperada ao solicitar download.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  }

  async generateAccessKey(idProcesso: number): Promise<string | null> {
    try {
      const ca = await this.http.apiGet<string>(
        `painelUsuario/gerarChaveAcessoProcesso/${idProcesso}`
      );
      return typeof ca === 'string' ? ca.replace(/"/g, '') : null;
    } catch {
      return null;
    }
  }

  async listAvailableDownloads(idUsuario: string): Promise<AvailableDownload[]> {
    try {
      // NOTA CRÍTICA (v7): o endpoint espera o campo idUsuario do currentUser
      // (ex: 14552753), NÃO idUsuarioLocalizacaoMagistradoServidor (ex: 1463158)
      const result = await this.http.apiGet<{ downloadsDisponiveis: AvailableDownload[] }>(
        `pjedocs-api/v1/downloadService/recuperarDownloadsDisponiveis?idUsuario=${idUsuario}&sistemaOrigem=PRIMEIRA_INSTANCIA`
      );
      return result.downloadsDisponiveis || [];
    } catch {
      return [];
    }
  }

  async generateS3Url(hashDownload: string): Promise<string | null> {
    try {
      const url = await this.http.apiGet<string>(
        `pjedocs-api/v2/repositorio/gerar-url-download?hashDownload=${encodeURIComponent(hashDownload)}`
      );
      return typeof url === 'string' ? url.replace(/"/g, '').trim() : null;
    } catch {
      return null;
    }
  }

  // ── Polling para downloads assíncronos ─────────────────

  private async pollForDownload(
    idProcesso: number,
    numeroProcesso: string,
    outputDir: string
  ): Promise<DownloadResult> {
    const timeout = config.pje.downloadTimeout;
    const baseInterval = config.pje.downloadPollInterval;
    const startTime = Date.now();
    const digitsOnly = numeroProcesso.replace(/\D/g, '');

    // Aguardar um tempo inicial antes do primeiro poll
    await sleep(5000);

    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
      pollCount++;

      const session = this.http.getSession();
      if (!session) break;

      // Usar idUsuario (NÃO idUsuarioLocalizacao) como parâmetro idUsuario
      const downloads = await this.listAvailableDownloads(session.idUsuario || session.idUsuarioLocalizacao);

      const match = downloads.find((d) => {
        // Verificar status — PJE usa 'S' para disponível
        const status = (d.situacaoDownload || '').toUpperCase();
        if (!DOWNLOAD_AVAILABLE_STATUSES.includes(status)) return false;

        // Match por itens
        const matchByItem = d.itens?.some(
          (item) =>
            item.idProcesso === idProcesso ||
            item.numeroProcesso === numeroProcesso
        );
        if (matchByItem) return true;

        // Match pelo nome do arquivo (contém dígitos do processo)
        const fileDigits = d.nomeArquivo.replace(/\D/g, '');
        return fileDigits.includes(digitsOnly);
      });

      if (match) {
        const s3Url = await this.generateS3Url(match.hashDownload);
        if (s3Url) {
          return await this.downloadFromUrl(s3Url, numeroProcesso, outputDir);
        }
      }

      // Backoff progressivo: 10s, 12.5s, 15s, ..., max 30s
      const delay = Math.min(baseInterval + (pollCount * 2500), 30000);
      await sleep(delay);
    }

    return {
      success: false,
      error: `Timeout aguardando download do processo ${numeroProcesso} (${timeout / 1000}s).`,
    };
  }

  // ── Download de arquivo ────────────────────────────────

  private async downloadFromUrl(
    url: string,
    numeroProcesso: string,
    outputDir: string
  ): Promise<DownloadResult> {
    try {
      await mkdir(outputDir, { recursive: true });

      const buffer = await this.http.downloadFile(url);
      const sanitizedNumber = numeroProcesso.replace(/[^0-9.-]/g, '');
      const fileName = `${sanitizedNumber}-processo.pdf`;
      const filePath = join(outputDir, fileName);

      await writeFile(filePath, buffer);

      return {
        success: true,
        fileName,
        filePath,
        fileSize: buffer.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar arquivo';
      return { success: false, error: message };
    }
  }

  // ── Helpers ────────────────────────────────────────────

  private extractViewState(html: string): string | null {
    const match = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
    return match?.[1] || null;
  }

  private extractDownloadButton(html: string): string | null {
    // Estratégia 1: buscar botão com texto "Download" e ID navbar:j_idN
    const specificPatterns = [
      /id="(navbar:j_id\d+)"[^>]*value="Download"/i,
      /value="Download"[^>]*id="(navbar:j_id\d+)"/i,
      /(navbar:j_id\d+)[^}]*'parameters'[^}]*\}[^<]*?Download/i,
      /(navbar:j_id\d+)(?='[^}]*oncomplete[^}]*window\.open)/i,
    ];

    for (const pattern of specificPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }

    // Estratégia 2: todos os navbar:j_idN com contexto de download
    const allBtns: string[] = [];
    const regex = /(navbar:j_id\d+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!allBtns.includes(match[1])) {
        allBtns.push(match[1]);
      }
    }

    // Filtrar por contexto
    const withDownloadContext = allBtns.filter(id => {
      const pos = html.indexOf(id);
      const context = html.substring(Math.max(0, pos - 200), Math.min(html.length, pos + 500));
      return /download|baixar|gerar/i.test(context);
    });

    if (withDownloadContext.length > 0) {
      return withDownloadContext[withDownloadContext.length - 1];
    }

    // Fallback: último navbar:j_idN
    return allBtns.length > 0 ? allBtns[allBtns.length - 1] : null;
  }

  private extractS3Url(html: string): string | null {
    const patterns = [
      /window\.open\('(https:\/\/[^']*s3[^']*\.pdf[^']*?)'/,
      /window\.open\("(https:\/\/[^"]*s3[^"]*\.pdf[^"]*?)"/,
      /(https:\/\/pje-bucket\.s3[^\s'"<]+)/,
      /(https:\/\/tjba-pjedocs[^\s'"<]+\.pdf[^\s'"<]*)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1].length > 10) return match[1];
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
