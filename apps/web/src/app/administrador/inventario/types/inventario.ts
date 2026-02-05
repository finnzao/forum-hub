// types/inventario.ts

export type CategoriaItem = string; // Agora aceita qualquer string para autocomplete
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
  descricao?: string;
  categoria: string;
  tombos: Tombo[];
  localizacaoAtual: string;
  status: StatusItem;
  dataAquisicao: string;
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
  categoria?: string;
  localizacao?: string;
  status?: StatusItem;
  busca?: string;
}

export interface EstatisticasInventario {
  totalItens: number;
  porCategoria: Record<string, number>;
  porStatus: Record<StatusItem, number>;
  movimentacoesMes: number;
}

export interface FormularioNovoItem {
  nome: string;
  descricao?: string;
  categoria: string;
  tomboAzul?: string;
  tomboCinza?: string;
  localizacaoAtual: string;
  dataAquisicao: string;
  observacoes?: string;
}
