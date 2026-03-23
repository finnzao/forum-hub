// ============================================================
// componentes/distribuicao/BarraProgresso.tsx
// Barra de progresso visual para listas de trabalho
// Reutilizável em qualquer contexto (chefe, magistrado, servidor)
// ============================================================

'use client';

import React from 'react';

interface BarraProgressoProps {
  total: number;
  concluidos: number;
  emAndamento?: number;
  tamanho?: 'sm' | 'md' | 'lg';
  exibirNumeros?: boolean;
  exibirPercentual?: boolean;
  className?: string;
}

export function BarraProgresso({
  total,
  concluidos,
  emAndamento = 0,
  tamanho = 'md',
  exibirNumeros = true,
  exibirPercentual = true,
  className = '',
}: BarraProgressoProps) {
  const percentualConcluido = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const percentualAndamento = total > 0 ? Math.round((emAndamento / total) * 100) : 0;

  const alturas: Record<string, string> = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  const corConcluido = percentualConcluido === 100
    ? 'bg-green-500'
    : percentualConcluido >= 75
      ? 'bg-emerald-500'
      : percentualConcluido >= 50
        ? 'bg-blue-500'
        : 'bg-slate-600';

  return (
    <div className={className}>
      {(exibirNumeros || exibirPercentual) && (
        <div className="flex items-center justify-between mb-1.5">
          {exibirNumeros && (
            <span className="text-xs text-slate-500">
              <strong className="text-slate-900">{concluidos}</strong> de {total} concluídos
            </span>
          )}
          {exibirPercentual && (
            <span className={`text-xs font-bold ${
              percentualConcluido === 100 ? 'text-green-700' : 'text-slate-700'
            }`}>
              {percentualConcluido}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 overflow-hidden ${alturas[tamanho]}`}>
        <div className="h-full flex">
          <div
            className={`${corConcluido} transition-all duration-500`}
            style={{ width: `${percentualConcluido}%` }}
          />
          {emAndamento > 0 && (
            <div
              className="bg-amber-400 transition-all duration-500"
              style={{ width: `${percentualAndamento}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
