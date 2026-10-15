// ============================================================
// componentes/distribuicao/PainelRevisaoDistribuicao.tsx
// Revisão da distribuição em TABELA (ARQUITETURA.md, seção 9):
// uma linha por processo, coluna "Servidor" editável, filtro por
// servidor e aviso de sobras. Substitui o acordeão com setas.
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, Users } from 'lucide-react';
import type { SugestaoDistribuicao, ServidorDistribuicao } from '../../types/distribuicao';
import { CelulaObservacao } from '../tabelas/TabelaProcessos';

interface PainelRevisaoDistribuicaoProps {
  sugestoes: SugestaoDistribuicao[];
  servidores: ServidorDistribuicao[];
  onRemoverProcesso: (processoId: string, servidorId: string) => void;
  onMoverProcesso: (processoId: string, deServidorId: string, paraServidorId: string) => void;
  /** Processos disponíveis que ficaram sem servidor (modo por cota) */
  naoDistribuidos?: number;
}

const PAGINA = 60;

function corDias(dias: number): string {
  if (dias >= 120) return 'text-red-700 font-bold';
  if (dias >= 100) return 'text-orange-600 font-bold';
  if (dias > 30) return 'text-slate-900 font-semibold';
  return 'text-slate-600';
}

export function PainelRevisaoDistribuicao({
  sugestoes,
  servidores,
  onRemoverProcesso,
  onMoverProcesso,
  naoDistribuidos = 0,
}: PainelRevisaoDistribuicaoProps) {
  const [filtroServidor, setFiltroServidor] = useState<string | 'todos'>('todos');
  const [visiveis, setVisiveis] = useState(PAGINA);

  const linhas = useMemo(() => {
    const todas = sugestoes.flatMap((s) =>
      s.processos.map((p, idx) => ({
        processo: p,
        servidorId: s.servidorId,
        servidorNome: s.servidorNome,
        ordemRecebimento: s.ordemRecebimento,
        posicaoNaFila: idx + 1,
      })),
    );
    return filtroServidor === 'todos' ? todas : todas.filter((l) => l.servidorId === filtroServidor);
  }, [sugestoes, filtroServidor]);

  const totalProcessos = sugestoes.reduce((sum, s) => sum + s.processos.length, 0);
  const pagina = linhas.slice(0, visiveis);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="text-base font-bold text-slate-900">Revisão da Distribuição</h4>
          <p className="text-xs text-slate-500">
            {totalProcessos} processos para {sugestoes.filter((s) => s.processos.length > 0).length} servidores.
            Troque o servidor direto na coluna, como numa planilha.
          </p>
        </div>
        {naoDistribuidos > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 text-xs text-amber-900">
            <AlertTriangle size={14} className="text-amber-600" />
            <span><strong>{naoDistribuidos}</strong> processos ficaram sem servidor (cotas menores que o total).</span>
          </div>
        )}
      </div>

      {/* Resumo por servidor (clicável = filtro) */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button
          onClick={() => { setFiltroServidor('todos'); setVisiveis(PAGINA); }}
          className={`px-3 py-1.5 text-xs font-semibold border ${
            filtroServidor === 'todos' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
          }`}
        >
          <Users size={12} className="inline mr-1 -mt-0.5" /> Todos ({totalProcessos})
        </button>
        {sugestoes.map((s) => {
          const servidor = servidores.find((x) => x.id === s.servidorId);
          const ativo = filtroServidor === s.servidorId;
          return (
            <button
              key={s.servidorId}
              onClick={() => { setFiltroServidor(ativo ? 'todos' : s.servidorId); setVisiveis(PAGINA); }}
              className={`px-3 py-1.5 text-xs border flex items-center gap-2 ${
                ativo ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
              }`}
              title={servidor ? `${servidor.setor} · cota original ${servidor.cota}` : undefined}
            >
              <span className={`w-5 h-5 text-[10px] font-bold flex items-center justify-center ${ativo ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                {s.ordemRecebimento}º
              </span>
              <span className="font-semibold">{s.servidorNome}</span>
              <span className={ativo ? 'text-slate-300' : 'text-slate-500'}>{s.processos.length}</span>
            </button>
          );
        })}
      </div>

      {/* Tabela */}
      <div className="border-2 border-slate-200 overflow-auto max-h-[32rem]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="px-3 py-2 text-center w-8 border-r border-slate-200">#</th>
              <th className="px-3 py-2 text-left w-56 border-r border-slate-200">Nº do processo</th>
              <th className="px-3 py-2 text-left border-r border-slate-200">Classe / situação</th>
              <th className="px-3 py-2 text-right w-24 border-r border-slate-200">Dias parados</th>
              <th className="px-3 py-2 text-left w-56 border-r border-slate-200">Observação</th>
              <th className="px-3 py-2 text-left w-52 border-r border-slate-200">Servidor</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {pagina.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Nenhum processo neste filtro</td></tr>
            )}
            {pagina.map((l, idx) => {
              const dias = parseInt(l.processo.dados.dias_sem_mov || '0', 10);
              return (
                <tr key={l.processo.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-xs text-slate-400 text-center border-r border-slate-100 tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-1.5 border-r border-slate-100">
                    <span className="font-mono text-xs font-semibold text-slate-900">{l.processo.numeroProcesso}</span>
                    {(l.processo.dados.parte_autora || l.processo.dados.parte_re) && (
                      <p className="text-[11px] text-slate-500 truncate max-w-[14rem]">
                        {l.processo.dados.parte_autora} <span className="text-slate-300">×</span> {l.processo.dados.parte_re}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-1.5 border-r border-slate-100">
                    <p className="text-xs text-slate-800">{l.processo.dados.tipo_acao || l.processo.dados.classe_judicial || '—'}</p>
                    <p className="text-[11px] text-slate-500">{l.processo.dados.situacao_atual || ''}</p>
                  </td>
                  <td className={`px-3 py-1.5 text-right border-r border-slate-100 tabular-nums ${corDias(dias)}`}>{dias}</td>
                  <td className="px-3 py-1.5 border-r border-slate-100">
                    <CelulaObservacao texto={l.processo.dados.observacao || ''} />
                  </td>
                  <td className="px-2 py-1 border-r border-slate-100">
                    <select
                      value={l.servidorId}
                      onChange={(e) => onMoverProcesso(l.processo.id, l.servidorId, e.target.value)}
                      className="w-full text-xs border border-slate-300 bg-white px-2 py-1.5 focus:outline-none focus:border-slate-900"
                    >
                      {sugestoes.map((s) => (
                        <option key={s.servidorId} value={s.servidorId}>
                          {s.ordemRecebimento}º · {s.servidorNome} ({s.processos.length})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => onRemoverProcesso(l.processo.id, l.servidorId)}
                      className="p-1 text-slate-300 hover:text-red-600"
                      title="Tirar da distribuição"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1 py-2 text-xs text-slate-500">
        <span>Mostrando <strong className="text-slate-800">{pagina.length}</strong> de <strong className="text-slate-800">{linhas.length}</strong></span>
        {visiveis < linhas.length && (
          <button onClick={() => setVisiveis((v) => v + PAGINA)} className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-500">
            Mostrar mais {Math.min(PAGINA, linhas.length - visiveis)}
          </button>
        )}
      </div>
    </div>
  );
}
