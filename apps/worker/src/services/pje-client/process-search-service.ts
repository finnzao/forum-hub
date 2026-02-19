// ============================================================
// apps/worker/src/services/pje-client/process-search-service.ts
// Process Search — busca por número CNJ com estratégias em cascata
// ============================================================

import { PJEHttpClient } from './http-client';
import { TaskService } from './task-service';
import { config } from '../../config';

export interface ProcessSearchResult {
  idProcesso: number;
  numeroProcesso: string;
  ca?: string;
}

export class ProcessSearchService {
  constructor(
    private http: PJEHttpClient,
    private taskService: TaskService
  ) {}

  async findByNumber(rawNumber: string): Promise<ProcessSearchResult | null> {
    const numero = this.normalizeCNJ(rawNumber);

    const apiResult = await this.tryApiSearch(numero);
    if (apiResult) return apiResult;

    const panelResult = await this.tryPanelSearch(numero);
    if (panelResult) return panelResult;

    const directResult = await this.tryDirectSearch(numero);
    if (directResult) return directResult;

    return null;
  }

  // ── Estratégia 1: API REST ─────────────────────────────

  private async tryApiSearch(numero: string): Promise<ProcessSearchResult | null> {
    const getEndpoints = [
      `consultaProcessual/processo/${numero}`,
      `processo/numero/${numero}`,
      `processo/${numero}`,
      `processos/${numero}`,
      `consulta/processo/${numero}`,
      `api/processo/${numero}`,
      `api/processos/numero/${numero}`,
    ];

    const postEndpoints = [
      { endpoint: 'painelUsuario/processo', body: { numeroProcesso: numero } },
      { endpoint: 'painelUsuario/buscarProcessos', body: { numeroProcesso: numero, page: 0, maxResults: 10 } },
      { endpoint: 'consultaProcessual/pesquisar', body: { numeroProcesso: numero } },
      { endpoint: 'processo/pesquisar', body: { numeroProcesso: numero } },
      { endpoint: 'processo/buscar', body: { numeroProcesso: numero } },
      { endpoint: 'api/processo/buscar', body: { numeroProcesso: numero } },
    ];

    for (const endpoint of getEndpoints) {
      try {
        const result = await this.http.apiGet(endpoint);
        const parsed = this.parseSearchResult(result, numero);
        if (parsed) return parsed;
      } catch { /* continua */ }
    }

    for (const { endpoint, body } of postEndpoints) {
      try {
        const result = await this.http.apiPost(endpoint, body);
        const parsed = this.parseSearchResult(result, numero);
        if (parsed) return parsed;
      } catch { /* continua */ }
    }

    return null;
  }

  // ── Estratégia 2: Painel de Tarefas ────────────────────

  private async tryPanelSearch(numero: string): Promise<ProcessSearchResult | null> {
    try {
      const tasks = await this.taskService.listTasks();
      const favorites = await this.taskService.listFavoriteTasks();

      const searchTargets = [
        ...tasks.slice(0, 10).map((t) => ({ name: t.nome, fav: false })),
        ...favorites.slice(0, 5).map((t) => ({ name: t.nome, fav: true })),
      ];

      for (const target of searchTargets) {
        try {
          const encodedName = encodeURIComponent(target.name);
          const endpoint = `painelUsuario/recuperarProcessosTarefaPendenteComCriterios/${encodedName}/${target.fav}`;

          const result = await this.http.apiPost(endpoint, {
            numeroProcesso: numero,
            classe: null,
            tags: [],
            page: 0,
            maxResults: 1,
            competencia: '',
          });

          if (result?.entities?.length > 0) {
            const proc = result.entities[0];
            if (proc.numeroProcesso === numero) {
              return {
                idProcesso: proc.idProcesso,
                numeroProcesso: proc.numeroProcesso,
              };
            }
          }
        } catch { /* continua */ }
      }
    } catch { /* continua */ }

    return null;
  }

  // ── Estratégia 3: Busca Direta (JSF) ──────────────────

  private async tryDirectSearch(numero: string): Promise<ProcessSearchResult | null> {
    try {
      const formHtml = await this.http.webGet(
        '/pje/Processo/ConsultaProcesso/listView.seam',
        { iframe: 'true' }
      );

      const viewState = this.extractViewState(formHtml);
      const searchBtnId = this.extractButtonId(formHtml, /fPP:j_id(\d+)/);
      if (!viewState || !searchBtnId) return null;

      const parts = this.parseCNJParts(numero);
      if (!parts) return null;

      const searchBody = new URLSearchParams({
        AJAXREQUEST: '_viewRoot',
        fPP: 'fPP',
        'fPP:numeroProcesso:numeroSequencial': parts.sequencial,
        'fPP:numeroProcesso:numeroDigitoVerificador': parts.digito,
        'fPP:numeroProcesso:Ano': parts.ano,
        'fPP:numeroProcesso:ramoJustica': parts.ramo,
        'fPP:numeroProcesso:respectivoTribunal': parts.tribunal,
        'fPP:numeroProcesso:NumeroOrgaoJustica': parts.orgao,
        'fPP:j_id150:nomeParte': '',
        'fPP:decorationDados:ufOABCombo': 'org.jboss.seam.ui.NoSelectionConverter.noSelectionValue',
        'fPP:jurisdicaoComboDecoration:jurisdicaoCombo': 'org.jboss.seam.ui.NoSelectionConverter.noSelectionValue',
        'fPP:orgaoJulgadorComboDecoration:orgaoJulgadorCombo': 'org.jboss.seam.ui.NoSelectionConverter.noSelectionValue',
        'fPP:processoReferenciaDecoration:habilitarMascaraProcessoReferencia': 'true',
        'fPP:dataAutuacaoDecoration:dataAutuacaoInicioInputCurrentDate': '',
        'fPP:dataAutuacaoDecoration:dataAutuacaoFimInputCurrentDate': '',
        tipoMascaraDocumento: 'on',
        [searchBtnId]: searchBtnId,
        'javax.faces.ViewState': viewState,
        'AJAX:EVENTS_COUNT': '1',
      });

      const searchResultHtml = await this.http.webPostAjax(
        '/pje/Processo/ConsultaProcesso/listView.seam',
        searchBody
      );

      const resultLinkId = this.extractButtonId(searchResultHtml, /fPP:processosTable:0:j_id(\d+)/);
      const newViewState = this.extractViewState(searchResultHtml) || viewState;

      if (!resultLinkId) return null;

      const clickBody = new URLSearchParams({
        AJAXREQUEST: '_viewRoot',
        fPP: 'fPP',
        [resultLinkId]: resultLinkId,
        'javax.faces.ViewState': newViewState,
        'AJAX:EVENTS_COUNT': '1',
      });

      const clickResultHtml = await this.http.webPostAjax(
        '/pje/Processo/ConsultaProcesso/listView.seam',
        clickBody
      );

      const idMatch = clickResultHtml.match(/idProcesso=(\d+)/);
      const caMatch = clickResultHtml.match(/ca=([a-f0-9]+)/);

      if (idMatch) {
        return {
          idProcesso: parseInt(idMatch[1], 10),
          numeroProcesso: numero,
          ca: caMatch?.[1],
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // ── Helpers ────────────────────────────────────────────

  private normalizeCNJ(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 20) {
      return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
    }
    return raw.trim();
  }

  private parseCNJParts(numero: string) {
    const match = numero.match(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    return {
      sequencial: match[1],
      digito: match[2],
      ano: match[3],
      ramo: match[4],
      tribunal: match[5],
      orgao: match[6],
    };
  }

  private parseSearchResult(result: any, numero: string): ProcessSearchResult | null {
    if (!result) return null;

    if (result.idProcesso && result.numeroProcesso) {
      return { idProcesso: result.idProcesso, numeroProcesso: result.numeroProcesso };
    }

    if (result.entities?.length > 0) {
      const found = result.entities.find((e: any) => e.numeroProcesso === numero);
      if (found) return { idProcesso: found.idProcesso, numeroProcesso: found.numeroProcesso };
    }

    if (Array.isArray(result) && result.length > 0) {
      const found = result.find((e: any) => e.numeroProcesso === numero);
      if (found) return { idProcesso: found.idProcesso, numeroProcesso: found.numeroProcesso };
    }

    return null;
  }

  private extractViewState(html: string): string | null {
    const match = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
    return match?.[1] || null;
  }

  private extractButtonId(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match?.[0] || null;
  }
}
