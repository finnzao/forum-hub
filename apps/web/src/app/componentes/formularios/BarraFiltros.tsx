// ============================================================
// app/componentes/formularios/BarraFiltros.tsx
// Barra de filtros reutilizável com busca, categoria, status e datas
// ============================================================

'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import {
  FiltrosHistorico,
  CategoriaAcao,
  StatusRegistro,
  CATEGORIAS_ACAO,
  STATUS_LABELS,
} from '../../tipos/historico';

interface BarraFiltrosProps {
  filtros: FiltrosHistorico;
  onFiltroChange: (filtros: FiltrosHistorico) => void;
  onLimpar: () => void;
  totalResultados: number;
}

export function BarraFiltros({ filtros, onFiltroChange, onLimpar, totalResultados }: BarraFiltrosProps) {
  const temFiltrosAtivos =
    filtros.busca !== '' ||
    filtros.categoria !== 'todas' ||
    filtros.status !== 'todos' ||
    filtros.dataInicio !== '' ||
    filtros.dataFim !== '';

  const atualizarFiltro = <K extends keyof FiltrosHistorico>(campo: K, valor: FiltrosHistorico[K]) => {
    onFiltroChange({ ...filtros, [campo]: valor });
  };

  return (
    <div className="bg-white border-2 border-slate-200 p-5">
      {/* Linha de busca */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nº do processo, partes ou descrição da ação..."
            value={filtros.busca}
            onChange={(e) => atualizarFiltro('busca', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>
        {temFiltrosAtivos && (
          <button
            onClick={onLimpar}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border-2 border-slate-200 hover:border-slate-400 transition-colors"
          >
            <X size={16} />
            Limpar
          </button>
        )}
      </div>

      {/* Linha de filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mr-2">
          <Filter size={16} />
          <span className="font-semibold uppercase tracking-wide text-xs">Filtros</span>
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Categoria
          </label>
          <select
            value={filtros.categoria}
            onChange={(e) => atualizarFiltro('categoria', e.target.value as CategoriaAcao | 'todas')}
            className="px-3 py-2 border-2 border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors bg-white min-w-[160px]"
          >
            <option value="todas">Todas as categorias</option>
            {Object.entries(CATEGORIAS_ACAO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Status
          </label>
          <select
            value={filtros.status}
            onChange={(e) => atualizarFiltro('status', e.target.value as StatusRegistro | 'todos')}
            className="px-3 py-2 border-2 border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors bg-white min-w-[140px]"
          >
            <option value="todos">Todos</option>
            {Object.entries(STATUS_LABELS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>

        {/* Data Início */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Data início
          </label>
          <input
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => atualizarFiltro('dataInicio', e.target.value)}
            className="px-3 py-2 border-2 border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>

        {/* Data Fim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Data fim
          </label>
          <input
            type="date"
            value={filtros.dataFim}
            onChange={(e) => atualizarFiltro('dataFim', e.target.value)}
            className="px-3 py-2 border-2 border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>

        {/* Contador de resultados */}
        <div className="ml-auto text-sm text-slate-500">
          <span className="font-bold text-slate-900">{totalResultados}</span> registro{totalResultados !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
