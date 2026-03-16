// ============================================================
// lib/importacao/padroes.ts
// Persistência de padrões de mapeamento por perfil
// Storage: localStorage (futuro: API)
// Sem dependência de React — puro JS
// ============================================================

import type {
  PadraoMapeamento,
  RegraMapeamento,
  MapeamentoColuna,
  CampoSistema,
} from '../../types/importacao';

const STORAGE_KEY = 'forum-hub:padroes-mapeamento';

// ── Leitura / Escrita ───────────────────────────────────

function lerTodos(): PadraoMapeamento[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarTodos(padroes: PadraoMapeamento[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(padroes));
}

// ── API Pública ─────────────────────────────────────────

/** Lista padrões do perfil informado */
export function listarPadroes(perfil: string): PadraoMapeamento[] {
  return lerTodos().filter((p) => p.perfil === perfil);
}

/** Busca padrão por ID */
export function obterPadrao(id: string): PadraoMapeamento | null {
  return lerTodos().find((p) => p.id === id) || null;
}

/** Cria novo padrão a partir do mapeamento atual */
export function criarPadrao(
  nome: string,
  descricao: string,
  perfil: string,
  criadoPor: string,
  mapeamento: MapeamentoColuna[],
  colunasVisiveis?: CampoSistema[],
): PadraoMapeamento {
  const agora = new Date().toISOString();

  const regras: RegraMapeamento[] = mapeamento
    .filter((m) => m.campoSistema !== 'ignorar')
    .map((m) => ({
      colunaOriginal: m.colunaOriginal,
      campoSistema: m.campoSistema,
    }));

  // Se não informou colunas visíveis, usar todas as mapeadas
  const visiveis = colunasVisiveis || regras.map((r) => r.campoSistema);

  const padrao: PadraoMapeamento = {
    id: `padrao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome,
    descricao,
    perfil,
    criadoPor,
    criadoEm: agora,
    atualizadoEm: agora,
    regras,
    colunasVisiveis: visiveis,
  };

  const todos = lerTodos();
  todos.push(padrao);
  salvarTodos(todos);

  return padrao;
}

/** Atualiza padrão existente com novo mapeamento */
export function atualizarPadrao(
  id: string,
  dados: {
    nome?: string;
    descricao?: string;
    mapeamento?: MapeamentoColuna[];
    colunasVisiveis?: CampoSistema[];
  },
): PadraoMapeamento | null {
  const todos = lerTodos();
  const idx = todos.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const padrao = todos[idx];

  if (dados.nome !== undefined) padrao.nome = dados.nome;
  if (dados.descricao !== undefined) padrao.descricao = dados.descricao;
  if (dados.colunasVisiveis !== undefined) padrao.colunasVisiveis = dados.colunasVisiveis;

  if (dados.mapeamento) {
    padrao.regras = dados.mapeamento
      .filter((m) => m.campoSistema !== 'ignorar')
      .map((m) => ({
        colunaOriginal: m.colunaOriginal,
        campoSistema: m.campoSistema,
      }));
  }

  padrao.atualizadoEm = new Date().toISOString();
  todos[idx] = padrao;
  salvarTodos(todos);

  return padrao;
}

/** Remove padrão por ID */
export function removerPadrao(id: string): boolean {
  const todos = lerTodos();
  const filtrados = todos.filter((p) => p.id !== id);
  if (filtrados.length === todos.length) return false;
  salvarTodos(filtrados);
  return true;
}

/**
 * Aplica um padrão salvo ao mapeamento atual.
 * Faz match pelo nome da coluna original (case-insensitive).
 * Colunas do arquivo que não têm regra ficam como 'ignorar'.
 */
export function aplicarPadrao(
  padrao: PadraoMapeamento,
  mapeamentoAtual: MapeamentoColuna[],
): MapeamentoColuna[] {
  return mapeamentoAtual.map((col) => {
    const regra = padrao.regras.find(
      (r) => normalizar(r.colunaOriginal) === normalizar(col.colunaOriginal),
    );

    return {
      ...col,
      campoSistema: regra ? regra.campoSistema : 'ignorar',
    };
  });
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
