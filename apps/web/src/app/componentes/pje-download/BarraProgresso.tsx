// ============================================================
// app/componentes/pje-download/BarraProgresso.tsx
// Barra de progresso para downloads PJE
// ============================================================

import React from 'react';
import { type PJEJobStatus, isJobActive } from './tipos';

interface BarraProgressoProps {
  valor: number;
  status: PJEJobStatus;
}

export function BarraProgresso({ valor, status }: BarraProgressoProps) {
  const ativo = isJobActive(status);
  const cor =
    status === 'completed' ? 'bg-emerald-500'
    : status === 'failed' ? 'bg-red-500'
    : status === 'partial' ? 'bg-amber-500'
    : 'bg-blue-600';

  return (
    <div className="w-full h-2 bg-slate-200 overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ease-out ${cor} ${ativo ? 'animate-pulse' : ''}`}
        style={{ width: `${Math.min(valor, 100)}%` }}
      />
    </div>
  );
}
