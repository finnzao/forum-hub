'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  ChevronDown,
  Edit3,
  PlusCircle,
  StickyNote,
} from 'lucide-react';
import { RegistroHistorico, TIPOS_MOVIMENTACAO } from '../types';
import { CampoForm } from './CampoForm';

interface PainelVisualizarProps {
  registro: RegistroHistorico;
  onEditar: () => void;
  onDuplicar: () => void;
  onSalvarNota: (nota: string) => void;
  onVerLembretes: () => void;
}

export function PainelVisualizar({
  registro,
  onEditar,
  onDuplicar,
  onSalvarNota,
  onVerLembretes,
}: PainelVisualizarProps) {
  const [nota, setNota] = useState(registro.nota || '');
  const [notaEditando, setNotaEditando] = useState(false);
  const temLembrete = registro.lembretes.length > 0;

  useEffect(() => {
    setNota(registro.nota || '');
    setNotaEditando(false);
  }, [registro.id, registro.nota]);

  return (
    <div className="p-4 space-y-5">
      {/* Processo */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Processo
        </label>
        <p className="font-mono text-sm text-slate-900 mt-1 font-medium">
          {registro.processo}
        </p>
      </div>

      {/* Grid info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Data
          </label>
          <p className="text-sm text-gray-800 mt-1">{registro.data}</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Qtd Atos
          </label>
          <p className="text-sm text-gray-800 mt-1 font-bold">{registro.qtdAtos}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Tipo de Movimentação
        </label>
        <p className="mt-1">
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
            {TIPOS_MOVIMENTACAO[registro.tipo]}
          </span>
        </p>
      </div>

      {/* Nota */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Nota
          </label>
          {!notaEditando && (
            <button
              onClick={() => setNotaEditando(true)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              {nota ? 'editar' : '+ adicionar'}
            </button>
          )}
        </div>
        {notaEditando ? (
          <div className="space-y-2">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none"
              placeholder="Adicione uma observação..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSalvarNota(nota);
                  setNotaEditando(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setNota(registro.nota || '');
                  setNotaEditando(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : nota ? (
          <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded px-3 py-2">
            {nota}
          </p>
        ) : (
          <p className="text-xs text-gray-400 italic">Sem observações</p>
        )}
      </div>

      {/* Lembrete */}
      <div>
        <button
          onClick={onVerLembretes}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded border transition-colors text-sm ${
            temLembrete
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {temLembrete ? <BellRing size={15} /> : <Bell size={15} />}
          <span className="font-medium">
            {temLembrete
              ? `${registro.lembretes.filter((l) => !l.concluido).length} lembrete(s) pendente(s)`
              : 'Nenhum lembrete'}
          </span>
          <ChevronDown size={14} className="ml-auto" />
        </button>
      </div>

      {/* Ações */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <button
          onClick={onDuplicar}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium"
        >
          <PlusCircle size={15} />
          Outro ato neste processo
        </button>
        <button
          onClick={onEditar}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          <Edit3 size={15} />
          Editar registro
        </button>
      </div>
    </div>
  );
}
