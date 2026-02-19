// ============================================================
// apps/worker/src/services/pje-client/task-service.ts
// Task Service — tarefas e processos do painel PJE
// ============================================================

import { PJEHttpClient } from './http-client';
import { config } from '../../config';

export interface PJETask {
  id: number;
  nome: string;
  quantidadePendente: number;
}

export interface PJEProcess {
  idProcesso: number;
  numeroProcesso: string;
  poloAtivo: string;
  poloPassivo: string;
  classeJudicial: string;
  orgaoJulgador: string;
  assuntoPrincipal?: string;
  sigiloso?: boolean;
  prioridade?: boolean;
  idTaskInstance?: number;
}

export interface PJETaskProcessesResult {
  count: number;
  entities: PJEProcess[];
}

export class TaskService {
  constructor(private http: PJEHttpClient) {}

  async listTasks(): Promise<PJETask[]> {
    return this.http.apiPost<PJETask[]>('painelUsuario/tarefas', {
      numeroProcesso: '',
      competencia: '',
      etiquetas: [],
    });
  }

  async listFavoriteTasks(): Promise<PJETask[]> {
    return this.http.apiPost<PJETask[]>('painelUsuario/tarefasFavoritas', {
      numeroProcesso: '',
      competencia: '',
      etiquetas: [],
    });
  }

  async listTaskProcesses(
    taskName: string,
    isFavorite: boolean,
    page = 0,
    maxResults = config.pje.defaultPageSize
  ): Promise<PJETaskProcessesResult> {
    const encodedName = encodeURIComponent(taskName);
    const endpoint = `painelUsuario/recuperarProcessosTarefaPendenteComCriterios/${encodedName}/${isFavorite}`;

    return this.http.apiPost<PJETaskProcessesResult>(endpoint, {
      numeroProcesso: '',
      classe: null,
      tags: [],
      tagsString: null,
      poloAtivo: null,
      poloPassivo: null,
      orgao: null,
      ordem: null,
      page,
      maxResults,
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
    });
  }

  async *getAllTaskProcesses(
    taskName: string,
    isFavorite: boolean
  ): AsyncGenerator<PJEProcess[], void, unknown> {
    const pageSize = config.pje.defaultPageSize;
    let offset = 0;
    let total: number | null = null;

    while (total === null || offset < total) {
      const result = await this.listTaskProcesses(taskName, isFavorite, offset, pageSize);
      total = result.count;

      if (result.entities.length === 0) break;

      yield result.entities;
      offset += pageSize;

      await sleep(config.pje.requestDelay);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
