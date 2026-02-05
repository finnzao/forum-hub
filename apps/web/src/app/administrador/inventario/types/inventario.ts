// types/inventario.ts

export type CategoriaItem = 'TI' | 'Escritorio' | 'Mobiliario';
export type TipoTombo = 'azul' | 'cinza';
export type TipoMovimentacao = 'entrada' | 'saida' | 'transferencia';
export type StatusItem = 'ativo' | 'manutencao' | 'baixado';

export interface Tombo {
  tipo: TipoTombo;
  numero: string;
}

export interface ItemInventario {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaItem;
  tombos: Tombo[];
  localizacaoAtual: string;
  status: StatusItem;
  dataAquisicao: string;
  valorAquisicao: number;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Movimentacao {
  id: string;
  itemId: string;
  itemNome: string;
  tipo: TipoMovimentacao;
  origem?: string;
  destino?: string;
  responsavel: string;
  data: string;
  observacoes?: string;
  criadoEm: string;
}

export interface FiltrosInventario {
  categoria?: CategoriaItem;
  localizacao?: string;
  status?: StatusItem;
  busca?: string;
}

export interface EstatisticasInventario {
  totalItens: number;
  porCategoria: Record<CategoriaItem, number>;
  porStatus: Record<StatusItem, number>;
  valorTotal: number;
  movimentacoesMes: number;
}
