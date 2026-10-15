// ============================================================
// chefe-cartorio/acervo/page.tsx
// Acervo da unidade visto pelo chefe: todos os processos capturados,
// quem é o responsável pelo dígito, situação da análise e quem analisou.
// É a "visibilidade" do ARQUITETURA.md §1, em formato de planilha.
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Database, X, Download, Hash } from 'lucide-react';

import { TabelaProcessos } from '../../componentes/tabelas/TabelaProcessos';
import {
  montarAcervoCompleto, USUARIOS_UNIDADE, CAPTURA_ATUAL, AGORA_MOCK, LISTAS_MANUAIS,
} from '../../lib/mock/acervo';
import { casaFiltroDigito, somenteDigitos } from '../../lib/cnj';
import { formatarDataHoraBR, idadeRelativa } from '../../lib/datas';
import type { ProcessoFila, SituacaoAnalise } from '../../types/processo';

type FiltroResp = 'todos' | 'sem' | string;

export default function PaginaAcervoChefe() {
  const acervo = useMemo(() => montarAcervoCompleto(), []);
  const servidores = USUARIOS_UNIDADE.filter((u) => u.perfilSistema === 'servidor');

  const [busca, setBusca] = useState('');
  const [fResp, setFResp] = useState<FiltroResp>('todos');
  const [fSituacao, setFSituacao] = useState<SituacaoAnalise | 'todos'>('todos');
  const [fEspera, setFEspera] = useState<'trabalhaveis' | 'espera' | 'todos'>('todos');

  /** Responsáveis pelo dígito (só servidores ativos) + listas manuais */
  const responsaveisDe = useMemo(() => {
    const mapa = new Map<string, { nome: string; via: 'digito' | 'lista'; ativo: boolean }[]>();
    for (const p of acervo) {
      const lista: { nome: string; via: 'digito' | 'lista'; ativo: boolean }[] = [];
      for (const s of servidores) {
        if (Object.keys(s.filtroDigito).length > 0 && casaFiltroDigito(p.numeroCnj, s.filtroDigito)) {
          lista.push({ nome: s.nome, via: 'digito', ativo: s.ativo });
        }
      }
      for (const l of LISTAS_MANUAIS) {
        if (l.processoIds.includes(p.id)) {
          const s = servidores.find((x) => x.id === l.servidorId);
          if (s) lista.push({ nome: s.nome, via: 'lista', ativo: s.ativo });
        }
      }
      mapa.set(p.id, lista);
    }
    return mapa;
  }, [acervo, servidores]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = somenteDigitos(termo);
    return acervo.filter((p) => {
      const resp = responsaveisDe.get(p.id) ?? [];
      const ativos = resp.filter((r) => r.ativo);
      if (fResp === 'sem' && ativos.length > 0) return false;
      if (fResp !== 'todos' && fResp !== 'sem' && !resp.some((r) => r.nome === fResp)) return false;
      if (fSituacao !== 'todos' && p.situacaoAnalise !== fSituacao) return false;
      if (fEspera === 'trabalhaveis' && p.filaEspera) return false;
      if (fEspera === 'espera' && !p.filaEspera) return false;
      if (termo) {
        const casaNumero = termoDigitos.length > 0 && p.numeroCnj.includes(termoDigitos);
        const casaTexto = `${p.poloAtivo} ${p.poloPassivo} ${p.tarefaAtual} ${p.assunto} ${p.etiquetas.join(' ')}`.toLowerCase().includes(termo);
        if (!casaNumero && !casaTexto) return false;
      }
      return true;
    });
  }, [acervo, responsaveisDe, busca, fResp, fSituacao, fEspera]);

  const totais = useMemo(() => {
    const semResp = acervo.filter((p) => (responsaveisDe.get(p.id) ?? []).filter((r) => r.ativo).length === 0).length;
    return {
      total: acervo.length,
      semResp,
      p1: acervo.filter((p) => p.prioridade === 'P1' && !p.filaEspera).length,
      movimentou: acervo.filter((p) => p.situacaoAnalise === 'movimentou').length,
      semNovidade: acervo.filter((p) => p.situacaoAnalise === 'sem_novidade').length,
      novos: acervo.filter((p) => p.situacaoAnalise === 'novo').length,
    };
  }, [acervo, responsaveisDe]);

  const renderResponsavel = (p: ProcessoFila) => {
    const resp = responsaveisDe.get(p.id) ?? [];
    if (resp.length === 0) return <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5">Sem responsável</span>;
    return (
      <div className="flex flex-col gap-0.5">
        {resp.map((r, i) => (
          <span key={i} className={`text-[11px] ${r.ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={r.ativo ? '' : 'Servidor inativo (férias/afastado)'}>
            {r.nome}
            <span className={`ml-1 text-[10px] ${r.via === 'lista' ? 'text-indigo-600' : 'text-slate-400'}`}>{r.via === 'lista' ? 'lista' : 'dígito'}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/chefe-cartorio" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} /> <span className="font-medium">Painel</span>
          </Link>
          <div className="w-px h-5 bg-slate-200" />
          <h2 className="text-base font-bold text-slate-900">Acervo da Unidade</h2>
          <span className="text-xs text-slate-500">Vara Criminal de Rio Real</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <Database size={13} className="text-slate-400" />
            <span>Captura de <strong>{formatarDataHoraBR(CAPTURA_ATUAL.concluidaEm)}</strong> ({idadeRelativa(CAPTURA_ATUAL.concluidaEm, AGORA_MOCK)}) · {CAPTURA_ATUAL.novos} novos, {CAPTURA_ATUAL.alterados} alterados, {CAPTURA_ATUAL.ausentes} ausentes</span>
          </div>
          <Link href="/chefe-cartorio/cobertura" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-700 border border-slate-300 hover:border-slate-500 bg-white rounded">
            <Hash size={14} /> Cobertura de dígito
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 hover:border-slate-500 bg-white rounded">
            <Download size={14} /> Exportar .xlsx
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-5 py-2.5 space-y-2">
        <div className="flex items-center gap-3 text-xs flex-wrap text-slate-500">
          <span><strong className="text-slate-900">{totais.total}</strong> processos</span>
          <span><strong className="text-red-700">{totais.semResp}</strong> sem responsável ativo</span>
          <span><strong className="text-rose-700">{totais.p1}</strong> parados há mais de 30 dias</span>
          <span><strong className="text-blue-700">{totais.novos}</strong> nunca analisados</span>
          <span><strong className="text-violet-700">{totais.movimentou}</strong> movimentaram após análise</span>
          <span><strong className="text-slate-500">{totais.semNovidade}</strong> sem novidade</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-72">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº, parte, tarefa, assunto ou etiqueta..."
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            />
            {busca && <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>

          <select value={fResp} onChange={(e) => setFResp(e.target.value)} className="text-sm border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500">
            <option value="todos">Todos os responsáveis</option>
            <option value="sem">Sem responsável ativo</option>
            {servidores.map((s) => (
              <option key={s.id} value={s.nome}>{s.nome}{s.ativo ? '' : ' (inativo)'}</option>
            ))}
          </select>

          <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value as SituacaoAnalise | 'todos')} className="text-sm border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500">
            <option value="todos">Qualquer análise</option>
            <option value="novo">Nunca analisados</option>
            <option value="movimentou">Movimentaram após análise</option>
            <option value="sem_novidade">Sem novidade</option>
          </select>

          <select value={fEspera} onChange={(e) => setFEspera(e.target.value as 'trabalhaveis' | 'espera' | 'todos')} className="text-sm border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500">
            <option value="todos">Trabalháveis + fila de espera</option>
            <option value="trabalhaveis">Só trabalháveis</option>
            <option value="espera">Só fila de espera</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <TabelaProcessos
          processos={filtrados}
          colunas={['numero', 'tarefa', 'classe', 'dias', 'etiquetas', 'situacao', 'observacao', 'analisadoPor']}
          renderAcoes={renderResponsavel}
          tituloAcoes="Responsável"
          tamanhoPagina={60}
          vazioTitulo="Nenhum processo neste filtro"
          vazioDescricao="Ajuste a busca ou os filtros acima."
        />
      </div>
    </div>
  );
}
