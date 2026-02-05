// componentes/CardEstatistica.tsx
import React from 'react';

interface CardEstatisticaProps {
  titulo: string;
  valor: string | number;
  icone: React.ReactNode;
  cor?: 'azul' | 'verde' | 'ambar' | 'vermelho' | 'roxo';
  tendencia?: {
    valor: string;
    positiva: boolean;
  };
}

export const CardEstatistica: React.FC<CardEstatisticaProps> = ({
  titulo,
  valor,
  icone,
  cor = 'azul',
  tendencia,
}) => {
  const obterCores = () => {
    switch (cor) {
      case 'verde':
        return {
          bg: 'bg-green-100',
          texto: 'text-green-700',
          borda: 'border-green-200',
        };
      case 'ambar':
        return {
          bg: 'bg-amber-100',
          texto: 'text-amber-700',
          borda: 'border-amber-200',
        };
      case 'vermelho':
        return {
          bg: 'bg-red-100',
          texto: 'text-red-700',
          borda: 'border-red-200',
        };
      case 'roxo':
        return {
          bg: 'bg-purple-100',
          texto: 'text-purple-700',
          borda: 'border-purple-200',
        };
      default:
        return {
          bg: 'bg-blue-100',
          texto: 'text-blue-700',
          borda: 'border-blue-200',
        };
    }
  };

  const cores = obterCores();

  return (
    <div className="bg-white border-2 border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            {titulo}
          </p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{valor}</p>
          {tendencia && (
            <p
              className={`text-xs font-semibold ${
                tendencia.positiva ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {tendencia.positiva ? '↑' : '↓'} {tendencia.valor}
            </p>
          )}
        </div>
        <div className={`p-3 ${cores.bg} ${cores.texto} border-2 ${cores.borda}`}>
          {icone}
        </div>
      </div>
    </div>
  );
};
