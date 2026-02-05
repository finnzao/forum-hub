// componentes/FiltrosInventario.tsx
import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FiltrosInventario, StatusItem } from '../types/inventario';

interface FiltrosInventarioProps {
  filtros: FiltrosInventario;
  localizacoes: string[];
  onFiltrosChange: (filtros: FiltrosInventario) => void;
}

export const FiltrosInventarioComponent: React.FC<FiltrosInventarioProps> = ({
  filtros,
  localizacoes,
  onFiltrosChange,
}) => {
  const statusOpcoes: StatusItem[] = ['ativo', 'manutencao', 'baixado'];

  const limparFiltros = () => {
    onFiltrosChange({});
  };

  const temFiltrosAtivos = Object.keys(filtros).length > 0;

  return (
    <div className="bg-white border-2 border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-slate-600" />
          <h3 className="text-lg font-bold text-slate-900">Filtros</h3>
        </div>
        {temFiltrosAtivos && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-semibold"
          >
            <X size={16} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Busca */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Nome ou tombo..."
              value={filtros.busca || ''}
              onChange={(e) =>
                onFiltrosChange({ ...filtros, busca: e.target.value || undefined })
              }
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Localização */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Localização
          </label>
          <select
            value={filtros.localizacao || ''}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                localizacao: e.target.value || undefined,
              })
            }
            className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
          >
            <option value="">Todas</option>
            {localizacoes.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Status
          </label>
          <select
            value={filtros.status || ''}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                status: (e.target.value as StatusItem) || undefined,
              })
            }
            className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
          >
            <option value="">Todos</option>
            {statusOpcoes.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
