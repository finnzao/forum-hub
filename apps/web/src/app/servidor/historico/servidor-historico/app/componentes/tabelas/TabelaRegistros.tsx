// ============================================================
// app/componentes/tabelas/TabelaRegistros.tsx
// Tabela de registros com cabeçalho fixo e agrupamento por data
// Layout inspirado em planilha Excel para facilitar transição
// ============================================================

import React from 'react';
import { RegistroAtividade } from '../../../tipos/historico';
import { LinhaRegistro } from './LinhaRegistro';
import { EstadoVazio } from '../layout/EstadoVazio';

interface TabelaRegistrosProps {
  registros: RegistroAtividade[];
  agruparPorData?: boolean;
}

export function TabelaRegistros({ registros, agruparPorData = true }: TabelaRegistrosProps) {
  if (registros.length === 0) {
    return <EstadoVazio />;
  }

  if (!agruparPorData) {
    return (
      <div className="space-y-2">
        {registros.map((registro) => (
          <LinhaRegistro key={registro.id} registro={registro} />
        ))}
      </div>
    );
  }

  // Agrupar registros por data
  const grupos = registros.reduce<Record<string, RegistroAtividade[]>>((acc, registro) => {
    const data = registro.data;
    if (!acc[data]) acc[data] = [];
    acc[data].push(registro);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grupos).map(([data, registrosGrupo]) => (
        <div key={data}>
          {/* Cabeçalho do grupo por data */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 border-2 border-slate-200">
              {data}
            </span>
            <div className="flex-1 h-0.5 bg-slate-200" />
            <span className="text-xs text-slate-500 font-semibold">
              {registrosGrupo.length} registro{registrosGrupo.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Registros do grupo */}
          <div className="space-y-2">
            {registrosGrupo.map((registro) => (
              <LinhaRegistro key={registro.id} registro={registro} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
