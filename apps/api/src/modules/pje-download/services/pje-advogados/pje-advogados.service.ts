import type {
  ProcessoAdvogados,
  FiltroAdvogado,
  PlanilhaAdvogadosProgress,
  PlanilhaAdvogadosResult,
  GerarPlanilhaAdvogadosDTO,
} from 'shared';
import { PJEAuthProxy, sessionStore } from '../pje-auth-proxy.service';
import { extractAdvogadosFromHtml } from './html-advogados-parser';
import { gerarXlsx } from './xlsx-generator';

const PJE_BASE = 'https://pje.tjba.jus.br';
const PJE_REST_BASE = `${PJE_BASE}/pje/seam/resource/rest/pje-legacy`;
const PJE_FRONTEND_ORIGIN = 'https://frontend.cloud.pje.jus.br';
const PJE_LEGACY_APP = 'pje-tjba-1g';
const PAGE_SIZE = 500;
const DELAY_MS = 1500;

type ProgressCallback = (p: PlanilhaAdvogadosProgress) => void;

interface StoredSession {
  cookies: Record<string, string>;
  idUsuarioLocalizacao: string;
  idUsuario?: number;
}

export class PjeAdvogadosService {
  private cancelledJobs = new Set<string>();
  private progressMap = new Map<string, PlanilhaAdvogadosProgress>();

  cancel(jobId: string): void {
    this.cancelledJobs.add(jobId);
  }

  isCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  getProgress(jobId: string): PlanilhaAdvogadosProgress | null {
    return this.progressMap.get(jobId) ?? null;
  }

  async gerar(
    jobId: string,
    userId: number,
    dto: GerarPlanilhaAdvogadosDTO,
  ): Promise<PlanilhaAdvogadosResult> {
    const errors: Array<{ processo: string; message: string }> = [];
    const onProgress: ProgressCallback = (p) => this.progressMap.set(jobId, p);

    try {
      const stored = await this.resolveSession(dto);

      onProgress({
        jobId, status: 'listing', progress: 5, totalProcesses: 0,
        processedCount: 0, message: 'Listando processos...', timestamp: Date.now(),
      });

      const processos = await this.listProcesses(stored, dto, jobId);
      if (this.isCancelled(jobId)) return this.cancelledResult(jobId, processos.length, errors);

      if (processos.length === 0) {
        onProgress({
          jobId, status: 'completed', progress: 100, totalProcesses: 0,
          processedCount: 0, message: 'Nenhum processo encontrado.', timestamp: Date.now(),
        });
        return { jobId, totalProcesses: 0, processedCount: 0, filteredCount: 0, errors };
      }

      onProgress({
        jobId, status: 'extracting', progress: 10, totalProcesses: processos.length,
        processedCount: 0, message: `Extraindo advogados de ${processos.length} processos...`, timestamp: Date.now(),
      });

      const resultados: ProcessoAdvogados[] = [];

      for (let i = 0; i < processos.length; i++) {
        if (this.isCancelled(jobId)) break;

        const proc = processos[i];
        const pct = 10 + Math.round((i / processos.length) * 75);
        onProgress({
          jobId, status: 'extracting', progress: pct, totalProcesses: processos.length,
          processedCount: i, currentProcess: proc.numeroProcesso,
          message: `Extraindo ${i + 1}/${processos.length}: ${proc.numeroProcesso}`, timestamp: Date.now(),
        });

        try {
          const dados = await this.extractAdvogadosFromProcess(stored, proc);
          resultados.push(dados);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push({ processo: proc.numeroProcesso, message: msg });
          resultados.push({
            ...proc, advogadosPoloAtivo: [], advogadosPoloPassivo: [], erro: msg,
          });
        }

        if (i < processos.length - 1) await this.sleep(DELAY_MS);
      }

      if (this.isCancelled(jobId)) return this.cancelledResult(jobId, processos.length, errors);

      const filtered = this.applyFilter(resultados, dto.filtro);

      onProgress({
        jobId, status: 'generating', progress: 90, totalProcesses: processos.length,
        processedCount: processos.length, message: 'Gerando planilha...', timestamp: Date.now(),
      });

      const { fileName, filePath } = await gerarXlsx(filtered, dto.filtro);

      onProgress({
        jobId, status: 'completed', progress: 100, totalProcesses: processos.length,
        processedCount: processos.length,
        message: `Planilha gerada: ${filtered.length} processos.`, timestamp: Date.now(),
      });

      return {
        jobId, totalProcesses: processos.length, processedCount: resultados.length,
        filteredCount: filtered.length, fileName, filePath, errors,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar planilha';
      onProgress({
        jobId, status: 'failed', progress: 0, totalProcesses: 0,
        processedCount: 0, message: msg, timestamp: Date.now(),
      });
      throw err;
    } finally {
      this.cancelledJobs.delete(jobId);
    }
  }

  private async resolveSession(dto: GerarPlanilhaAdvogadosDTO): Promise<StoredSession> {
    if (dto.pjeSessionId) {
      const existing = sessionStore.get(dto.pjeSessionId);
      if (existing) return existing;
    }

    const proxy = new PJEAuthProxy();
    const loginResult = await proxy.login(dto.credentials.cpf, dto.credentials.password);
    if (loginResult.error || !loginResult.sessionId) {
      throw new Error(loginResult.error || 'Falha na autenticação');
    }

    if (dto.pjeProfileIndex !== undefined) {
      await proxy.selectProfile(loginResult.sessionId, dto.pjeProfileIndex);
    }

    const stored = sessionStore.get(loginResult.sessionId);
    if (!stored) throw new Error('Sessão não encontrada após login');
    return stored;
  }

  private async listProcesses(
    stored: StoredSession,
    dto: GerarPlanilhaAdvogadosDTO,
    jobId: string,
  ): Promise<Array<ProcessoAdvogados>> {
    const processos: ProcessoAdvogados[] = [];
    const seenIds = new Set<number>();

    if (dto.fonte === 'by_task' && dto.taskName) {
      const isFav = dto.isFavorite === true;
      const encoded = encodeURIComponent(dto.taskName.trim());
      const endpoint = `painelUsuario/recuperarProcessosTarefaPendenteComCriterios/${encoded}/${isFav}`;
      let offset = 0;

      while (true) {
        if (this.isCancelled(jobId)) break;
        const result = await this.apiPost<any>(stored, endpoint, {
          numeroProcesso: '', classe: null, tags: [], page: offset, maxResults: PAGE_SIZE, competencia: '',
        });
        const entities = result?.entities || (Array.isArray(result) ? result : []);
        if (entities.length === 0) break;

        for (const e of entities) {
          if (e.idProcesso && !seenIds.has(e.idProcesso)) {
            seenIds.add(e.idProcesso);
            processos.push(this.mapProcesso(e));
          }
        }

        if (entities.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        await this.sleep(500);
      }
    } else if (dto.fonte === 'by_tag' && dto.tagId) {
      let offset = 0;
      const totalStr = await this.apiGet<string>(stored, `painelUsuario/etiquetas/${dto.tagId}/processos/total`);
      const total = parseInt(String(totalStr), 10) || 0;

      while (offset < total) {
        if (this.isCancelled(jobId)) break;
        const entities = await this.apiGet<any[]>(stored,
          `painelUsuario/etiquetas/${dto.tagId}/processos?limit=${PAGE_SIZE}&offset=${offset}`);
        const arr = Array.isArray(entities) ? entities : [];
        if (arr.length === 0) break;

        for (const e of arr) {
          if (e.idProcesso && !seenIds.has(e.idProcesso)) {
            seenIds.add(e.idProcesso);
            processos.push(this.mapProcesso(e));
          }
        }

        if (arr.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        await this.sleep(500);
      }
    }

    return processos;
  }

  private mapProcesso(e: any): ProcessoAdvogados {
    return {
      idProcesso: e.idProcesso,
      numeroProcesso: e.numeroProcesso || '',
      poloAtivo: e.poloAtivo || '',
      poloPassivo: e.poloPassivo || '',
      classeJudicial: e.classeJudicial,
      assuntoPrincipal: e.assuntoPrincipal,
      orgaoJulgador: e.orgaoJulgador,
      advogadosPoloAtivo: [],
      advogadosPoloPassivo: [],
    };
  }

  private async extractAdvogadosFromProcess(
    stored: StoredSession,
    proc: ProcessoAdvogados,
  ): Promise<ProcessoAdvogados> {
    const caRaw = await this.apiGet<string>(stored,
      `painelUsuario/gerarChaveAcessoProcesso/${proc.idProcesso}`);
    const ca = (typeof caRaw === 'string' ? caRaw : '').replace(/^"|"$/g, '');
    if (!ca || ca.length < 10) throw new Error('Chave de acesso inválida');

    const url = `${PJE_BASE}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=${proc.idProcesso}&ca=${ca}&aba=`;
    const cookieStr = this.serializeCookies(stored.cookies);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${PJE_BASE}/pje/Processo/ConsultaProcesso/listView.seam`,
        Cookie: cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    const html = await res.text();
    const { advogadosPoloAtivo, advogadosPoloPassivo } = extractAdvogadosFromHtml(html);

    return { ...proc, advogadosPoloAtivo, advogadosPoloPassivo };
  }

  private applyFilter(processos: ProcessoAdvogados[], filtro?: FiltroAdvogado): ProcessoAdvogados[] {
    if (!filtro?.valor?.trim()) return processos;

    const termo = filtro.valor.trim().toUpperCase();

    return processos.filter((p) => {
      const todosAdvs = [...p.advogadosPoloAtivo, ...p.advogadosPoloPassivo];
      return todosAdvs.some((adv) => {
        if (filtro.tipo === 'oab') {
          return adv.oab?.toUpperCase().includes(termo) ?? false;
        }
        return adv.nome.toUpperCase().includes(termo);
      });
    });
  }

  private serializeCookies(cookies: Record<string, string>): string {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const [key, value] of Object.entries(cookies)) {
      const sepIdx = key.indexOf('::');
      const name = sepIdx > 0 ? key.slice(sepIdx + 2) : key;
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push(`${name}=${value}`);
      }
    }
    return result.join('; ');
  }

  private buildHeaders(stored: StoredSession): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': PJE_LEGACY_APP,
      Origin: PJE_FRONTEND_ORIGIN,
      Referer: `${PJE_FRONTEND_ORIGIN}/`,
      'X-pje-cookies': this.serializeCookies(stored.cookies),
      'X-pje-usuario-localizacao': stored.idUsuarioLocalizacao,
    };
  }

  private async apiGet<T>(stored: StoredSession, endpoint: string): Promise<T> {
    const cookieStr = this.serializeCookies(stored.cookies);
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'GET',
      headers: { ...this.buildHeaders(stored), Cookie: cookieStr },
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private async apiPost<T>(stored: StoredSession, endpoint: string, body: any): Promise<T> {
    const cookieStr = this.serializeCookies(stored.cookies);
    const res = await fetch(`${PJE_REST_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { ...this.buildHeaders(stored), Cookie: cookieStr },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private cancelledResult(
    jobId: string, total: number, errors: Array<{ processo: string; message: string }>,
  ): PlanilhaAdvogadosResult {
    return { jobId, totalProcesses: total, processedCount: 0, filteredCount: 0, errors };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
