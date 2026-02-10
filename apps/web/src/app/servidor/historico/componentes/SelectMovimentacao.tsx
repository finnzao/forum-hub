'use client';

import React from 'react';
import { TipoMovimentacao, TIPOS_MOVIMENTACAO, CATEGORIAS_MOVIMENTACAO } from '../types';

interface SelectMovimentacaoProps {
  value: TipoMovimentacao;
  onChange: (value: TipoMovimentacao) => void;
  className?: string;
  /** Se true, inclui opção "Todos os tipos" com valor 'todos' */
  incluirTodos?: boolean;
}

export function SelectMovimentacao({
  value,
  onChange,
  className = 'w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 bg-white',
  incluirTodos = false,
}: SelectMovimentacaoProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TipoMovimentacao)}
      className={className}
    >
      {incluirTodos && <option value="todos">Todos os tipos</option>}
      {Object.entries(CATEGORIAS_MOVIMENTACAO).map(([categoria, tipos]) => (
        <optgroup key={categoria} label={categoria}>
          {tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {TIPOS_MOVIMENTACAO[tipo]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
