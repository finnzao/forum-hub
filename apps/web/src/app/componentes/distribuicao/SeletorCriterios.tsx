// ============================================================
// componentes/distribuicao/SeletorCriterios.tsx
// Seletor de critérios de ordenação/prioridade
// Permite adicionar, remover e reordenar critérios
// ============================================================

'use client';

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, GripVertical } from 'lucide-react';
import type { CriterioOrdenacao } from '../../types/distribuicao';
import { CRITERIOS_DISPONIVEIS } from '../../lib/distribuicao';

interface SeletorCriteriosProps {
  criterios: CriterioOrdenacao[];
  onChange: (criterios: CriterioOrdenacao[]) => void;
  onAdicionar: (criterio: CriterioOrdenacao) => void;
  onRemover: (indice: number) => void;
}

export function SeletorCriterios({
  criterios,
  onChange,
  onAdicionar,
  onRemover,
}: SeletorCriteriosProps) {
  const [adicionando, setAdicionando] = useState(false);

  const criteriosDisponiveis = CRITERIOS_DISPONIVEIS.filter(
    (c) => !criterios.some((sel) => sel.campo === c.campo && sel.direcao === c.direcao),
  );

  const moverCima = (idx: number) => {
    if (idx <= 0) return;
    const novos = [...criterios];
    [novos[idx - 1], novos[idx]] = [novos[idx], novos[idx - 1]];
    onChange(novos);
  };

  const moverBaixo = (idx: number) => {
    if (idx >= criterios.length - 1) return;
    const novos = [...criterios];
    [novos[idx], novos[idx + 1]] = [novos[idx + 1], novos[idx]];
    onChange(novos);
  };

  return (
    <div>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
        Critérios de Prioridade (ordem importa)
      </label>
      <p className="text-xs text-slate-500 mb-3">
        Defina como os processos serão ordenados antes de distribuir.
        O primeiro critério é o mais importante.
      </p>

      {/* Lista de critérios ativos */}
      <div className="space-y-1 mb-3">
        {criterios.map((criterio, idx) => (
          <div
            key={`${criterio.campo}-${criterio.direcao}`}
            className="flex items-center gap-2 p-2 bg-white border-2 border-slate-200"
          >
            <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
            <span className="w-6 h-6 bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </span>
            <span className="text-sm text-slate-700 flex-1">{criterio.rotulo}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => moverCima(idx)}
                disabled={idx === 0}
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => moverBaixo(idx)}
                disabled={idx === criterios.length - 1}
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => onRemover(idx)}
                className="p-1 text-slate-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {criterios.length === 0 && (
        <div className="p-4 border-2 border-dashed border-slate-200 text-center mb-3">
          <p className="text-xs text-slate-400">Nenhum critério selecionado. Os processos não serão reordenados.</p>
        </div>
      )}

      {/* Adicionar novo critério */}
      {adicionando ? (
        <div className="space-y-1 p-3 bg-slate-50 border-2 border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2">Selecione um critério:</p>
          {criteriosDisponiveis.map((c) => (
            <button
              key={`${c.campo}-${c.direcao}`}
              onClick={() => {
                onAdicionar(c);
                setAdicionando(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-white hover:border-slate-400 border-2 border-transparent transition-colors"
            >
              {c.rotulo}
            </button>
          ))}
          <button
            onClick={() => setAdicionando(false)}
            className="text-xs text-slate-500 hover:text-slate-700 mt-2"
          >
            Cancelar
          </button>
        </div>
      ) : (
        criteriosDisponiveis.length > 0 && (
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Plus size={14} />
            Adicionar critério
          </button>
        )
      )}
    </div>
  );
}
