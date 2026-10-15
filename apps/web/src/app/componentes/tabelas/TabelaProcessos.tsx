// ============================================================
// componentes/tabelas/TabelaProcessos.tsx
// Tabela de processos no estilo planilha: cabeçalho fixo, colunas
// ordenáveis, linha selecionável, "mostrar mais".
// Reutilizada por: servidor (Meus Processos), chefe (acervo, revisão).
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Lock, Star, Hourglass } from 'lucide-react';
import type { ProcessoFila } from '../../types/processo';
import {
  PRIORIDADE_CORES, SITUACAO_LABELS, SITUACAO_CORES,
  STATUS_ITEM_LABELS, STATUS_ITEM_CORES, corDiasParados,
} from '../../types/processo';
import { formatarDataBR } from '../../lib/datas';
import { EstadoVazio } from '../layout/EstadoVazio';

export type ColunaProcesso =
  | 'numero' | 'tarefa' | 'classe' | 'dias' | 'prioridade'
  | 'etiquetas' | 'situacao' | 'status' | 'origem' | 'ultimoMov' | 'analisadoPor' | 'observacao';

type ColunaOrdenavel = Exclude<ColunaProcesso, 'etiquetas' | 'origem' | 'observacao'>;

/** Observação visível na listagem: a da última análise ou a do item em andamento */
export function observacaoDoProcesso(p: ProcessoFila): string {
  return p.analise?.observacao || p.observacaoItem || '';
}

interface TabelaProcessosProps {
  processos: ProcessoFila[];
  colunas?: ColunaProcesso[];
  selecionadoId?: string | null;
  onSelecionar?: (processo: ProcessoFila) => void;
  /** Coluna extra renderizada no fim de cada linha (ex.: select de servidor na revisão) */
  renderAcoes?: (processo: ProcessoFila) => React.ReactNode;
  tituloAcoes?: string;
  tamanhoPagina?: number;
  vazioTitulo?: string;
  vazioDescricao?: string;
}

const COLUNAS_PADRAO: ColunaProcesso[] = [
  'numero', 'tarefa', 'classe', 'dias', 'situacao', 'observacao', 'status', 'origem',
];

const CABECALHO: Record<ColunaProcesso, { rotulo: string; classe: string; ordenavel: boolean }> = {
  numero:       { rotulo: 'Nº do processo / partes', classe: 'text-left w-72',  ordenavel: true },
  tarefa:       { rotulo: 'Tarefa atual',            classe: 'text-left w-52',  ordenavel: true },
  classe:       { rotulo: 'Classe / assunto',        classe: 'text-left w-56',  ordenavel: true },
  dias:         { rotulo: 'Dias parados',            classe: 'text-right w-24', ordenavel: true },
  prioridade:   { rotulo: 'Prior.',                  classe: 'text-center w-20', ordenavel: true },
  etiquetas:    { rotulo: 'Etiquetas',               classe: 'text-left w-44',  ordenavel: false },
  situacao:     { rotulo: 'Situação da análise',     classe: 'text-left w-44',  ordenavel: true },
  status:       { rotulo: 'Status',                  classe: 'text-left w-28',  ordenavel: true },
  origem:       { rotulo: 'Origem',                  classe: 'text-left w-28',  ordenavel: false },
  ultimoMov:    { rotulo: 'Último movimento',        classe: 'text-left w-44',  ordenavel: true },
  analisadoPor: { rotulo: 'Analisado por',           classe: 'text-left w-40',  ordenavel: true },
  observacao:   { rotulo: 'Observação',              classe: 'text-left w-64',  ordenavel: false },
};

const ORDEM_PRIORIDADE = { P1: 0, P2: 1, P3: 2 } as const;
const ORDEM_STATUS = { em_andamento: 0, pendente: 1, concluido: 2 } as const;
const ORDEM_SITUACAO = { movimentou: 0, novo: 1, sem_novidade: 2 } as const;

function comparar(a: ProcessoFila, b: ProcessoFila, coluna: ColunaOrdenavel): number {
  switch (coluna) {
    case 'numero':       return a.numeroCnj.localeCompare(b.numeroCnj);
    case 'tarefa':       return a.tarefaAtual.localeCompare(b.tarefaAtual, 'pt-BR');
    case 'classe':       return `${a.classe} ${a.assunto}`.localeCompare(`${b.classe} ${b.assunto}`, 'pt-BR');
    case 'dias':         return a.diasParados - b.diasParados;
    case 'prioridade':   return ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || b.peso - a.peso;
    case 'situacao':     return ORDEM_SITUACAO[a.situacaoAnalise] - ORDEM_SITUACAO[b.situacaoAnalise];
    case 'status':       return ORDEM_STATUS[a.statusItem] - ORDEM_STATUS[b.statusItem];
    case 'ultimoMov':    return a.ultimoMovimentoEm.localeCompare(b.ultimoMovimentoEm);
    case 'analisadoPor': return (a.analise?.usuarioNome ?? '').localeCompare(b.analise?.usuarioNome ?? '', 'pt-BR');
  }
}

export function TabelaProcessos({
  processos,
  colunas = COLUNAS_PADRAO,
  selecionadoId = null,
  onSelecionar,
  renderAcoes,
  tituloAcoes = '',
  tamanhoPagina = 50,
  vazioTitulo = 'Nenhum processo',
  vazioDescricao = 'Ajuste os filtros ou a configuração de dígito.',
}: TabelaProcessosProps) {
  const [ordem, setOrdem] = useState<{ coluna: ColunaOrdenavel | null; direcao: 'asc' | 'desc' }>({ coluna: null, direcao: 'asc' });
  const [visiveis, setVisiveis] = useState(tamanhoPagina);

  const ordenados = useMemo(() => {
    if (!ordem.coluna) return processos;
    const mul = ordem.direcao === 'asc' ? 1 : -1;
    return [...processos].sort((a, b) => comparar(a, b, ordem.coluna!) * mul);
  }, [processos, ordem]);

  const pagina = ordenados.slice(0, visiveis);
  const temMais = visiveis < ordenados.length;

  const alternar = (coluna: ColunaProcesso) => {
    if (!CABECALHO[coluna].ordenavel) return;
    const c = coluna as ColunaOrdenavel;
    setOrdem((prev) => {
      if (prev.coluna !== c) return { coluna: c, direcao: 'asc' };
      if (prev.direcao === 'asc') return { coluna: c, direcao: 'desc' };
      return { coluna: null, direcao: 'asc' };
    });
  };

  const icone = (coluna: ColunaProcesso) => {
    if (!CABECALHO[coluna].ordenavel) return null;
    if (ordem.coluna !== coluna) return <ArrowUpDown size={12} className="text-slate-300" />;
    return ordem.direcao === 'asc'
      ? <ArrowUp size={12} className="text-blue-600" />
      : <ArrowDown size={12} className="text-blue-600" />;
  };

  if (processos.length === 0) {
    return <EstadoVazio titulo={vazioTitulo} descricao={vazioDescricao} />;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 w-8 border-r border-slate-200 text-center">#</th>
            {colunas.map((c) => (
              <th
                key={c}
                onClick={() => alternar(c)}
                className={`px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 select-none ${
                  CABECALHO[c].ordenavel ? 'cursor-pointer hover:bg-slate-200' : ''
                } ${CABECALHO[c].classe}`}
              >
                <div className={`flex items-center gap-1.5 ${CABECALHO[c].classe.includes('text-right') ? 'justify-end' : CABECALHO[c].classe.includes('text-center') ? 'justify-center' : ''}`}>
                  {CABECALHO[c].rotulo}
                  {icone(c)}
                </div>
              </th>
            ))}
            {renderAcoes && (
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-left">
                {tituloAcoes}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {pagina.map((p, idx) => {
            const selecionado = selecionadoId === p.id;
            return (
              <tr
                key={p.id}
                onClick={onSelecionar ? () => onSelecionar(p) : undefined}
                className={`border-b border-slate-100 transition-colors ${
                  onSelecionar ? 'cursor-pointer' : ''
                } ${
                  selecionado
                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                    : `border-l-2 border-l-transparent ${p.statusItem === 'concluido' ? 'bg-slate-50/60 text-slate-500' : 'hover:bg-slate-50'}`
                }`}
              >
                <td className="px-3 py-2 text-xs text-slate-400 text-center border-r border-slate-100 tabular-nums">{idx + 1}</td>
                {colunas.map((c) => (
                  <td key={c} className={`px-3 py-2 border-r border-slate-100 align-top ${CABECALHO[c].classe.replace(/w-\S+/, '')}`}>
                    <Celula coluna={c} p={p} />
                  </td>
                ))}
                {renderAcoes && (
                  <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                    {renderAcoes(p)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
        <span>
          Mostrando <strong className="text-slate-800">{pagina.length}</strong> de{' '}
          <strong className="text-slate-800">{ordenados.length}</strong> processo{ordenados.length !== 1 ? 's' : ''}
        </span>
        {temMais && (
          <button
            onClick={() => setVisiveis((v) => v + tamanhoPagina)}
            className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-500"
          >
            Mostrar mais {Math.min(tamanhoPagina, ordenados.length - visiveis)}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Células ─────────────────────────────────────────────

function Celula({ coluna, p }: { coluna: ColunaProcesso; p: ProcessoFila }) {
  switch (coluna) {
    case 'numero':
      return (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-slate-900">{p.numeroFormatado}</span>
            {p.sigiloso && <Lock size={11} className="text-slate-400" aria-label="Sigiloso" />}
            {p.prioridadeLegal && <Star size={11} className="text-amber-500" aria-label="Prioridade legal" />}
          </div>
          <p className="text-[11px] text-slate-500 truncate max-w-[17rem]" title={`${p.poloAtivo} × ${p.poloPassivo}`}>
            {p.poloAtivo} <span className="text-slate-300">×</span> {p.poloPassivo}
          </p>
        </div>
      );
    case 'tarefa':
      return (
        <div>
          <p className="text-xs text-slate-800 leading-snug flex items-center gap-1">
            {p.filaEspera && <Hourglass size={11} className="text-slate-400 flex-shrink-0" aria-label="Fila de espera" />}
            {p.tarefaAtual}
          </p>
          {p.outrasTarefas.length > 0 && (
            <p className="text-[11px] text-slate-400">+ {p.outrasTarefas.join(', ')}</p>
          )}
        </div>
      );
    case 'classe':
      return (
        <div>
          <p className="text-xs text-slate-800 leading-snug">{p.classe}</p>
          <p className="text-[11px] text-slate-500">{p.assunto}</p>
        </div>
      );
    case 'dias':
      return <span className={`tabular-nums text-sm ${corDiasParados(p.diasParados)}`}>{p.diasParados}</span>;
    case 'prioridade':
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className={`inline-block text-[11px] font-bold px-1.5 py-0.5 border ${PRIORIDADE_CORES[p.prioridade]}`}>
            {p.prioridade}
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums" title="Peso (digito-core)">{p.peso}</span>
        </div>
      );
    case 'etiquetas':
      return (
        <div className="flex flex-wrap gap-1">
          {p.etiquetas.length === 0 && <span className="text-[11px] text-slate-300">—</span>}
          {p.etiquetas.map((e) => (
            <span key={e} className={`text-[10px] font-semibold px-1.5 py-0.5 border ${
              e.startsWith('GAB_') ? 'bg-slate-800 text-white border-slate-800'
              : ['META 1', 'META 2', 'SAÚDE', 'JÚRI', 'IMPROBIDADE', 'SANEAMENTO'].includes(e)
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {e}
            </span>
          ))}
        </div>
      );
    case 'situacao':
      return (
        <div>
          <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 border ${SITUACAO_CORES[p.situacaoAnalise]}`}>
            {SITUACAO_LABELS[p.situacaoAnalise]}
          </span>
          {p.analise && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              {formatarDataBR(p.analise.analisadoEm)} · {p.analise.usuarioNome.split(' ')[0]}
            </p>
          )}
        </div>
      );
    case 'status':
      return (
        <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 border ${STATUS_ITEM_CORES[p.statusItem]}`}>
          {STATUS_ITEM_LABELS[p.statusItem]}
        </span>
      );
    case 'origem':
      return p.origem.tipo === 'digito'
        ? <span className="text-[11px] text-slate-500">Dígito</span>
        : <span className="text-[11px] text-indigo-700 font-semibold" title={p.origem.listaTitulo}>Lista</span>;
    case 'ultimoMov':
      return (
        <div>
          <p className="text-xs text-slate-800 tabular-nums">{formatarDataBR(p.ultimoMovimentoEm)}</p>
          <p className="text-[11px] text-slate-500 truncate max-w-[11rem]" title={p.ultimoMovimentoDesc}>{p.ultimoMovimentoDesc}</p>
        </div>
      );
    case 'analisadoPor':
      return p.analise
        ? (
          <div>
            <p className="text-xs text-slate-800">{p.analise.usuarioNome}</p>
            <p className="text-[11px] text-slate-500 tabular-nums">{formatarDataBR(p.analise.analisadoEm)}</p>
          </div>
        )
        : <span className="text-[11px] text-slate-300">—</span>;
    case 'observacao':
      return <CelulaObservacao texto={observacaoDoProcesso(p)} autor={p.analise?.usuarioNome} />;
  }
}

const LIMITE_PREVIA = 90;

/** Prévia da observação com "ver mais" quando o texto é longo. Clique não seleciona a linha. */
export function CelulaObservacao({ texto, autor }: { texto: string; autor?: string }) {
  const [aberta, setAberta] = useState(false);
  if (!texto) return <span className="text-[11px] text-slate-400 italic">Sem observação</span>;
  const longa = texto.length > LIMITE_PREVIA;
  const exibido = aberta || !longa ? texto : `${texto.slice(0, LIMITE_PREVIA).trimEnd()}…`;
  return (
    <div className="text-xs text-slate-700 leading-snug" onClick={(e) => e.stopPropagation()}>
      <p className={aberta ? 'whitespace-pre-wrap' : ''}>{exibido}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {autor && <span className="text-[10px] text-slate-400">{autor.split(' ')[0]}</span>}
        {longa && (
          <button
            type="button"
            onClick={() => setAberta((v) => !v)}
            className="text-[11px] font-semibold text-blue-700 hover:underline"
          >
            {aberta ? 'ver menos' : 'ver mais'}
          </button>
        )}
      </div>
    </div>
  );
}
