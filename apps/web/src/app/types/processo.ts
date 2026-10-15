// ============================================================
// types/processo.ts
// Tipos do acervo e da fila de trabalho (ARQUITETURA.md, seções 4, 8 e 9)
// Três camadas: identidade + estado observado (captura) | trabalho humano
// ============================================================

import type { FiltroDigito } from '../lib/cnj';

// ── Estado observado (dono: captura) ────────────────────

export interface ProcessoObservado {
  id: string;
  /** 20 dígitos, sem máscara */
  numeroCnj: string;
  numeroFormatado: string;
  tarefaAtual: string;
  outrasTarefas: string[];
  /** ISO */
  dataChegadaTarefa: string;
  /** ISO */
  ultimoMovimentoEm: string;
  ultimoMovimentoDesc: string;
  etiquetas: string[];
  classe: string;
  assunto: string;
  poloAtivo: string;
  poloPassivo: string;
  /** Prioridade processual (idoso, saúde etc.), vinda do PJE */
  prioridadeLegal: boolean;
  sigiloso: boolean;
  /** Dias desde a última movimentação, calculado na captura */
  diasParados: number;
  /** ISO da captura que produziu este estado */
  capturadoEm: string;
}

// ── Trabalho humano ─────────────────────────────────────

export type PrioridadeTrabalho = 'P1' | 'P2' | 'P3';
export type FaixaPeso = 'critico' | 'alto' | 'medio' | 'normal';
export type SituacaoAnalise = 'novo' | 'sem_novidade' | 'movimentou';
export type StatusItem = 'pendente' | 'em_andamento' | 'concluido';

export type OrigemFila =
  | { tipo: 'digito' }
  | { tipo: 'lista'; listaId: string; listaTitulo: string };

export interface AnaliseAnterior {
  usuarioNome: string;
  /** ISO */
  analisadoEm: string;
  /** ISO do último movimento no momento da análise */
  ultimoMovimentoNaAnalise: string;
  tipoMovimentacao?: string;
  observacao?: string;
}

/** Processo como aparece na fila de um servidor */
export interface ProcessoFila extends ProcessoObservado {
  prioridade: PrioridadeTrabalho;
  /** 0–100, conforme digito-core */
  peso: number;
  faixa: FaixaPeso;
  /** Em fila de espera (aguardando terceiro) — vai para aba própria */
  filaEspera: boolean;
  situacaoAnalise: SituacaoAnalise;
  analise?: AnaliseAnterior;
  origem: OrigemFila;
  statusItem: StatusItem;
  observacaoItem?: string;
}

export interface RegistroProcesso {
  id: string;
  processoId: string;
  usuarioNome: string;
  /** ISO */
  data: string;
  tipoMovimentacao: string;
  qtdAtos: number;
  nota: string;
}

export interface DadosConclusao {
  tipoMovimentacao: string;
  qtdAtos: number;
  nota: string;
  lembrete?: { data: string; texto: string };
}

// ── Contexto (usuário, perfil, captura) ─────────────────

export interface PerfilPje {
  id: string;
  unidadeNome: string;
  papel: string;
  cargo: string;
}

export interface UsuarioUnidade {
  id: string;
  nome: string;
  perfilSistema: 'servidor' | 'chefe';
  filtroDigito: FiltroDigito;
  ativo: boolean;
}

export interface ListaManual {
  id: string;
  titulo: string;
  motivo: string;
  servidorId: string;
  dataInicio: string;
  dataFim: string;
  processoIds: string[];
  criadoPor: string;
}

export interface CapturaInfo {
  id: string;
  fonte: 'adaptador' | 'planilha';
  perfilPje: string;
  /** ISO */
  concluidaEm: string;
  totalLidos: number;
  novos: number;
  alterados: number;
  ausentes: number;
}

// ── Rótulos e cores ─────────────────────────────────────

export const PRIORIDADE_LABELS: Record<PrioridadeTrabalho, string> = {
  P1: 'P1 · Parado > 30 dias',
  P2: 'P2 · Meta / GAB',
  P3: 'P3 · Normal',
};

export const PRIORIDADE_CORES: Record<PrioridadeTrabalho, string> = {
  P1: 'bg-rose-100 text-rose-800 border-rose-300',
  P2: 'bg-orange-100 text-orange-800 border-orange-300',
  P3: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

export const FAIXA_LABELS: Record<FaixaPeso, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  normal: 'Normal',
};

export const SITUACAO_LABELS: Record<SituacaoAnalise, string> = {
  novo: 'Novo',
  sem_novidade: 'Sem novidade',
  movimentou: 'Movimentou após análise',
};

export const SITUACAO_CORES: Record<SituacaoAnalise, string> = {
  novo: 'bg-blue-50 text-blue-800 border-blue-200',
  sem_novidade: 'bg-slate-100 text-slate-600 border-slate-300',
  movimentou: 'bg-violet-50 text-violet-800 border-violet-300',
};

export const STATUS_ITEM_LABELS: Record<StatusItem, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

export const STATUS_ITEM_CORES: Record<StatusItem, string> = {
  pendente: 'bg-white text-slate-700 border-slate-300',
  em_andamento: 'bg-amber-50 text-amber-800 border-amber-300',
  concluido: 'bg-green-50 text-green-800 border-green-300',
};

/** Réguas da planilha administrativa: laranja ≥ 100 dias, vermelho ≥ 120 */
export function corDiasParados(dias: number): string {
  if (dias >= 120) return 'text-red-700 font-bold';
  if (dias >= 100) return 'text-orange-600 font-bold';
  if (dias > 30) return 'text-slate-900 font-semibold';
  return 'text-slate-600';
}
