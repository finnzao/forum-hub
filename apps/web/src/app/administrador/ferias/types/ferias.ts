export interface CorSetor {
  bg: string;
  light: string;
  text: string;
}

export interface Setor {
  id: string;
  nome: string;
  limiteAusencias: number;
  cor: number;
}

export interface Funcionario {
  id: string;
  nome: string;
  setorId: string;
}

export type MotivoAusencia =
  | 'ferias'
  | 'licenca_premio'
  | 'licenca_medica'
  | 'licenca_maternidade'
  | 'outros';

export interface MotivoConfig {
  valor: MotivoAusencia;
  rotulo: string;
  cor: string;
  corTexto: string;
}

export interface Ausencia {
  id: string;
  funcionarioId: string;
  dataInicio: string;
  dataFim: string;
  motivo: MotivoAusencia;
}

export interface SetorComFuncionarios extends Setor {
  funcs: Funcionario[];
}

export type ViewType = 'heatmap' | 'dashboard';
