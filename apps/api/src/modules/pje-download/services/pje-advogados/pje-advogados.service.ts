import type {
  ProcessoAdvogados, FiltroAdvogado,
  PlanilhaAdvogadosProgress, PlanilhaAdvogadosResult,
  GerarPlanilhaAdvogadosDTO,
} from 'shared';
import { PJEAuthProxy, sessionStore } from '../pje-auth-proxy.service';
import { extractAdvogadosFromHtml } from './html-advogados-parser';
import { gerarXlsx } from './xlsx-generator';
import {
  PJE_BASE, pjeApiGet, pjeApiPost,
  serializePjeCookies, type PjeSession,
} from '../../../../shared/pje-api-client';

const PAGE_SIZE = 500;
const DELAY_MS = 1500;

export class PjeAdvogadosService {
  private cancelledJobs = new Set<string>();
  private progressMap = new Map<string, PlanilhaAdvogadosProgress>();

  cancel(jobId: string): void { this.cancelledJobs.add(jobId); }
  isCancelled(jobId: string): boolean { return this.cancelledJobs.has(jobId); }
  getProgress(jobId: string): PlanilhaAdvogadosProgress | null { return this.progressMap.get(jobId) ?? null; }

  async gerar(jobId: string, userId: number, dto: GerarPlanilhaAdvogadosDTO): Promise<PlanilhaAdvogadosResult> {
    const errors: Array<{ processo: string; message: string }> = [];
    const emit = (p: PlanilhaAdvogadosProgress) => this.progressMap.set(jobId, p);

    try {
      const session = await this.resolveSession(dto);

      emit({ jobId, status: 'listing', progress: 5, totalProcesses: 0, processedCount: 0, message: 'Listando processos...', timestamp: Date.now() });

      const processos = await this.listProcesses(session, dto, jobId);
      if (this.isCancelled(jobId)) return this.cancelledResult(jobId, processos.length, errors);

      if (processos.length === 0) {
        emit({ jobId, status: 'completed', progress: 100, totalProcesses: 0, processedCount: 0, message: 'Nenhum processo encontrado.', timestamp: Date.now() });
        return { jobId, totalProcesses: 0, processedCount: 0, filteredCount: 0, errors };
      }

      emit({ jobId, status: 'extracting', progress: 10, totalProcesses: processos.length, processedCount: 0, message: `Extraindo advogados de ${processos.length} processos...`, timestamp: Date.now() });

      const resultados: ProcessoAdvogados[] = [];
      for (let i = 0; i < processos.length; i++) {
        if (this.isCancelled(jobId)) break;
        const proc = processos[i];
        const pct = 10 + Math.round((i / processos.length) * 75);
        emit({ jobId, status: 'extracting', progress: pct, totalProcesses: processos.length, processedCount: i, currentProcess: proc.numeroProcesso, message: `Extraindo ${i + 1}/${processos.length}: ${proc.numeroProcesso}`, timestamp: Date.now() });

        try {
          resultados.push(await this.extractAdvogados(session, proc));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push({ processo: proc.numeroProcesso, message: msg });
          resultados.push({ ...proc, advogadosPoloAtivo: [], advogadosPoloPassivo: [], erro: msg });
        }
        if (i < processos.length - 1) await sleep(DELAY_MS);
      }

      if (this.isCancelled(jobId)) return this.cancelledResult(jobId, processos.length, errors);

      const filtered = this.applyFilter(resultados, dto.filtro);
      emit({ jobId, status: 'generating', progress: 90, totalProcesses: processos.length, processedCount: processos.length, message: 'Gerando planilha...', timestamp: Date.now() });

      const { fileName, filePath } = await gerarXlsx(filtered, dto.filtro);
      emit({ jobId, status: 'completed', progress: 100, totalProcesses: processos.length, processedCount: processos.length, message: `Planilha gerada: ${filtered.length} processos.`, timestamp: Date.now() });

      return { jobId, totalProcesses: processos.length, processedCount: resultados.length, filteredCount: filtered.length, fileName, filePath, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar planilha';
      emit({ jobId, status: 'failed', progress: 0, totalProcesses: 0, processedCount: 0, message: msg, timestamp: Date.now() });
      throw err;
    } finally {
      this.cancelledJobs.delete(jobId);
    }
  }

  private async resolveSession(dto: GerarPlanilhaAdvogadosDTO): Promise<PjeSession> {
    if (dto.pjeSessionId) {
      const existing = sessionStore.get(dto.pjeSessionId);
      if (existing) return existing;
    }
    const proxy = new PJEAuthProxy();
    const loginResult = await proxy.login(dto.credentials.cpf, dto.credentials.password);
    if (loginResult.error || !loginResult.sessionId) throw new Error(loginResult.error || 'Falha na autenticação');
    if (dto.pjeProfileIndex !== undefined) await proxy.selectProfile(loginResult.sessionId, dto.pjeProfileIndex);
    const stored = sessionStore.get(loginResult.sessionId);
    if (!stored) throw new Error('Sessão não encontrada após login');
    return stored;
  }

  private async listProcesses(session: PjeSession, dto: GerarPlanilhaAdvogadosDTO, jobId: string): Promise<ProcessoAdvogados[]> {
    const processos: ProcessoAdvogados[] = [];
    const seenIds = new Set<number>();

    if (dto.fonte === 'by_task' && dto.taskName) {
      const encoded = encodeURIComponent(dto.taskName.trim());
      const endpoint = `painelUsuario/recuperarProcessosTarefaPendenteComCriterios/${encoded}/${dto.isFavorite === true}`;
      let offset = 0;
      while (true) {
        if (this.isCancelled(jobId)) break;
        const result = await pjeApiPost<any>(session, endpoint, { numeroProcesso: '', classe: null, tags: [], page: offset, maxResults: PAGE_SIZE, competencia: '' });
        const entities = result?.entities || (Array.isArray(result) ? result : []);
        if (entities.length === 0) break;
        for (const e of entities) { if (e.idProcesso && !seenIds.has(e.idProcesso)) { seenIds.add(e.idProcesso); processos.push(mapProcesso(e)); } }
        if (entities.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        await sleep(500);
      }
    } else if (dto.fonte === 'by_tag' && dto.tagId) {
      const totalStr = await pjeApiGet<string>(session, `painelUsuario/etiquetas/${dto.tagId}/processos/total`);
      const total = parseInt(String(totalStr), 10) || 0;
      let offset = 0;
      while (offset < total) {
        if (this.isCancelled(jobId)) break;
        const entities = await pjeApiGet<any[]>(session, `painelUsuario/etiquetas/${dto.tagId}/processos?limit=${PAGE_SIZE}&offset=${offset}`);
        const arr = Array.isArray(entities) ? entities : [];
        if (arr.length === 0) break;
        for (const e of arr) { if (e.idProcesso && !seenIds.has(e.idProcesso)) { seenIds.add(e.idProcesso); processos.push(mapProcesso(e)); } }
        if (arr.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        await sleep(500);
      }
    }
    return processos;
  }

  private async extractAdvogados(session: PjeSession, proc: ProcessoAdvogados): Promise<ProcessoAdvogados> {
    const caRaw = await pjeApiGet<string>(session, `painelUsuario/gerarChaveAcessoProcesso/${proc.idProcesso}`);
    const ca = (typeof caRaw === 'string' ? caRaw : '').replace(/^"|"$/g, '');
    if (!ca || ca.length < 10) throw new Error('Chave de acesso inválida');

    const url = `${PJE_BASE}/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=${proc.idProcesso}&ca=${ca}&aba=`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${PJE_BASE}/pje/Processo/ConsultaProcesso/listView.seam`,
        Cookie: serializePjeCookies(session.cookies),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    const { advogadosPoloAtivo, advogadosPoloPassivo } = extractAdvogadosFromHtml(await res.text());
    return { ...proc, advogadosPoloAtivo, advogadosPoloPassivo };
  }

  private applyFilter(processos: ProcessoAdvogados[], filtro?: FiltroAdvogado): ProcessoAdvogados[] {
    if (!filtro?.valor?.trim()) return processos;
    const termo = filtro.valor.trim().toUpperCase();
    return processos.filter((p) => {
      const all = [...p.advogadosPoloAtivo, ...p.advogadosPoloPassivo];
      return all.some((adv) => filtro.tipo === 'oab' ? adv.oab?.toUpperCase().includes(termo) ?? false : adv.nome.toUpperCase().includes(termo));
    });
  }

  private cancelledResult(jobId: string, total: number, errors: Array<{ processo: string; message: string }>): PlanilhaAdvogadosResult {
    return { jobId, totalProcesses: total, processedCount: 0, filteredCount: 0, errors };
  }
}

function mapProcesso(e: any): ProcessoAdvogados {
  return {
    idProcesso: e.idProcesso, numeroProcesso: e.numeroProcesso || '',
    poloAtivo: e.poloAtivo || '', poloPassivo: e.poloPassivo || '',
    classeJudicial: e.classeJudicial, assuntoPrincipal: e.assuntoPrincipal,
    orgaoJulgador: e.orgaoJulgador, advogadosPoloAtivo: [], advogadosPoloPassivo: [],
  };
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
