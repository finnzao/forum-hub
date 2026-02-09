// ============================================================
// tipos/historico.ts
// Tipos compartilhados para o módulo de Histórico de Trabalho
// ============================================================

export type PrioridadeTarefa = 'alta' | 'media' | 'baixa';

export type StatusRegistro = 'concluido' | 'em_andamento' | 'pendente';

export type CategoriaAcao =
  | 'despacho'
  | 'decisao'
  | 'certidao'
  | 'intimacao'
  | 'citacao'
  | 'juntada'
  | 'oficio'
  | 'publicacao'
  | 'audiencia'
  | 'calculo'
  | 'cumprimento'
  | 'outro';

export interface RegistroAtividade {
  id: string;
  numeroProcesso: string;
  partes: string;
  data: string;
  hora: string;
  categoriaAcao: CategoriaAcao;
  descricaoAcao: string;
  observacao?: string;
  servidor: string;
  status: StatusRegistro;
  temLembrete: boolean;
  dataLembrete?: string;
  descricaoLembrete?: string;
}

export interface FiltrosHistorico {
  busca: string;
  categoria: CategoriaAcao | 'todas';
  status: StatusRegistro | 'todos';
  dataInicio: string;
  dataFim: string;
}

export interface EstatisticasHistorico {
  totalRegistros: number;
  registrosHoje: number;
  processosAtendidos: number;
  lembretesAtivos: number;
}

export const CATEGORIAS_ACAO: Record<CategoriaAcao, string> = {
  despacho: 'Despacho',
  decisao: 'Decisão',
  certidao: 'Certidão',
  intimacao: 'Intimação',
  citacao: 'Citação',
  juntada: 'Juntada de Documento',
  oficio: 'Ofício',
  publicacao: 'Publicação',
  audiencia: 'Audiência',
  calculo: 'Cálculo',
  cumprimento: 'Cumprimento',
  outro: 'Outro',
};

export const STATUS_LABELS: Record<StatusRegistro, string> = {
  concluido: 'Concluído',
  em_andamento: 'Em andamento',
  pendente: 'Pendente',
};

export const STATUS_CORES: Record<StatusRegistro, { bg: string; text: string; dot: string }> = {
  concluido: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  em_andamento: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  pendente: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
};
