export { type TipoMovimentacao, TIPOS_MOVIMENTACAO, CATEGORIAS_MOVIMENTACAO } from './movimentacoes';

export interface Lembrete {
  id: string;
  data: string;
  texto: string;
  concluido: boolean;
}

export interface RegistroHistorico {
  id: string;
  processo: string;
  data: string;
  tipo: import('./movimentacoes').TipoMovimentacao;
  qtdAtos: number;
  nota: string;
  lembretes: Lembrete[];
}

export interface FiltrosHistorico {
  busca: string;
  tipo: import('./movimentacoes').TipoMovimentacao | 'todos';
}

export interface DadosLembrete {
  data: string;
  texto: string;
}

export interface DadosNovoRegistro {
  processo: string;
  data: string;
  tipo: import('./movimentacoes').TipoMovimentacao;
  qtdAtos: number;
  nota: string;
  lembrete?: DadosLembrete;
}

export interface ItemLote {
  tipo: import('./movimentacoes').TipoMovimentacao;
  qtdAtos: number;
  lembrete?: DadosLembrete;
}

export type ColunaOrdenavel = 'data' | 'tipo' | 'qtdAtos' | 'lembrete';
export type DirecaoOrdenacao = 'asc' | 'desc' | null;

export interface Ordenacao {
  coluna: ColunaOrdenavel | null;
  direcao: DirecaoOrdenacao;
}
