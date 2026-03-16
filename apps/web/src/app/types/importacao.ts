// ============================================================
// types/importacao.ts
// Tipos canônicos para importação de planilhas (XLSX/CSV)
// Usado por: chefe-cartorio, magistrado, servidor, administrador
// ============================================================

/** Formatos de arquivo aceitos pelo sistema */
export type FormatoArquivo = 'xlsx' | 'csv';

/** Status de cada registro durante a importação */
export type StatusRegistro = 'valido' | 'incompleto' | 'duplicado' | 'erro';

/** Etapas do wizard de importação */
export type EtapaImportacao = 'upload' | 'mapeamento' | 'validacao' | 'revisao' | 'concluido';

/** Campos do sistema que podem ser mapeados */
export type CampoSistema =
  | 'numero_processo'
  | 'data_movimentacao'
  | 'tipo_acao'
  | 'situacao_atual'
  | 'classe_judicial'
  | 'assunto'
  | 'comarca'
  | 'vara'
  | 'parte_autora'
  | 'parte_re'
  | 'advogado'
  | 'prioridade'
  | 'observacao'
  | 'ignorar';

/** Configuração de cada campo mapeável */
export interface ConfigCampoSistema {
  campo: CampoSistema;
  rotulo: string;
  obrigatorio: boolean;
  descricao: string;
}

/** Todos os campos disponíveis para mapeamento */
export const CAMPOS_SISTEMA: ConfigCampoSistema[] = [
  { campo: 'numero_processo',    rotulo: 'Nº do Processo',         obrigatorio: true,  descricao: 'Número CNJ do processo' },
  { campo: 'data_movimentacao',  rotulo: 'Data da Movimentação',   obrigatorio: false, descricao: 'Data da última movimentação' },
  { campo: 'tipo_acao',          rotulo: 'Tipo de Ação',           obrigatorio: false, descricao: 'Tipo/classe da ação processual' },
  { campo: 'situacao_atual',     rotulo: 'Situação Atual',         obrigatorio: false, descricao: 'Status atual do processo' },
  { campo: 'classe_judicial',    rotulo: 'Classe Judicial',        obrigatorio: false, descricao: 'Classe judicial do processo' },
  { campo: 'assunto',            rotulo: 'Assunto',                obrigatorio: false, descricao: 'Assunto principal' },
  { campo: 'comarca',            rotulo: 'Comarca',                obrigatorio: false, descricao: 'Comarca de origem' },
  { campo: 'vara',               rotulo: 'Vara',                   obrigatorio: false, descricao: 'Vara responsável' },
  { campo: 'parte_autora',       rotulo: 'Parte Autora',           obrigatorio: false, descricao: 'Nome da parte autora/requerente' },
  { campo: 'parte_re',           rotulo: 'Parte Ré',               obrigatorio: false, descricao: 'Nome da parte ré/requerida' },
  { campo: 'advogado',           rotulo: 'Advogado',               obrigatorio: false, descricao: 'Nome do advogado' },
  { campo: 'prioridade',         rotulo: 'Prioridade',             obrigatorio: false, descricao: 'Nível de prioridade' },
  { campo: 'observacao',         rotulo: 'Observação',             obrigatorio: false, descricao: 'Observações adicionais' },
  { campo: 'ignorar',            rotulo: '(Ignorar coluna)',       obrigatorio: false, descricao: 'Coluna não será importada' },
];

/** Mapeamento: coluna do arquivo → campo do sistema */
export interface MapeamentoColuna {
  colunaOriginal: string;
  campoSistema: CampoSistema;
  amostra: string[]; // primeiras linhas para preview
}

/** Um registro parseado da planilha */
export interface RegistroImportado {
  id: string;
  indice: number; // linha original no arquivo
  dados: Record<string, string>; // campo_sistema → valor
  status: StatusRegistro;
  erros: string[];
  selecionado: boolean; // para inclusão/exclusão na revisão
}

/** Resultado completo do parsing */
export interface ResultadoParsing {
  nomeArquivo: string;
  formato: FormatoArquivo;
  totalLinhas: number;
  colunasOriginais: string[];
  dadosBrutos: string[][]; // todas as linhas (sem cabeçalho)
  cabecalho: string[];
}

/** Resultado da validação após mapeamento */
export interface ResultadoValidacao {
  registros: RegistroImportado[];
  resumo: {
    total: number;
    validos: number;
    incompletos: number;
    duplicados: number;
    erros: number;
  };
}

/** Registro do histórico de importações */
export interface HistoricoImportacao {
  id: string;
  nomeArquivo: string;
  dataImportacao: string;
  usuario: string;
  totalRegistros: number;
  importados: number;
  descartados: number;
  perfil: string; // qual perfil realizou
}

/** Estado completo do wizard de importação */
export interface EstadoImportacao {
  etapa: EtapaImportacao;
  arquivo: File | null;
  parsing: ResultadoParsing | null;
  mapeamento: MapeamentoColuna[];
  validacao: ResultadoValidacao | null;
  padraoAtivo: string | null; // id do padrão aplicado (null = automático)
  carregando: boolean;
  erro: string | null;
}

// ── Padrões de Mapeamento (salvos por perfil) ────────────

/** Regra individual dentro de um padrão: coluna original → campo do sistema */
export interface RegraMapeamento {
  colunaOriginal: string;
  campoSistema: CampoSistema;
}

/** Padrão de mapeamento salvo pelo usuário */
export interface PadraoMapeamento {
  id: string;
  nome: string;
  descricao: string;
  perfil: string;           // perfil que criou: 'chefe-cartorio', 'magistrado', etc.
  criadoPor: string;        // nome do usuário
  criadoEm: string;         // ISO date
  atualizadoEm: string;     // ISO date
  regras: RegraMapeamento[];
  colunasVisiveis: CampoSistema[]; // quais campos mostrar na revisão
}
