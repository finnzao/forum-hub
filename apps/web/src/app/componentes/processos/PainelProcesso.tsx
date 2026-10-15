// ============================================================
// componentes/processos/PainelProcesso.tsx
// Painel lateral de um processo: estado observado, análise anterior,
// registros de trabalho e ações. "Concluir" é uma ação só: fecha o
// item e cria o registro de trabalho (ARQUITETURA.md, seção 10).
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  X, Play, Check, RotateCcw, Undo2, Bell, Lock, Star, Tag,
  Hourglass, History, AlertCircle, ClipboardList,
} from 'lucide-react';
import type { ProcessoFila, RegistroProcesso, DadosConclusao } from '../../types/processo';
import {
  PRIORIDADE_LABELS, PRIORIDADE_CORES, SITUACAO_LABELS, SITUACAO_CORES,
  STATUS_ITEM_LABELS, STATUS_ITEM_CORES, FAIXA_LABELS, corDiasParados,
} from '../../types/processo';
import { formatarDataBR, formatarDataHoraBR } from '../../lib/datas';
import { SelectMovimentacao } from '../../servidor/historico/componentes/SelectMovimentacao';
import { TIPOS_MOVIMENTACAO, type TipoMovimentacao } from '../../servidor/historico/types';

interface PainelProcessoProps {
  processo: ProcessoFila;
  registros: RegistroProcesso[];
  onFechar: () => void;
  onIniciar: () => void;
  onVoltarPendente: () => void;
  onConcluir: (dados: DadosConclusao) => void;
  onReabrir: () => void;
}

export function PainelProcesso({
  processo: p, registros, onFechar, onIniciar, onVoltarPendente, onConcluir, onReabrir,
}: PainelProcessoProps) {
  const [concluindo, setConcluindo] = useState(false);

  return (
    <aside className="w-[27rem] min-w-[27rem] bg-white border-l border-slate-200 flex flex-col shadow-lg">
      {/* Cabeçalho */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">{p.numeroFormatado}</span>
            {p.sigiloso && <Lock size={12} className="text-slate-400" />}
            {p.prioridadeLegal && <Star size={12} className="text-amber-500" />}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[11px] font-bold px-1.5 py-0.5 border ${PRIORIDADE_CORES[p.prioridade]}`} title={PRIORIDADE_LABELS[p.prioridade]}>
              {p.prioridade} · {FAIXA_LABELS[p.faixa]} ({p.peso})
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 border ${STATUS_ITEM_CORES[p.statusItem]}`}>
              {STATUS_ITEM_LABELS[p.statusItem]}
            </span>
            {p.origem.tipo === 'lista' && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 border bg-indigo-50 text-indigo-800 border-indigo-200" title={p.origem.listaTitulo}>
                <ClipboardList size={10} className="inline mr-1 -mt-0.5" />Lista
              </span>
            )}
          </div>
        </div>
        <button onClick={onFechar} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Situação da análise */}
        <section className={`m-4 p-3 border ${SITUACAO_CORES[p.situacaoAnalise]}`}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1">{SITUACAO_LABELS[p.situacaoAnalise]}</p>
          {p.analise ? (
            <>
              <p className="text-xs">
                Analisado em <strong>{formatarDataHoraBR(p.analise.analisadoEm)}</strong> por <strong>{p.analise.usuarioNome}</strong>
                {p.analise.tipoMovimentacao && <> · {p.analise.tipoMovimentacao}</>}
              </p>
              {p.situacaoAnalise === 'movimentou' && (
                <p className="text-xs mt-1">
                  Na análise o último movimento era de {formatarDataBR(p.analise.ultimoMovimentoNaAnalise)}; agora é de{' '}
                  <strong>{formatarDataBR(p.ultimoMovimentoEm)}</strong>.
                </p>
              )}
              {p.analise.observacao && (
                <p className="text-xs mt-2 italic border-l-2 border-current pl-2">&ldquo;{p.analise.observacao}&rdquo;</p>
              )}
            </>
          ) : (
            <p className="text-xs">Nenhuma análise registrada neste processo. Você começa do zero.</p>
          )}
        </section>

        {p.origem.tipo === 'lista' && (
          <section className="mx-4 mb-4 p-3 bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            <strong>Lista manual:</strong> {p.origem.listaTitulo}. Este processo não é do seu dígito; foi atribuído pelo chefe de cartório.
          </section>
        )}

        {/* Estado observado */}
        <section className="px-4 pb-4">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Estado no PJE (captura {formatarDataHoraBR(p.capturadoEm)})</h4>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-xs">
            <Dt>Tarefa atual</Dt>
            <Dd>
              <span className="flex items-center gap-1">
                {p.filaEspera && <Hourglass size={11} className="text-slate-400" />} {p.tarefaAtual}
              </span>
              {p.outrasTarefas.length > 0 && <span className="text-slate-400"> (+ {p.outrasTarefas.join(', ')})</span>}
            </Dd>
            <Dt>Na tarefa desde</Dt><Dd>{formatarDataBR(p.dataChegadaTarefa)}</Dd>
            <Dt>Último movimento</Dt>
            <Dd>
              <span className="tabular-nums">{formatarDataBR(p.ultimoMovimentoEm)}</span>
              <span className={`ml-2 ${corDiasParados(p.diasParados)}`}>({p.diasParados} dias)</span>
              <p className="text-slate-500">{p.ultimoMovimentoDesc}</p>
            </Dd>
            <Dt>Classe</Dt><Dd>{p.classe}</Dd>
            <Dt>Assunto</Dt><Dd>{p.assunto}</Dd>
            <Dt>Polo ativo</Dt><Dd>{p.poloAtivo}</Dd>
            <Dt>Polo passivo</Dt><Dd>{p.poloPassivo}</Dd>
            <Dt>Etiquetas</Dt>
            <Dd>
              {p.etiquetas.length === 0 ? <span className="text-slate-400">—</span> : (
                <span className="flex flex-wrap gap-1">
                  {p.etiquetas.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 border border-slate-200">
                      <Tag size={9} /> {e}
                    </span>
                  ))}
                </span>
              )}
            </Dd>
          </dl>
        </section>

        {/* Registros de trabalho */}
        <section className="px-4 pb-4">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <History size={12} /> Registros de trabalho ({registros.length})
          </h4>
          {registros.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200">
              {registros.map((r) => (
                <li key={r.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{r.tipoMovimentacao}</span>
                    <span className="text-slate-500 tabular-nums">{formatarDataBR(r.data)}</span>
                  </div>
                  <p className="text-slate-500">
                    {r.usuarioNome} · {r.qtdAtos} ato{r.qtdAtos > 1 ? 's' : ''}
                  </p>
                  {r.nota && <p className="text-slate-600 mt-1">{r.nota}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {p.observacaoItem && (
          <section className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertCircle size={12} className="inline mr-1 -mt-0.5" /> {p.observacaoItem}
          </section>
        )}
      </div>

      {/* Ações */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        {concluindo ? (
          <FormConclusao
            onConfirmar={(dados) => { onConcluir(dados); setConcluindo(false); }}
            onCancelar={() => setConcluindo(false)}
          />
        ) : (
          <div className="flex gap-2">
            {p.statusItem === 'pendente' && (
              <>
                <button onClick={onIniciar} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold border-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100">
                  <Play size={14} /> Iniciar
                </button>
                <button onClick={() => setConcluindo(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700">
                  <Check size={14} /> Concluir
                </button>
              </>
            )}
            {p.statusItem === 'em_andamento' && (
              <>
                <button onClick={onVoltarPendente} className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-500">
                  <Undo2 size={14} /> Voltar
                </button>
                <button onClick={() => setConcluindo(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700">
                  <Check size={14} /> Concluir
                </button>
              </>
            )}
            {p.statusItem === 'concluido' && (
              <button onClick={onReabrir} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-500">
                <RotateCcw size={14} /> Reabrir
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Formulário de conclusão ─────────────────────────────

const LIMITE_OBSERVACAO = 500;

function FormConclusao({ onConfirmar, onCancelar }: { onConfirmar: (d: DadosConclusao) => void; onCancelar: () => void }) {
  const [tipo, setTipo] = useState<TipoMovimentacao>('despacho');
  const [qtdAtos, setQtdAtos] = useState(1);
  const [nota, setNota] = useState('');
  const [comLembrete, setComLembrete] = useState(false);
  const [lembreteData, setLembreteData] = useState('');
  const [lembreteTexto, setLembreteTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = () => {
    if (comLembrete && !lembreteData) { setErro('Informe a data do lembrete.'); return; }
    onConfirmar({
      tipoMovimentacao: TIPOS_MOVIMENTACAO[tipo],
      qtdAtos,
      nota,
      lembrete: comLembrete ? { data: lembreteData, texto: lembreteTexto } : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">O que foi feito</p>
      <div className="grid grid-cols-[1fr_4.5rem] gap-2">
        <SelectMovimentacao value={tipo} onChange={setTipo} />
        <input
          type="number" min={1} value={qtdAtos}
          onChange={(e) => setQtdAtos(parseInt(e.target.value, 10) || 1)}
          className="px-2 py-2 text-sm text-center border border-gray-300 rounded focus:outline-none focus:border-slate-500"
          title="Quantidade de atos"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
          Observação <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          value={nota} onChange={(e) => setNota(e.target.value.slice(0, LIMITE_OBSERVACAO))} rows={3}
          placeholder="Registre aqui o que quem pegar este processo depois precisa saber. Ex.: AR devolvido, expedido mandado."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 resize-none"
          maxLength={LIMITE_OBSERVACAO}
        />
        <p className="text-[10px] text-slate-400 text-right tabular-nums">{nota.length}/{LIMITE_OBSERVACAO}</p>
      </div>
      <button
        type="button" onClick={() => setComLembrete(!comLembrete)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 border text-xs ${comLembrete ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500 hover:bg-white'}`}
      >
        <Bell size={12} /> {comLembrete ? 'Lembrete ativo' : 'Adicionar lembrete'}
      </button>
      {comLembrete && (
        <div className="grid grid-cols-[8.5rem_1fr] gap-2">
          <input type="date" value={lembreteData} onChange={(e) => { setLembreteData(e.target.value); setErro(null); }}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500" />
          <input type="text" value={lembreteTexto} onChange={(e) => setLembreteTexto(e.target.value)} placeholder="Ex.: conferir AR"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500" />
        </div>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button onClick={confirmar} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700">
          <Check size={14} /> Confirmar conclusão
        </button>
        <button onClick={onCancelar} className="px-3 py-2 text-sm text-slate-600 border border-slate-300 hover:bg-white">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-slate-500">{children}</dt>;
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-slate-800 min-w-0">{children}</dd>;
}
