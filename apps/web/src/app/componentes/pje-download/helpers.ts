// ============================================================
// apps/web/src/app/componentes/pje-download/helpers.ts
// Helpers e utilitários do módulo PJE Download
// ============================================================

import type { PJEJobStatus } from 'shared';

/** Verifica se o job ainda está ativo (processando) */
export function isJobActive(status: PJEJobStatus): boolean {
  const activeStatuses: PJEJobStatus[] = [
    'pending',
    'authenticating',
    'awaiting_2fa',
    'selecting_profile',
    'processing',
    'downloading',
    'checking_integrity',
    'retrying',
  ];
  return activeStatuses.includes(status);
}

/** Labels amigáveis para status */
export const STATUS_LABELS: Record<PJEJobStatus, string> = {
  pending: 'Pendente',
  authenticating: 'Autenticando',
  awaiting_2fa: 'Aguardando 2FA',
  selecting_profile: 'Selecionando perfil',
  processing: 'Processando',
  downloading: 'Baixando',
  checking_integrity: 'Verificando integridade',
  retrying: 'Retentando',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  partial: 'Parcial',
};

/** Cores para badges de status */
export const STATUS_COLORS: Record<PJEJobStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-700' },
  authenticating: { bg: 'bg-blue-50', text: 'text-blue-700' },
  awaiting_2fa: { bg: 'bg-amber-50', text: 'text-amber-700' },
  selecting_profile: { bg: 'bg-blue-50', text: 'text-blue-700' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  downloading: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  checking_integrity: { bg: 'bg-purple-50', text: 'text-purple-700' },
  retrying: { bg: 'bg-amber-50', text: 'text-amber-700' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed: { bg: 'bg-red-50', text: 'text-red-700' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

/** Logger com prefixo para console (desenvolvimento) */
export const logger = {
  info: (modulo: string, msg: string, dados?: unknown) => {
    console.log(`[PJE][${modulo}] ${msg}`, dados ?? '');
  },
  warn: (modulo: string, msg: string, dados?: unknown) => {
    console.warn(`[PJE][${modulo}] ${msg}`, dados ?? '');
  },
  error: (modulo: string, msg: string, dados?: unknown) => {
    console.log(`[PJE][${modulo}] ${msg}`, dados ?? '');
  },
  success: (modulo: string, msg: string, dados?: unknown) => {
    console.log(`✅ [PJE][${modulo}] ${msg}`, dados ?? '');
  },
};
