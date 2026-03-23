// ============================================================
// chefe-cartorio/acompanhamento/nova-distribuicao/page.tsx
// Página dedicada: Wizard de Nova Distribuição
// Separada do acompanhamento — foco total na configuração
//
// Etapa 1: Configuração (modo, período, servidores + ordem, critérios)
// Etapa 2: Revisão (resultado da distribuição com ajustes)
// Etapa 3: Concluído (confirma e redireciona)
// ============================================================

'use client';

import React, { useCallback } from 'react';
import {
  ArrowLeft, Shuffle, Calendar, CheckCircle,
  RotateCcw, ArrowRight, AlertCircle, Users,
  ListOrdered, SlidersHorizontal, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Cabecalho } from '../../../componentes/layout/Cabecalho';
import { Rodape } from '../../../componentes/layout/Rodape';
import {
  CartaoServidor,
  SeletorCriterios,
  PainelRevisaoDistribuicao,
} from '../../../componentes/distribuicao';
import { useDistribuicao } from '../../../hooks/useDistribuicao';
import { MODO_DISTRIBUICAO_LABELS, PERIODO_LABELS } from '../../../types/distribuicao';
import type { ModoDistribuicao, PeriodoLista } from '../../../types/distribuicao';

const NOME_USUARIO = 'Carlos Ferreira';

// ── Indicador de Etapas ─────────────────────────────────

const ETAPAS = [
  { id: 'configuracao', rotulo: 'Configuração', icone: <SlidersHorizontal size={16} /> },
  { id: 'revisao',      rotulo: 'Revisão',      icone: <FileText size={16} /> },
  { id: 'concluido',    rotulo: 'Concluído',    icone: <CheckCircle size={16} /> },
] as const;

function IndicadorEtapas({ etapaAtual }: { etapaAtual: string }) {
  const idxAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);

  return (
    <div className="flex items-center gap-1 mb-8">
      {ETAPAS.map((etapa, idx) => {
        const concluida = idx < idxAtual;
        const ativa = idx === idxAtual;
        return (
          <React.Fragment key={etapa.id}>
            {idx > 0 && (
              <div className={`flex-1 h-0.5 ${concluida ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
            <div
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors ${
                ativa
                  ? 'bg-slate-900 text-white'
                  : concluida
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {etapa.icone}
              <span className="hidden md:inline">{etapa.rotulo}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Página Principal ────────────────────────────────────

export default function PaginaNovaDistribuicao() {
  const router = useRouter();
  const dist = useDistribuicao();

  const handleConfirmar = useCallback(() => {
    dist.confirmarDistribuicao(NOME_USUARIO);
  }, [dist]);

  const handleIrParaAcompanhamento = useCallback(() => {
    router.push('/chefe-cartorio/acompanhamento');
  }, [router]);

  const totalDisponiveis = dist.processosDisponiveis.filter((p) => !p.atribuido).length;
  const totalSelecionados = dist.config.servidoresSelecionados.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario={NOME_USUARIO}
        subtitulo="Chefe de Cartório — 1ª Vara Cível"
        tipoPerfil="chefe-cartorio"
      />

      <main className="max-w-5xl mx-auto px-8 py-12">
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
            <Link
              href="/chefe-cartorio/acompanhamento"
              className="hover:text-slate-900 font-semibold"
            >
              Acompanhamento
            </Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Nova Distribuição</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-700 border-2 border-slate-200">
              <Shuffle size={28} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Nova Distribuição de Processos
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Configure como os {totalDisponiveis} processos serão distribuídos entre os servidores
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de etapas */}
        <IndicadorEtapas etapaAtual={dist.etapa} />

        {/* ══════════════════════════════════════════════════ */}
        {/* ETAPA 1: CONFIGURAÇÃO                             */}
        {/* ══════════════════════════════════════════════════ */}
        {dist.etapa === 'configuracao' && (
          <div className="space-y-6">
            {/* Erro */}
            {dist.erro && (
              <div className="p-4 bg-red-50 border-2 border-red-200 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{dist.erro}</p>
              </div>
            )}

            {/* ── Seção 1: Modo + Período ── */}
            <div className="bg-white border-2 border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <SlidersHorizontal size={18} />
                Modo e Período
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Escolha como os processos serão divididos e o período de referência da lista.
              </p>

              {/* Modo */}
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                  Modo de Distribuição
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(MODO_DISTRIBUICAO_LABELS) as [ModoDistribuicao, string][]).map(
                    ([modo, rotulo]) => (
                      <button
                        key={modo}
                        onClick={() => dist.setModo(modo)}
                        className={`p-4 border-2 text-left transition-all ${
                          dist.config.modo === modo
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className={`text-sm font-bold ${
                          dist.config.modo === modo ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {rotulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {modo === 'igualitaria'
                            ? 'Quantidade igual para todos os servidores'
                            : 'Cada servidor recebe conforme sua cota individual'}
                        </p>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                    Período
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.entries(PERIODO_LABELS) as [PeriodoLista, string][]).map(
                      ([periodo, rotulo]) => (
                        <button
                          key={periodo}
                          onClick={() => dist.setPeriodo(periodo)}
                          className={`px-3 py-2 text-xs font-bold transition-colors ${
                            dist.config.periodo === periodo
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {rotulo}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                      <Calendar size={12} className="inline mr-1" />Início
                    </label>
                    <input
                      type="date"
                      value={dist.config.dataInicio}
                      onChange={(e) => dist.setDatas(e.target.value, dist.config.dataFim)}
                      className="w-full px-3 py-2 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                      <Calendar size={12} className="inline mr-1" />Fim
                    </label>
                    <input
                      type="date"
                      value={dist.config.dataFim}
                      onChange={(e) => dist.setDatas(dist.config.dataInicio, e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Seção 2: Servidores + Ordem de Prioridade ── */}
            <div className="bg-white border-2 border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <ListOrdered size={18} />
                Servidores e Ordem de Recebimento
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                Selecione os servidores e defina quem recebe primeiro.
                O <strong>1º servidor</strong> na lista recebe os processos mais prioritários,
                o 2º recebe os seguintes, e assim por diante.
              </p>

              <div className="p-3 bg-blue-50 border-2 border-blue-200 mb-5">
                <p className="text-xs text-blue-800">
                  <strong>Como funciona:</strong> Os processos são ordenados pelos critérios de prioridade (seção abaixo).
                  Depois, são distribuídos sequencialmente — o servidor na posição 1 recebe os primeiros
                  (mais prioritários), o da posição 2 recebe os seguintes, etc.
                  Use as setas ↑↓ para reordenar.
                </p>
              </div>

              {/* Servidores selecionados (ordenáveis) */}
              {totalSelecionados > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
                    Fila de recebimento ({totalSelecionados} selecionados)
                  </label>
                  <div className="space-y-2">
                    {dist.config.servidoresSelecionados.map((servidor, idx) => (
                      <CartaoServidor
                        key={servidor.id}
                        servidor={servidor}
                        selecionado={true}
                        posicao={idx + 1}
                        totalSelecionados={totalSelecionados}
                        cotaPersonalizada={dist.config.cotaPersonalizada?.[servidor.id]}
                        onToggle={() => dist.toggleServidor(servidor)}
                        onAlterarCota={
                          dist.config.modo === 'por_cota'
                            ? (cota) => dist.setCotaServidor(servidor.id, cota)
                            : undefined
                        }
                        onMoverCima={() => dist.reordenarServidor(servidor.id, 'cima')}
                        onMoverBaixo={() => dist.reordenarServidor(servidor.id, 'baixo')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Servidores disponíveis (não selecionados) */}
              {dist.servidores.filter(
                (s) => !dist.config.servidoresSelecionados.some((sel) => sel.id === s.id),
              ).length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                    Disponíveis para selecionar
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dist.servidores
                      .filter((s) => !dist.config.servidoresSelecionados.some((sel) => sel.id === s.id))
                      .map((servidor) => (
                        <CartaoServidor
                          key={servidor.id}
                          servidor={servidor}
                          selecionado={false}
                          onToggle={() => dist.toggleServidor(servidor)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Seção 3: Critérios de Prioridade dos Processos ── */}
            <div className="bg-white border-2 border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Shuffle size={18} />
                Critérios de Prioridade dos Processos
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Defina como os processos serão ordenados antes de distribuir.
                Ex: "mais dias sem movimentação" faz com que processos parados há mais tempo
                sejam os primeiros a serem atribuídos ao 1º servidor da fila.
              </p>

              <SeletorCriterios
                criterios={dist.config.criteriosOrdenacao}
                onChange={dist.setCriterios}
                onAdicionar={dist.adicionarCriterio}
                onRemover={dist.removerCriterio}
              />
            </div>

            {/* ── Resumo e Ação ── */}
            <div className="bg-slate-100 border-2 border-slate-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">{totalDisponiveis}</strong> processos disponíveis
                    {' → '}
                    <strong className="text-slate-900">{totalSelecionados}</strong> servidores selecionados
                  </p>
                  {totalSelecionados > 0 && dist.config.modo === 'igualitaria' && (
                    <p className="text-xs text-slate-500 mt-1">
                      ≈ {Math.floor(totalDisponiveis / totalSelecionados)} processos por servidor
                    </p>
                  )}
                </div>
                <button
                  onClick={dist.gerarSugestao}
                  disabled={totalSelecionados === 0}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors ${
                    totalSelecionados > 0
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Shuffle size={16} />
                  Gerar Distribuição
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* ETAPA 2: REVISÃO                                  */}
        {/* ══════════════════════════════════════════════════ */}
        {dist.etapa === 'revisao' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-slate-200 p-6">
              <PainelRevisaoDistribuicao
                sugestoes={dist.sugestoes}
                servidores={dist.servidores}
                onRemoverProcesso={dist.removerProcessoDaSugestao}
                onMoverProcesso={dist.moverProcesso}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={dist.voltarParaConfiguracao}
                className="px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
              >
                ← Voltar à Configuração
              </button>
              <button
                onClick={handleConfirmar}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                <CheckCircle size={16} />
                Confirmar e Criar Listas
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* ETAPA 3: CONCLUÍDO                                */}
        {/* ══════════════════════════════════════════════════ */}
        {dist.etapa === 'concluido' && (
          <div className="bg-white border-2 border-slate-200 p-8">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={36} className="text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Distribuição Concluída!
              </h3>
              <p className="text-sm text-slate-600 mb-2">
                As listas de trabalho foram criadas com sucesso.
              </p>
              <p className="text-xs text-slate-500 mb-8">
                {dist.sugestoes.filter((s) => s.processos.length > 0).length} listas criadas •{' '}
                {dist.sugestoes.reduce((sum, s) => sum + s.processos.length, 0)} processos distribuídos
              </p>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={dist.resetar}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
                >
                  <RotateCcw size={16} />
                  Nova Distribuição
                </button>
                <button
                  onClick={handleIrParaAcompanhamento}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Acompanhar Listas
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Rodape />
    </div>
  );
}
