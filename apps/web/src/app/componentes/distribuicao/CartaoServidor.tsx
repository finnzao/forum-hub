// ============================================================
// componentes/distribuicao/CartaoServidor.tsx
// Cartão de servidor com ordem de prioridade de recebimento
// Exibe posição na fila + controles para reordenar
// ============================================================

'use client';

import React from 'react';
import { User, Check, ArrowUp, ArrowDown } from 'lucide-react';
import type { ServidorDistribuicao } from '../../types/distribuicao';

interface CartaoServidorProps {
  servidor: ServidorDistribuicao;
  selecionado: boolean;
  posicao?: number;             // posição na fila (1-based)
  totalSelecionados?: number;
  cotaPersonalizada?: number;
  onToggle: () => void;
  onAlterarCota?: (novaCota: number) => void;
  onMoverCima?: () => void;
  onMoverBaixo?: () => void;
}

export function CartaoServidor({
  servidor,
  selecionado,
  posicao,
  totalSelecionados = 0,
  cotaPersonalizada,
  onToggle,
  onAlterarCota,
  onMoverCima,
  onMoverBaixo,
}: CartaoServidorProps) {
  const cotaAtual = cotaPersonalizada ?? servidor.cota;

  return (
    <div
      className={`p-4 border-2 transition-all ${
        selecionado
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Ordem de recebimento (quando selecionado) */}
        {selecionado && posicao !== undefined ? (
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onMoverCima?.(); }}
              disabled={posicao <= 1}
              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowUp size={12} />
            </button>
            <span className="w-8 h-8 bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              {posicao}º
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onMoverBaixo?.(); }}
              disabled={posicao >= totalSelecionados}
              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        ) : (
          <div
            onClick={onToggle}
            className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-400 cursor-pointer hover:bg-slate-200"
          >
            <User size={18} />
          </div>
        )}

        {/* Info do servidor */}
        <div className="flex-1 min-w-0" onClick={selecionado ? undefined : onToggle}>
          <p className={`text-sm font-bold truncate ${
            selecionado ? 'text-slate-900' : 'text-slate-700'
          }`}>
            {servidor.nome}
          </p>
          <p className="text-xs text-slate-500">{servidor.setor}</p>
          {selecionado && posicao !== undefined && (
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
              {posicao === 1
                ? 'Recebe os processos mais prioritários'
                : `Recebe os processos após o ${posicao - 1}º servidor`}
            </p>
          )}
        </div>

        {/* Cota editável */}
        {selecionado && onAlterarCota && (
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Cota</label>
            <input
              type="number"
              min={1}
              max={500}
              value={cotaAtual}
              onChange={(e) => onAlterarCota(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2 py-1 border-2 border-slate-300 text-sm text-center font-bold focus:outline-none focus:border-slate-900"
            />
          </div>
        )}

        {/* Cota padrão (não selecionado) */}
        {!selecionado && (
          <span className="text-xs text-slate-400 font-semibold flex-shrink-0">
            Cota: {servidor.cota}
          </span>
        )}

        {/* Botão remover */}
        {selecionado && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1.5 text-slate-400 hover:text-red-600 flex-shrink-0"
            title="Remover servidor"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
