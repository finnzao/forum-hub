// ============================================================
// app/componentes/pje-download/DistintivoPJE.tsx
// Badges de status e modo para o módulo de Download PJE
// ============================================================

import React from 'react';
import {
  Clock, Lock, Shield, Loader2, Download, Search,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ClipboardList, Tag, Hash,
} from 'lucide-react';
import { STATUS_CONFIG, MODE_CONFIG, type PJEJobStatus, type PJEDownloadMode } from './tipos';

const STATUS_ICONS: Record<PJEJobStatus, React.ReactNode> = {
  pending:            <Clock size={14} />,
  authenticating:     <Lock size={14} />,
  awaiting_2fa:       <Shield size={14} />,
  selecting_profile:  <Loader2 size={14} className="animate-spin" />,
  processing:         <Loader2 size={14} className="animate-spin" />,
  downloading:        <Download size={14} />,
  checking_integrity: <Search size={14} />,
  retrying:           <RefreshCw size={14} className="animate-spin" />,
  completed:          <CheckCircle2 size={14} />,
  failed:             <XCircle size={14} />,
  cancelled:          <XCircle size={14} />,
  partial:            <AlertTriangle size={14} />,
};

const MODE_ICONS: Record<PJEDownloadMode, React.ReactNode> = {
  by_task:   <ClipboardList size={12} />,
  by_tag:    <Tag size={12} />,
  by_number: <Hash size={12} />,
};

export function DistintivoStatus({ status }: { status: PJEJobStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {STATUS_ICONS[status]}
      {cfg.label}
    </span>
  );
}

export function DistintivoModo({ mode }: { mode: PJEDownloadMode }) {
  const cfg = MODE_CONFIG[mode];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100">
      {MODE_ICONS[mode]}
      {cfg.label}
    </span>
  );
}
