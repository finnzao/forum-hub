// ============================================================
// chefe-cartorio/acompanhamento/page.tsx
// Página de Acompanhamento — SOMENTE monitoramento de listas
// A distribuição fica em /acompanhamento/nova-distribuicao
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Users, BarChart3, Plus,
  CheckCircle, FileText, Search, Shuffle,
} from 'lucide-react';
import Link from 'next/link';

import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { CartaoEstatistica } from '../../componentes/cartoes/CartaoEstatistica';
import { CartaoLista, BarraProgresso } from '../../componentes/distribuicao';
import {
  lerListas,
  calcularEstatisticas,
  filtrarListas,
  SERVIDORES_MOCK,
} from '../../lib/distribuicao';
import type { FiltrosListaTrabalho, ListaTrabalho, EstatisticasDistribuicao } from '../../types/distribuicao';

const NOME_USUARIO = 'Carlos Ferreira';

const ESTATISTICAS_VAZIA: EstatisticasDistribuicao = {
  totalListas: 0,
  listasAtivas: 0,
  listasConcluidas: 0,
  totalProcessosDistribuidos: 0,
  totalProcessosConcluidos: 0,
  mediaPercentualConclusao: 0,
  servidoresComAtraso: 0,
};

export default function PaginaAcompanhamento() {
  const [listas, setListas] = useState<ListaTrabalho[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasDistribuicao>(ESTATISTICAS_VAZIA);
  const [listasFiltradas, setListasFiltradas] = useState<ListaTrabalho[]>([]);
  const [filtros, setFiltros] = useState<FiltrosListaTrabalho>({
    busca: '',
    servidorId: 'todos',
    status: 'todos',
    periodo: 'todos',
    dataInicio: '',
    dataFim: '',
  });

  // Carregar dados apenas no cliente (evita hydration mismatch)
  useEffect(() => {
    setListas(lerListas());
    setEstatisticas(calcularEstatisticas());
  }, []);

  // Recalcular filtros quando listas ou filtros mudam
  useEffect(() => {
    setListasFiltradas(filtrarListas(filtros));
  }, [listas, filtros]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario={NOME_USUARIO}
        subtitulo="Chefe de Cartório — 1ª Vara Cível"
        tipoPerfil="chefe-cartorio"
      />

      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link
              href="/chefe-cartorio"
              className="hover:text-slate-900 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Painel
            </Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Acompanhamento</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-700 border-2 border-slate-200">
                <Users size={28} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Acompanhamento de Listas
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  Monitore o progresso das listas de trabalho distribuídas
                </p>
              </div>
            </div>

            {/* Ação principal: criar nova distribuição */}
            <Link
              href="/chefe-cartorio/acompanhamento/nova-distribuicao"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              Nova Distribuição
            </Link>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <CartaoEstatistica
            titulo="Listas Ativas"
            valor={estatisticas.listasAtivas}
            descricao={`${estatisticas.listasConcluidas} concluídas`}
            icone={<FileText size={24} strokeWidth={2} />}
          />
          <CartaoEstatistica
            titulo="Processos Distribuídos"
            valor={estatisticas.totalProcessosDistribuidos}
            descricao={`${estatisticas.totalProcessosConcluidos} concluídos`}
            icone={<BarChart3 size={24} strokeWidth={2} />}
          />
          <CartaoEstatistica
            titulo="Média de Conclusão"
            valor={`${estatisticas.mediaPercentualConclusao}%`}
            descricao="Listas ativas"
            icone={<CheckCircle size={24} strokeWidth={2} />}
            corDestaque={
              estatisticas.mediaPercentualConclusao >= 75 ? 'text-green-600' : 'text-amber-600'
            }
          />
          <CartaoEstatistica
            titulo="Total de Listas"
            valor={estatisticas.totalListas}
            descricao={`${estatisticas.listasAtivas} ativas`}
            icone={<Shuffle size={24} strokeWidth={2} />}
          />
        </div>

        {/* Filtros */}
        <div className="bg-white border-2 border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por servidor ou nº de processo..."
                value={filtros.busca}
                onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <select
              value={filtros.servidorId}
              onChange={(e) => setFiltros((f) => ({ ...f, servidorId: e.target.value }))}
              className="px-3 py-2 border-2 border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-400"
            >
              <option value="todos">Todos os servidores</option>
              {SERVIDORES_MOCK.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value as any }))}
              className="px-3 py-2 border-2 border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-400"
            >
              <option value="todos">Todos os status</option>
              <option value="ativa">Ativas</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>

        {/* Listas */}
        {listasFiltradas.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 p-12 text-center">
            <FileText size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">Nenhuma lista encontrada</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Crie uma nova distribuição para gerar listas de trabalho.
            </p>
            <Link
              href="/chefe-cartorio/acompanhamento/nova-distribuicao"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              Criar Distribuição
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listasFiltradas.map((lista) => (
              <CartaoLista key={lista.id} lista={lista} />
            ))}
          </div>
        )}
      </main>

      <Rodape />
    </div>
  );
}
