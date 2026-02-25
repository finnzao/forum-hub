// ============================================================
// apps/web/src/app/componentes/pje-download/types.ts
// Tipos locais do módulo PJE Download (frontend)
// ============================================================

import type { PJEJobStatus } from 'shared';

export type EtapaWizard = 'login' | '2fa' | 'perfil' | 'download' | 'historico';

export interface PerfilPJE {
  indice: number;
  nome: string;
  orgao: string;
  favorito: boolean;
}

export interface UsuarioPJE {
  idUsuario: number;
  nomeUsuario: string;
  login: string;
  perfil: string;
  nomePerfil: string;
  idUsuarioLocalizacaoMagistradoServidor: number;
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

export interface SessaoPJE {
  autenticado: boolean;
  /** ID da sessão PJE no backend (para 2FA e seleção de perfil) */
  sessionId?: string;
  usuario?: UsuarioPJE;
  perfis?: PerfilPJE[];
  perfilSelecionado?: PerfilPJE;
  tarefas?: TarefaPJE[];
  tarefasFavoritas?: TarefaPJE[];
  etiquetas?: EtiquetaPJE[];
}

export interface ParametrosDownload {
  mode: 'by_number' | 'by_task' | 'by_tag';
  processNumbers?: string[];
  taskName?: string;
  isFavorite?: boolean;
  tagId?: number;
  tagName?: string;
  documentType?: number;
  pjeProfileIndex?: number;
}

export interface EntradaLog {
  id: number;
  timestamp: string;
  nivel: 'info' | 'warn' | 'error' | 'success';
  modulo: string;
  mensagem: string;
  dados?: unknown;
}
