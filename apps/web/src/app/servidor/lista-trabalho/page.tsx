// ============================================================
// servidor/lista-trabalho/page.tsx
// Página do Servidor — Lista de Trabalho Ativa
// O servidor vê seus processos e marca execução
// ============================================================

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, FileText, Calendar, Clock, Filter,
  CheckCircle, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { BarraProgresso, CartaoLista, ListaProcessosServidor } from '../../componentes/distribuicao';
import { calcularProgresso, lerListas, atualizarStatusProcesso } from '../../lib/distribuicao';
import type { ListaTrabalho, StatusProcessoLista } from '../../types/distribuicao';

// Em produção: vem do contexto de autenticação
const SERVIDOR_ID = 'srv-1';
const NOME_SERVIDOR = 'Maria Silva';

export default function PaginaListaTrabalhoServidor() {
  const [listas, setListas] = useState<ListaTrabalho[]>([]);
  const [listaAberta, setListaAberta] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusProcessoLista | 'todos'>('todos');

  // Carregar listas do servidor
  useEffect(() => {
    const todas = lerListas();
    const minhas = todas.filter(
      (l) => l.servidorId === SERVIDOR_ID && (l.status === 'ativa' || l.status === 'concluida'),
    );
    setListas(minhas);
    if (minhas.length > 0 && !listaAberta) {
      setListaAberta(minhas[0].id);
    }
  }, []);

  const listaAtual = useMemo(
    () => listas.find((l) => l.id === listaAberta) || null,
    [listas, listaAberta],
  );

  const progresso = useMemo(
    () => (listaAtual ? calcularProgresso(listaAtual.processos) : null),
    [listaAtual],
  );

  const processosFiltrados = useMemo(() => {
    if (!listaAtual) return [];
    if (filtroStatus === 'todos') return listaAtual.processos;
    return listaAtual.processos.filter((p) => p.status === filtroStatus);
  }, [listaAtual, filtroStatus]);

  const handleAtualizarStatus = (
    listaId: string,
    processoItemId: string,
    status: StatusProcessoLista,
    obs?: string,
  ) => {
    const atualizada = atualizarStatusProcesso(listaId, processoItemId, status, obs);
    if (atualizada) {
      setListas((prev) => prev.map((l) => (l.id === listaId ? atualizada : l)));
    }
  };

  const listasAtivas = listas.filter((l) => l.status === 'ativa');
  const listasConcluidas = listas.filter((l) => l.status === 'concluida');

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario={NOME_SERVIDOR}
        subtitulo="Servidor — 1ª Vara Cível"
        tipoPerfil="servidor"
      />

      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link
              href="/servidor"
              className="hover:text-slate-900 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Painel
            </Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Minha Lista de Trabalho</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-700 border-2 border-slate-200">
              <FileText size={28} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Minha Lista de Trabalho</h2>
              <p className="text-slate-600 text-sm mt-1">
                Execute os processos atribuídos e marque conforme conclui
              </p>
            </div>
          </div>
        </div>

        {/* Sem listas */}
        {listas.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 p-12 text-center">
            <Clock size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Nenhuma lista atribuída
            </h3>
            <p className="text-sm text-slate-600">
              Você receberá uma lista de trabalho quando o chefe de cartório realizar a distribuição.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar: seletor de listas */}
            <div className="lg:col-span-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Listas Ativas ({listasAtivas.length})
              </h3>
              <div className="space-y-2 mb-6">
                {listasAtivas.map((lista) => (
                  <button
                    key={lista.id}
                    onClick={() => {
                      setListaAberta(lista.id);
                      setFiltroStatus('todos');
                    }}
                    className={`w-full text-left p-3 border-2 transition-all ${
                      listaAberta === lista.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900 truncate mb-1">
                      {lista.titulo}
                    </p>
                    <BarraProgresso
                      total={lista.processos.length}
                      concluidos={lista.processos.filter((p) => p.status === 'concluido').length}
                      tamanho="sm"
                      exibirNumeros={false}
                    />
                  </button>
                ))}
              </div>

              {listasConcluidas.length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    Concluídas ({listasConcluidas.length})
                  </h3>
                  <div className="space-y-2">
                    {listasConcluidas.map((lista) => (
                      <button
                        key={lista.id}
                        onClick={() => setListaAberta(lista.id)}
                        className={`w-full text-left p-3 border-2 transition-all opacity-60 ${
                          listaAberta === lista.id
                            ? 'border-green-600 bg-green-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-600" />
                          <p className="text-sm font-semibold text-slate-700 truncate">
                            {lista.titulo}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Conteúdo principal: processos da lista */}
            <div className="lg:col-span-3">
              {listaAtual && progresso ? (
                <div>
                  {/* Cabeçalho da lista */}
                  <div className="bg-white border-2 border-slate-200 p-5 mb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{listaAtual.titulo}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatarData(listaAtual.dataInicio)} — {formatarData(listaAtual.dataFim)}
                          </span>
                          <span>•</span>
                          <span>{listaAtual.processos.length} processos</span>
                        </div>
                      </div>
                      {listaAtual.status === 'ativa' && progresso.percentual < 100 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200">
                          <AlertTriangle size={14} className="text-amber-600" />
                          <span className="text-xs font-bold text-amber-700">
                            {progresso.pendentes + progresso.emAndamento} restantes
                          </span>
                        </div>
                      )}
                    </div>

                    <BarraProgresso
                      total={progresso.total}
                      concluidos={progresso.concluidos}
                      emAndamento={progresso.emAndamento}
                    />
                  </div>

                  {/* Filtros */}
                  <div className="flex items-center gap-2 mb-4">
                    <Filter size={14} className="text-slate-400" />
                    {(
                      [
                        { key: 'todos', rotulo: 'Todos', count: progresso.total },
                        { key: 'pendente', rotulo: 'Pendentes', count: progresso.pendentes },
                        { key: 'em_andamento', rotulo: 'Em Andamento', count: progresso.emAndamento },
                        { key: 'concluido', rotulo: 'Concluídos', count: progresso.concluidos },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFiltroStatus(f.key)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                          filtroStatus === f.key
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {f.rotulo} ({f.count})
                      </button>
                    ))}
                  </div>

                  {/* Lista de processos */}
                  <div className="bg-white border-2 border-slate-200 overflow-hidden">
                    {processosFiltrados.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">Nenhum processo com este filtro</p>
                      </div>
                    ) : (
                      <ListaProcessosServidor
                        processos={processosFiltrados}
                        listaId={listaAtual.id}
                        onAtualizarStatus={handleAtualizarStatus}
                        somenteVisualizacao={listaAtual.status === 'concluida'}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border-2 border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">Selecione uma lista à esquerda</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Rodape />
    </div>
  );
}

function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
