// ============================================================
// apps/web/src/app/componentes/pje-download/types.ts
// Tipos compartilhados para os componentes PJE Download
//
// Correções v8:
//  - ParametrosDownload.isFavorite agora é boolean explícito
//  - Adicionado documentação sobre o significado de isFavorite
// ============================================================

// ── Status e tipos de job ─────────────────────────────────

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
  | 'partial'
  | 'failed'
  | 'cancelled';

export type EtapaWizard = 'login' | '2fa' | 'perfil' | 'download' | 'historico';

// ── Sessão PJE ────────────────────────────────────────────

export interface SessaoPJE {
  autenticado: boolean;
  sessionId?: string;
  usuario?: {
    idUsuario: number;
    nomeUsuario: string;
    login: string;
    perfil: string;
    nomePerfil: string;
    idUsuarioLocalizacaoMagistradoServidor: number;
  };
  perfis?: PerfilPJE[];
  perfilSelecionado?: PerfilPJE;
  tarefas?: Array<{ id: number; nome: string; quantidadePendente: number }>;
  tarefasFavoritas?: Array<{ id: number; nome: string; quantidadePendente: number }>;
  etiquetas?: Array<{ id: number; nomeTag: string; nomeTagCompleto: string; favorita: boolean }>;
}

export interface PerfilPJE {
  indice: number;
  nome: string;
  orgao: string;
  favorito: boolean;
}

// ── Parâmetros de Download ────────────────────────────────

export interface ParametrosDownload {
  mode: 'by_task' | 'by_tag' | 'by_number';

  // Modo by_task
  taskName?: string;
  /**
   * isFavorite indica qual lista de tarefas usar:
   *  - false (padrão): "Todas as Tarefas" — lista completa sem filtro
   *  - true: "Minhas Tarefas" — apenas tarefas marcadas com estrela (favoritas)
   *
   * Ambas as listas podem ter tarefas com o mesmo nome, mas o endpoint
   * do PJE retorna processos diferentes dependendo deste flag.
   */
  isFavorite?: boolean;

  // Modo by_tag
  tagId?: number;
  tagName?: string;

  // Modo by_number
  processNumbers?: string[];

  // Outros
  documentType?: number;
  pjeProfileIndex?: number;
}

// ── Resposta do Job ───────────────────────────────────────

export interface DownloadJobResponse {
  id: string;
  userId: number;
  mode: 'by_task' | 'by_tag' | 'by_number';
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

// ── Progresso ─────────────────────────────────────────────

export interface PJEDownloadProgress {
  jobId: string;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  currentProcess?: string;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  message: string;
  timestamp: number;
}

// ── Logs ──────────────────────────────────────────────────

export interface EntradaLog {
  id: number;
  timestamp: string;
  nivel: 'info' | 'warn' | 'error' | 'success';
  modulo: string;
  mensagem: string;
  dados?: unknown;
}

// ── Helpers ───────────────────────────────────────────────

export function isJobActive(status: PJEJobStatus): boolean {
  const activeStatuses: PJEJobStatus[] = [
    'pending', 'authenticating', 'awaiting_2fa',
    'selecting_profile', 'processing', 'downloading',
    'checking_integrity', 'retrying',
  ];
  return activeStatuses.includes(status);
}

export const logger = {
  info: (modulo: string, msg: string, dados?: unknown) =>
    console.log(`[${modulo}] ${msg}`, dados ?? ''),
  warn: (modulo: string, msg: string, dados?: unknown) =>
    console.warn(`[${modulo}] ${msg}`, dados ?? ''),
  error: (modulo: string, msg: string, dados?: unknown) =>
    console.log(`[${modulo}] ${msg}`, dados ?? ''),
  success: (modulo: string, msg: string, dados?: unknown) =>
    console.log(`[${modulo}] ✓ ${msg}`, dados ?? ''),
};
