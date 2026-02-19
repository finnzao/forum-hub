// ============================================================
// apps/worker/src/services/pje-client/download-service.ts
// Download Service — gera chaves, solicita e baixa PDFs
// ============================================================

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PJEHttpClient } from './http-client';
import { config } from '../../config';

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
        responseHtml.includes('está sendo gerado')
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

  async listAvailableDownloads(idUsuario: number): Promise<AvailableDownload[]> {
    try {
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
        `pjedocs-api/v2/repositorio/gerar-url-download?hashDownload=${hashDownload}`
      );
      return typeof url === 'string' ? url.replace(/"/g, '') : null;
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
    const interval = config.pje.downloadPollInterval;
    const startTime = Date.now();
    const digitsOnly = numeroProcesso.replace(/\D/g, '');

    while (Date.now() - startTime < timeout) {
      await sleep(interval);

      const session = this.http.getSession();
      if (!session) break;

      const downloads = await this.listAvailableDownloads(session.idUsuario);

      const match = downloads.find((d) => {
        if (d.situacaoDownload !== 'DISPONIVEL') return false;
        return d.itens?.some(
          (item) =>
            item.idProcesso === idProcesso ||
            item.numeroProcesso === numeroProcesso
        ) || d.nomeArquivo.includes(digitsOnly);
      });

      if (match) {
        const s3Url = await this.generateS3Url(match.hashDownload);
        if (s3Url) {
          return await this.downloadFromUrl(s3Url, numeroProcesso, outputDir);
        }
      }
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
    const match = html.match(/navbar:j_id(\d+)/);
    return match?.[0] || null;
  }

  private extractS3Url(html: string): string | null {
    const patterns = [
      /window\.open\('(https:\/\/[^']*s3[^']*\.pdf[^']*?)'/,
      /window\.open\("(https:\/\/[^"]*s3[^"]*\.pdf[^"]*?)"/,
      /(https:\/\/pje-bucket\.s3[^\s'"<]+)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
