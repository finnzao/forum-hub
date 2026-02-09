// ============================================================
// app/componentes/cartoes/Distintivo.tsx
// Componente reutilizável de badge/distintivo
// Usado para status, categorias e prioridades em todo o sistema
// ============================================================

import React from 'react';

type VarianteDistintivo =
  | 'sucesso'
  | 'aviso'
  | 'perigo'
  | 'info'
  | 'neutro';

interface DistintivoProps {
  rotulo: string;
  variante?: VarianteDistintivo;
  comPonto?: boolean;
  tamanho?: 'sm' | 'md';
}

const CORES_VARIANTE: Record<VarianteDistintivo, { bg: string; text: string; dot: string }> = {
  sucesso: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  aviso: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  perigo: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500' },
  neutro: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
};

export function Distintivo({ rotulo, variante = 'neutro', comPonto = true, tamanho = 'sm' }: DistintivoProps) {
  const cores = CORES_VARIANTE[variante];
  const tamanhoPadding = tamanho === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${cores.bg} ${cores.text} ${tamanhoPadding}`}>
      {comPonto && (
        <span className={`w-1.5 h-1.5 rounded-full ${cores.dot}`} />
      )}
      {rotulo}
    </span>
  );
}
