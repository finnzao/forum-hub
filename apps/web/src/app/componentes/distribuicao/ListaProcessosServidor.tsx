// ============================================================
// componentes/distribuicao/ListaProcessosServidor.tsx
// Lista de processos para o servidor marcar execução
// Cada processo pode ser: pendente → em_andamento → concluido
// ============================================================

'use client';

import React, { useState } from 'react';
import { Check, Play, Clock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProcessoNaLista, StatusProcessoLista } from '../../types/distribuicao';
import { STATUS_PROCESSO_LABELS, STATUS_PROCESSO_CORES } from '../../types/distribuicao';

interface ListaProcessosServidorProps {
  processos: ProcessoNaLista[];
  listaId: string;
  onAtualizarStatus: (listaId: string, processoItemId: string, status: StatusProcessoLista, obs?: string) => void;
  somenteVisualizacao?: boolean;
}

export function ListaProcessosServidor({
  processos,
  listaId,
  onAtualizarStatus,
  somenteVisualizacao = false,
}: ListaProcessosServidorProps) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');

  const acoesDoStatus = (status: StatusProcessoLista): StatusProcessoLista[] => {
    switch (status) {
      case 'pendente':      return ['em_andamento'];
      case 'em_andamento':  return ['concluido', 'pendente'];
      case 'concluido':     return [];
    }
  };

  const iconeStatus = (status: StatusProcessoLista) => {
    switch (status) {
      case 'pendente':     return <Clock size={14} className="text-slate-400" />;
      case 'em_andamento': return <Play size={14} className="text-amber-600" />;
      case 'concluido':    return <Check size={14} className="text-green-600" />;
    }
  };

  const handleAcao = (processoItemId: string, novoStatus: StatusProcessoLista) => {
    onAtualizarStatus(listaId, processoItemId, novoStatus, observacao || undefined);
    setObservacao('');
    setExpandido(null);
  };

  return (
    <div className="divide-y divide-slate-100">
      {processos.map((processo) => {
        const cores = STATUS_PROCESSO_CORES[processo.status];
        const acoes = acoesDoStatus(processo.status);
        const estaExpandido = expandido === processo.id;

        return (
          <div key={processo.id} className={`${cores.bg}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Status */}
              <div className={`w-7 h-7 flex items-center justify-center border ${cores.border} ${cores.bg}`}>
                {iconeStatus(processo.status)}
              </div>

              {/* Dados do processo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-semibold text-slate-900 truncate">
                  {processo.numeroProcesso}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{processo.dados.tipo_acao || 'Sem tipo'}</span>
                  {processo.dados.dias_sem_mov && (
                    <>
                      <span>•</span>
                      <span>{processo.dados.dias_sem_mov} dias s/ mov.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badge de status */}
              <span className={`text-[10px] font-bold px-2 py-0.5 border ${cores.bg} ${cores.text} ${cores.border}`}>
                {STATUS_PROCESSO_LABELS[processo.status]}
              </span>

              {/* Ações */}
              {!somenteVisualizacao && acoes.length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {acoes.map((acao) => (
                    <button
                      key={acao}
                      onClick={() => {
                        if (acao === 'concluido') {
                          setExpandido(estaExpandido ? null : processo.id);
                        } else {
                          handleAcao(processo.id, acao);
                        }
                      }}
                      className={`px-2 py-1 text-xs font-bold transition-colors ${
                        acao === 'concluido'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : acao === 'em_andamento'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                      }`}
                    >
                      {acao === 'concluido' ? 'Concluir' : acao === 'em_andamento' ? 'Iniciar' : 'Voltar'}
                    </button>
                  ))}

                  {/* Toggle observação */}
                  {processo.status !== 'concluido' && (
                    <button
                      onClick={() => setExpandido(estaExpandido ? null : processo.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {estaExpandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Painel expandido com observação */}
            {estaExpandido && (
              <div className="px-4 pb-3 border-t border-slate-200">
                <div className="flex items-start gap-2 mt-2">
                  <MessageSquare size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                  <input
                    type="text"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observação (opcional)..."
                    className="flex-1 px-2 py-1.5 border-2 border-slate-200 text-xs focus:outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={() => handleAcao(processo.id, 'concluido')}
                    className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700"
                  >
                    Confirmar Conclusão
                  </button>
                </div>
                {processo.observacao && (
                  <p className="text-xs text-slate-500 mt-2 ml-6">
                    Obs. anterior: {processo.observacao}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
