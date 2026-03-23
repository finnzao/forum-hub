// ============================================================
// componentes/distribuicao/PainelRevisaoDistribuicao.tsx
// Painel de revisão da distribuição sugerida
// Mostra processos por servidor com opção de ajustar
// ============================================================

'use client';

import React, { useState } from 'react';
import { User, FileText, ChevronDown, ChevronUp, Trash2, ArrowRight } from 'lucide-react';
import type { SugestaoDistribuicao, ServidorDistribuicao } from '../../types/distribuicao';

interface PainelRevisaoDistribuicaoProps {
  sugestoes: SugestaoDistribuicao[];
  servidores: ServidorDistribuicao[];
  onRemoverProcesso: (processoId: string, servidorId: string) => void;
  onMoverProcesso: (processoId: string, deServidorId: string, paraServidorId: string) => void;
}

export function PainelRevisaoDistribuicao({
  sugestoes,
  servidores,
  onRemoverProcesso,
  onMoverProcesso,
}: PainelRevisaoDistribuicaoProps) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [movendoPara, setMovendoPara] = useState<{ processoId: string; deServidor: string } | null>(null);

  const totalProcessos = sugestoes.reduce((sum, s) => sum + s.processos.length, 0);

  const toggleExpandido = (servidorId: string) => {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(servidorId)) novo.delete(servidorId);
      else novo.add(servidorId);
      return novo;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-bold text-slate-900">Revisão da Distribuição</h4>
          <p className="text-xs text-slate-500">
            {totalProcessos} processos distribuídos para {sugestoes.filter((s) => s.processos.length > 0).length} servidores
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sugestoes.map((sugestao) => {
          const expandido = expandidos.has(sugestao.servidorId);
          const servidor = servidores.find((s) => s.id === sugestao.servidorId);

          return (
            <div key={sugestao.servidorId} className="border-2 border-slate-200 bg-white">
              {/* Cabeçalho do servidor */}
              <button
                onClick={() => toggleExpandido(sugestao.servidorId)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">{sugestao.servidorNome}</p>
                    <p className="text-xs text-slate-500">
                      {servidor?.setor} • Cota original: {servidor?.cota}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 ${
                    sugestao.processos.length > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-50 text-slate-400 border border-slate-200'
                  }`}>
                    {sugestao.processos.length} processos
                  </span>
                  {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Lista de processos */}
              {expandido && (
                <div className="border-t-2 border-slate-200">
                  {sugestao.processos.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-slate-400">Nenhum processo atribuído</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {sugestao.processos.map((processo) => (
                        <div
                          key={processo.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm"
                        >
                          <FileText size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-700 flex-shrink-0 w-52">
                            {processo.numeroProcesso}
                          </span>
                          <span className="text-xs text-slate-500 truncate flex-1">
                            {processo.dados.tipo_acao || ''} • {processo.dados.dias_sem_mov || '?'} dias
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Mover para outro servidor */}
                            {movendoPara?.processoId === processo.id && movendoPara?.deServidor === sugestao.servidorId ? (
                              <div className="flex items-center gap-1">
                                {sugestoes
                                  .filter((s) => s.servidorId !== sugestao.servidorId)
                                  .map((s) => (
                                    <button
                                      key={s.servidorId}
                                      onClick={() => {
                                        onMoverProcesso(processo.id, sugestao.servidorId, s.servidorId);
                                        setMovendoPara(null);
                                      }}
                                      className="text-[10px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                      title={`Mover para ${s.servidorNome}`}
                                    >
                                      {s.servidorNome.split(' ')[0]}
                                    </button>
                                  ))}
                                <button
                                  onClick={() => setMovendoPara(null)}
                                  className="text-[10px] text-slate-500 px-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setMovendoPara({ processoId: processo.id, deServidor: sugestao.servidorId })
                                  }
                                  className="p-1 text-slate-300 hover:text-blue-600"
                                  title="Mover para outro servidor"
                                >
                                  <ArrowRight size={13} />
                                </button>
                                <button
                                  onClick={() => onRemoverProcesso(processo.id, sugestao.servidorId)}
                                  className="p-1 text-slate-300 hover:text-red-600"
                                  title="Remover"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
