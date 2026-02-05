// Tipos base do sistema de férias

export type StatusAusencia = 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';
export type TipoAusencia = 'ferias' | 'licenca-premio' | 'licenca-medica' | 'outros';
export type StatusFuncionario = 'ativo' | 'ferias' | 'licenca' | 'inativo';

export interface Setor {
  id: string;
  nome: string;
  limiteAusenciasSimultaneas: number;
  totalFuncionarios: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  setorId: string;
  setor?: Setor;
  status: StatusFuncionario;
  diasFeriasRestantes: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Ausencia {
  id: string;
  funcionarioId: string;
  funcionario?: Funcionario;
  setorId: string;
  setor?: Setor;
  tipo: TipoAusencia;
  dataInicio: Date;
  dataFim: Date;
  diasCorridos: number;
  diasUteis: number;
  motivo?: string;
  status: StatusAusencia;
  solicitadoEm: Date;
  aprovadoEm?: Date;
  aprovadoPor?: string;
  rejeitadoEm?: Date;
  rejeitadoPor?: string;
  motivoRejeicao?: string;
}

export interface ConflitoDia {
  data: Date;
  ausenciasNoDia: number;
  limiteSetor: number;
  funcionariosAusentes: string[];
}

export interface ResultadoValidacao {
  valido: boolean;
  conflitos: ConflitoDia[];
  mensagem?: string;
}

export interface EstatisticasFerias {
  totalPendentes: number;
  totalAprovadas: number;
  totalRejeitadas: number;
  totalFuncionarios: number;
  conflitosAtivos: number;
}

export interface FiltrosAusencia {
  setorId?: string;
  funcionarioId?: string;
  status?: StatusAusencia;
  tipo?: TipoAusencia;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface ConfiguracaoSetor {
  setorId: string;
  limiteAusenciasSimultaneas: number;
}
