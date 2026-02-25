// ============================================================
// apps/worker/src/services/pje-client/task-service.ts
// Task Service — tarefas e processos do painel PJE
//
// Correções v8:
//  - Paginação usa offset correto (0, 500, 1000...)
//  - getAllTaskProcesses retorna processos sem duplicatas
//  - Log de progresso durante paginação
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

  /**
   * CORREÇÃO v8: Paginação robusta para listas > 500 processos.
   *
   * A API PJE espera "page" como offset (0, 500, 1000...).
   * Usa Set para evitar duplicatas por idProcesso.
   * Limite de segurança de 10000 processos.
   *
   * @param taskName - Nome da tarefa
   * @param isFavorite - false = "Todas as Tarefas", true = "Minhas Tarefas"
   */
  async *getAllTaskProcesses(
    taskName: string,
    isFavorite: boolean
  ): AsyncGenerator<PJEProcess[], void, unknown> {
    const pageSize = config.pje.defaultPageSize;
    const MAX_TOTAL = 10000; // Limite de segurança
    let offset = 0;
    let total: number | null = null;
    const seenIds = new Set<number>();
    let pageNum = 0;

    const tipoLista = isFavorite ? 'favoritas' : 'todas';

    while (total === null || offset < Math.min(total, MAX_TOTAL)) {
      pageNum++;
      const result = await this.listTaskProcesses(taskName, isFavorite, offset, pageSize);

      if (total === null) {
        total = result.count;
        console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): total reportado = ${total}`);
      }

      if (result.entities.length === 0) {
        console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): página ${pageNum} vazia, encerrando`);
        break;
      }

      // Filtrar duplicatas
      const novos = result.entities.filter((p) => {
        if (seenIds.has(p.idProcesso)) return false;
        seenIds.add(p.idProcesso);
        return true;
      });

      console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): página ${pageNum} (offset=${offset}) → ${result.entities.length} retornados, ${novos.length} novos, total coletado: ${seenIds.size}`);

      if (novos.length > 0) {
        yield novos;
      }

      // Se não houve novos, API pode estar retornando duplicatas
      if (novos.length === 0) {
        console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): nenhum processo novo na página ${pageNum}, encerrando`);
        break;
      }

      // Se retornou menos que pageSize, é a última página
      if (result.entities.length < pageSize) {
        console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): última página (${result.entities.length} < ${pageSize})`);
        break;
      }

      offset += pageSize;
      await sleep(config.pje.requestDelay);
    }

    console.log(`[TASK-SVC] Tarefa "${taskName}" (${tipoLista}): TOTAL FINAL = ${seenIds.size} processos`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
