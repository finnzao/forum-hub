// ============================================================
// app/componentes/pje-download/tipos.ts
// Tipos, constantes e helpers para o módulo de Download PJE
// ============================================================

// ── Etapa do wizard ──────────────────────────────────────────

export type EtapaWizard = 'login' | '2fa' | 'perfil' | 'download' | 'historico';

// ── Sessão PJE ───────────────────────────────────────────────

export interface SessaoPJE {
  autenticado: boolean;
  usuario?: UsuarioPJE;
  perfis?: PerfilPJE[];
  perfilSelecionado?: PerfilPJE;
  tarefas?: TarefaPJE[];
  tarefasFavoritas?: TarefaPJE[];
  etiquetas?: EtiquetaPJE[];
}

export interface UsuarioPJE {
  idUsuario: number;
  nomeUsuario: string;
  login: string;
  perfil: string;
  nomePerfil: string;
  idUsuarioLocalizacaoMagistradoServidor: number;
}

export interface PerfilPJE {
  indice: number;
  nome: string;
  orgao: string;
  favorito: boolean;
}

export interface TarefaPJE {
  id: number;
  nome: string;
  quantidadePendente: number;
}

export interface EtiquetaPJE {
  id: number;
  nomeTag: string;
  nomeTagCompleto: string;
  favorita: boolean;
}

// ── Download Job ─────────────────────────────────────────────

export type PJEDownloadMode = 'by_number' | 'by_task' | 'by_tag';

export type PJEJobStatus =
  | 'pending'
  | 'authenticating'
  | 'awaiting_2fa'
  | 'selecting_profile'
  | 'processing'
  | 'downloading'
  | 'checking_integrity'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

export interface DownloadJobResponse {
  id: string;
  userId: number;
  mode: PJEDownloadMode;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PJEDownloadedFile {
  processNumber: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadedAt: string;
}

export interface PJEDownloadError {
  processNumber?: string;
  message: string;
  code?: string;
  timestamp: string;
}

export interface PJEDownloadProgress {
  jobId: string;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  message?: string;
  timestamp: number;
}

// ── Constantes ───────────────────────────────────────────────

export const STATUS_PENDENTES_ATIVOS: PJEJobStatus[] = [
  'pending', 'authenticating', 'awaiting_2fa', 'selecting_profile',
  'processing', 'downloading', 'checking_integrity', 'retrying',
];

export const STATUS_CANCELLABLE: PJEJobStatus[] = [
  'pending', 'authenticating', 'awaiting_2fa',
  'selecting_profile', 'processing', 'downloading',
];

export interface StatusConfig { label: string; color: string; bg: string }

export const STATUS_CONFIG: Record<PJEJobStatus, StatusConfig> = {
  pending:            { label: 'Na fila',              color: 'text-slate-600',   bg: 'bg-slate-100' },
  authenticating:     { label: 'Autenticando',         color: 'text-blue-700',    bg: 'bg-blue-50' },
  awaiting_2fa:       { label: 'Aguardando 2FA',       color: 'text-amber-700',   bg: 'bg-amber-50' },
  selecting_profile:  { label: 'Selecionando perfil',  color: 'text-blue-700',    bg: 'bg-blue-50' },
  processing:         { label: 'Processando',          color: 'text-blue-700',    bg: 'bg-blue-50' },
  downloading:        { label: 'Baixando',             color: 'text-indigo-700',  bg: 'bg-indigo-50' },
  checking_integrity: { label: 'Verificando',          color: 'text-purple-700',  bg: 'bg-purple-50' },
  retrying:           { label: 'Retentando',           color: 'text-orange-700',  bg: 'bg-orange-50' },
  completed:          { label: 'Concluído',            color: 'text-emerald-700', bg: 'bg-emerald-50' },
  failed:             { label: 'Falhou',               color: 'text-red-700',     bg: 'bg-red-50' },
  cancelled:          { label: 'Cancelado',            color: 'text-slate-500',   bg: 'bg-slate-100' },
  partial:            { label: 'Parcial',              color: 'text-amber-700',   bg: 'bg-amber-50' },
};

export interface ModeConfig { label: string; description: string }

export const MODE_CONFIG: Record<PJEDownloadMode, ModeConfig> = {
  by_task:   { label: 'Por Tarefa',   description: 'Baixe todos os processos de uma tarefa do painel PJE' },
  by_tag:    { label: 'Por Etiqueta', description: 'Baixe todos os processos vinculados a uma etiqueta' },
  by_number: { label: 'Por Número',   description: 'Baixe processos específicos informando os números CNJ' },
};

export const DOCUMENT_TYPES = [
  { value: 0,   label: 'Todos os documentos' },
  { value: 1,   label: 'Sentença' },
  { value: 2,   label: 'Decisão' },
  { value: 67,  label: 'Ato Ordinatório' },
  { value: 60,  label: 'Petição Inicial' },
  { value: 161, label: 'Petição' },
] as const;

export const CNJ_PATTERN = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

// ── Helpers ──────────────────────────────────────────────────

export function isJobActive(status: PJEJobStatus): boolean {
  return STATUS_PENDENTES_ATIVOS.includes(status);
}

export function isJobCancellable(status: PJEJobStatus): boolean {
  return STATUS_CANCELLABLE.includes(status);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
