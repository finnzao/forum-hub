'use client';

import React, { useState } from 'react';
import { Bell, BellOff, CalendarDays, Check, Plus, X, AlertCircle } from 'lucide-react';
import { Lembrete, TIPOS_MOVIMENTACAO, TipoMovimentacao } from '../types';
import { validarDataLembrete } from '../utils';
import { DatePicker } from './DatePicker';

export interface LembreteComContexto extends Lembrete {
  registroId: string;
  tipoMov: TipoMovimentacao;
  dataMov: string;
}

interface PainelLembretesProps {
  processo: string;
  lembretes: LembreteComContexto[];
  onToggle: (registroId: string, lembreteId: string) => void;
  onExcluir: (registroId: string, lembreteId: string) => void;
  onAdicionar: (registroId: string, lembrete: { data: string; texto: string }) => void;
  registroId: string;
}

export function PainelLembretes({
  processo,
  lembretes,
  onToggle,
  onExcluir,
  onAdicionar,
  registroId,
}: PainelLembretesProps) {
  const [novoTexto, setNovoTexto] = useState('');
  const [novaData, setNovaData] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [erroData, setErroData] = useState('');

  const pendentes = lembretes.filter((l) => !l.concluido);
  const concluidos = lembretes.filter((l) => l.concluido);

  const handleAdicionar = () => {
    if (!novoTexto.trim()) return;
    const validacao = validarDataLembrete(novaData);
    if (!validacao.valido) {
      setErroData(validacao.erro!);
      return;
    }
    onAdicionar(registroId, { data: novaData, texto: novoTexto });
    setNovoTexto('');
    setNovaData('');
    setAdicionando(false);
    setErroData('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Processo */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Processo
        </label>
        <p className="font-mono text-sm text-slate-900 mt-0.5 font-medium">{processo}</p>
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
            Pendentes ({pendentes.length})
          </p>
          <div className="space-y-1.5">
            {pendentes.map((l) => (
              <div
                key={l.id}
                className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded group"
              >
                <button
                  onClick={() => onToggle(l.registroId, l.id)}
                  className="mt-0.5 w-4 h-4 border-2 border-amber-400 rounded flex-shrink-0 hover:bg-amber-200 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{l.texto}</p>
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <CalendarDays size={11} />
                    {l.data}
                    <span className="text-gray-400 ml-1">• {TIPOS_MOVIMENTACAO[l.tipoMov]}</span>
                  </p>
                </div>
                <button
                  onClick={() => onExcluir(l.registroId, l.id)}
                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concluídos */}
      {concluidos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Concluídos ({concluidos.length})
          </p>
          <div className="space-y-1.5">
            {concluidos.map((l) => (
              <div
                key={l.id}
                className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded group"
              >
                <button
                  onClick={() => onToggle(l.registroId, l.id)}
                  className="mt-0.5 w-4 h-4 border-2 border-green-400 bg-green-400 rounded flex-shrink-0 flex items-center justify-center"
                >
                  <Check size={10} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400 line-through">{l.texto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.data}</p>
                </div>
                <button
                  onClick={() => onExcluir(l.registroId, l.id)}
                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sem lembretes */}
      {lembretes.length === 0 && (
        <div className="text-center py-6">
          <BellOff size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Nenhum lembrete neste processo</p>
        </div>
      )}

      {/* Adicionar lembrete */}
      {adicionando ? (
        <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
          <input
            type="text"
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            placeholder="Descrição do lembrete..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500"
            autoFocus
          />
          <div>
            <DatePicker
              value={novaData}
              onChange={(v) => { setNovaData(v); setErroData(''); }}
              erro={erroData}
              placeholder="DD/MM/AAAA"
            />
            {erroData && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={10} />
                {erroData}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdicionar}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => { setAdicionando(false); setErroData(''); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} />
          Novo lembrete
        </button>
      )}
    </div>
  );
}
