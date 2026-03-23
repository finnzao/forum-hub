// ============================================================
// types/distribuicao.ts
// Tipos canônicos para Listas de Trabalho e Distribuição
// Usado por: chefe-cartorio, magistrado, servidor
// ============================================================

import type { CampoSistema } from './importacao';

// ── Status e Enums ──────────────────────────────────────

export type StatusProcessoLista = 'pendente' | 'em_andamento' | 'concluido';
export type StatusLista = 'rascunho' | 'ativa' | 'concluida' | 'cancelada';
export type PeriodoLista = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';
export type FonteProcessos = 'importacao_exaudi' | 'manual';
export type ModoDistribuicao = 'igualitaria' | 'por_cota';
export type DirecaoOrdenacao = 'asc' | 'desc';

// ── Entidades Principais ────────────────────────────────

/** Servidor disponível para receber processos */
export interface ServidorDistribuicao {
  id: string;
  nome: string;
  setor: string;
  cota: number;
  ativo: boolean;
  processosAtribuidos: number;
  /** Ordem de recebimento: 1 = recebe os primeiros processos (mais prioritários) */
  ordemRecebimento: number;
}

/** Processo individual disponível para distribuição */
export interface ProcessoDistribuivel {
  id: string;
  numeroProcesso: string;
  dados: Record<string, string>;
  fontId?: string;
  atribuido: boolean;
  listaId?: string;
  servidorId?: string;
}

/** Processo dentro de uma lista de trabalho */
export interface ProcessoNaLista {
  id: string;
  processoId: string;
  numeroProcesso: string;
  dados: Record<string, string>;
  status: StatusProcessoLista;
  observacao?: string;
  atualizadoEm: string;
  concluidoEm?: string;
}

/** Entidade principal: Lista de Trabalho */
export interface ListaTrabalho {
  id: string;
  titulo: string;
  periodo: PeriodoLista;
  dataInicio: string;
  dataFim: string;
  servidorId: string;
  servidorNome: string;
  cota: number;
  status: StatusLista;
  fonte: FonteProcessos;
  processos: ProcessoNaLista[];
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
  concluidaEm?: string;
}

// ── Configuração de Distribuição ────────────────────────

export interface CriterioOrdenacao {
  campo: CampoSistema;
  direcao: DirecaoOrdenacao;
  rotulo: string;
}

/** Configuração completa de uma distribuição */
export interface ConfiguracaoDistribuicao {
  modo: ModoDistribuicao;
  periodo: PeriodoLista;
  dataInicio: string;
  dataFim: string;
  /** Servidores na ordem de prioridade de recebimento (posição 0 = recebe primeiro) */
  servidoresSelecionados: ServidorDistribuicao[];
  criteriosOrdenacao: CriterioOrdenacao[];
  cotaPersonalizada?: Record<string, number>;
}

export interface SugestaoDistribuicao {
  servidorId: string;
  servidorNome: string;
  ordemRecebimento: number;
  cota: number;
  processos: ProcessoDistribuivel[];
}

// ── Progresso e Estatísticas ────────────────────────────

export interface ProgressoLista {
  total: number;
  pendentes: number;
  emAndamento: number;
  concluidos: number;
  percentualConclusao: number;
  dentroDoPrazo: boolean;
}

export interface EstatisticasDistribuicao {
  totalListas: number;
  listasAtivas: number;
  listasConcluidas: number;
  totalProcessosDistribuidos: number;
  totalProcessosConcluidos: number;
  mediaPercentualConclusao: number;
  servidoresComAtraso: number;
}

export interface FiltrosListaTrabalho {
  busca: string;
  servidorId: string | 'todos';
  status: StatusLista | 'todos';
  periodo: PeriodoLista | 'todos';
  dataInicio: string;
  dataFim: string;
}

// ── Labels e Constantes ─────────────────────────────────

export const STATUS_PROCESSO_LABELS: Record<StatusProcessoLista, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

export const STATUS_PROCESSO_CORES: Record<StatusProcessoLista, { bg: string; text: string; border: string }> = {
  pendente:      { bg: 'bg-slate-100', text: 'text-slate-700',   border: 'border-slate-300' },
  em_andamento:  { bg: 'bg-amber-50',  text: 'text-amber-700',   border: 'border-amber-300' },
  concluido:     { bg: 'bg-green-50',  text: 'text-green-700',   border: 'border-green-300' },
};

export const STATUS_LISTA_LABELS: Record<StatusLista, string> = {
  rascunho:  'Rascunho',
  ativa:     'Ativa',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const STATUS_LISTA_CORES: Record<StatusLista, { bg: string; text: string; border: string }> = {
  rascunho:  { bg: 'bg-slate-100', text: 'text-slate-600',   border: 'border-slate-300' },
  ativa:     { bg: 'bg-blue-50',   text: 'text-blue-700',    border: 'border-blue-300' },
  concluida: { bg: 'bg-green-50',  text: 'text-green-700',   border: 'border-green-300' },
  cancelada: { bg: 'bg-red-50',    text: 'text-red-600',     border: 'border-red-300' },
};

export const PERIODO_LABELS: Record<PeriodoLista, string> = {
  semanal:       'Semanal',
  quinzenal:     'Quinzenal',
  mensal:        'Mensal',
  personalizado: 'Personalizado',
};

export const MODO_DISTRIBUICAO_LABELS: Record<ModoDistribuicao, string> = {
  igualitaria: 'Igualitária',
  por_cota:    'Por Cota Individual',
};
