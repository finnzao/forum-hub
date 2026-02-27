'use client';

import React, { useState, useMemo } from 'react';
import {
  Download, ClipboardList, Tag, Hash,
  Star, List, Search, ChevronDown, ChevronUp,
  ArrowLeft, AlertCircle, Info,
} from 'lucide-react';

import type { PerfilPJE, ParametrosDownload } from './types';

// ── Tipos ─────────────────────────────────────────────────

interface TarefaPJE {
  id: number;
  nome: string;
  quantidadePendente: number;
}

interface EtiquetaPJE {
  id: number;
  nomeTag: string;
  nomeTagCompleto: string;
  favorita: boolean;
}

interface EtapaDownloadProps {
  perfil: PerfilPJE;
  tarefas: TarefaPJE[];
  tarefasFavoritas: TarefaPJE[];
  etiquetas: EtiquetaPJE[];
  carregando: boolean;
  erro: string | null;
  onCriarJob: (params: ParametrosDownload) => void;
  onVoltar: () => void;
}

type ModoDownload = 'by_task' | 'by_tag' | 'by_number';
type AbaListaTarefa = 'todas' | 'favoritas';

// ── Componente ────────────────────────────────────────────

export function EtapaDownload({
  perfil,
  tarefas,
  tarefasFavoritas,
  etiquetas,
  carregando,
  erro,
  onCriarJob,
  onVoltar,
}: EtapaDownloadProps) {
  const [modo, setModo] = useState<ModoDownload>('by_task');
  const [abaTarefa, setAbaTarefa] = useState<AbaListaTarefa>('todas');

  // Estado por modo
  const [tarefaSelecionada, setTarefaSelecionada] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState<number | null>(null);
  const [numerosProcesso, setNumerosProcesso] = useState<string>('');
  const [buscaTarefa, setBuscaTarefa] = useState<string>('');
  const [buscaEtiqueta, setBuscaEtiqueta] = useState<string>('');
  const [mostrarTodasTarefas, setMostrarTodasTarefas] = useState(false);

  // ── Filtros de busca ────────────────────────────────────

  const tarefasFiltradas = useMemo(() => {
    const lista = abaTarefa === 'favoritas' ? tarefasFavoritas : tarefas;
    if (!buscaTarefa.trim()) return lista;
    const termo = buscaTarefa.toLowerCase();
    return lista.filter((t) => t.nome.toLowerCase().includes(termo));
  }, [tarefas, tarefasFavoritas, abaTarefa, buscaTarefa]);

  const etiquetasFiltradas = useMemo(() => {
    if (!buscaEtiqueta.trim()) return etiquetas;
    const termo = buscaEtiqueta.toLowerCase();
    return etiquetas.filter(
      (e) =>
        e.nomeTag.toLowerCase().includes(termo) ||
        e.nomeTagCompleto.toLowerCase().includes(termo)
    );
  }, [etiquetas, buscaEtiqueta]);

  // Quantidade visível (com "ver mais")
  const TAREFAS_VISIVEIS_INICIAL = 10;
  const tarefasVisiveis = mostrarTodasTarefas
    ? tarefasFiltradas
    : tarefasFiltradas.slice(0, TAREFAS_VISIVEIS_INICIAL);

  // Total de processos na tarefa selecionada
  const totalProcessosTarefa = useMemo(() => {
    const lista = isFavorite ? tarefasFavoritas : tarefas;
    const t = lista.find((t) => t.nome === tarefaSelecionada);
    return t?.quantidadePendente || 0;
  }, [tarefas, tarefasFavoritas, tarefaSelecionada, isFavorite]);

  // ── Handler de seleção de tarefa ────────────────────────

  const handleSelecionarTarefa = (nome: string) => {
    setTarefaSelecionada(nome);
    // Define isFavorite com base na aba ativa
    setIsFavorite(abaTarefa === 'favoritas');
  };

  // ── Handler de submit ───────────────────────────────────

  const handleSubmit = () => {
    switch (modo) {
      case 'by_task': {
        if (!tarefaSelecionada) return;
        onCriarJob({
          mode: 'by_task',
          taskName: tarefaSelecionada,
          isFavorite, // CORREÇÃO v8: passa o flag correto
        });
        break;
      }
      case 'by_tag': {
        if (!etiquetaSelecionada) return;
        const etiqueta = etiquetas.find((e) => e.id === etiquetaSelecionada);
        onCriarJob({
          mode: 'by_tag',
          tagId: etiquetaSelecionada,
          tagName: etiqueta?.nomeTag,
        });
        break;
      }
      case 'by_number': {
        const numeros = numerosProcesso
          .split(/[\n,;]+/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (numeros.length === 0) return;
        onCriarJob({
          mode: 'by_number',
          processNumbers: numeros,
        });
        break;
      }
    }
  };

  // ── Validação de submit ─────────────────────────────────

  const podeSubmit = (): boolean => {
    if (carregando) return false;
    switch (modo) {
      case 'by_task': return !!tarefaSelecionada;
      case 'by_tag': return !!etiquetaSelecionada;
      case 'by_number': {
        const numeros = numerosProcesso.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
        return numeros.length > 0;
      }
      default: return false;
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Cabeçalho do perfil */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onVoltar}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title="Voltar para seleção de perfil"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-lg font-bold text-slate-900">Novo Download</h3>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            Perfil: <span className="font-semibold text-slate-700">{perfil.nome}</span>
          </p>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Seleção de modo */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
          Modo de Download
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'by_task' as ModoDownload, icone: <ClipboardList size={16} />, rotulo: 'Por Tarefa', desc: 'Baixar processos de uma tarefa' },
            { id: 'by_tag' as ModoDownload, icone: <Tag size={16} />, rotulo: 'Por Etiqueta', desc: 'Baixar por etiqueta/marcador' },
            { id: 'by_number' as ModoDownload, icone: <Hash size={16} />, rotulo: 'Por Número', desc: 'Informar números CNJ' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModo(m.id)}
              className={`p-3 border-2 text-left transition-all ${
                modo === m.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={modo === m.id ? 'text-slate-900' : 'text-slate-400'}>{m.icone}</span>
                <span className={`text-sm font-bold ${modo === m.id ? 'text-slate-900' : 'text-slate-600'}`}>
                  {m.rotulo}
                </span>
              </div>
              <p className="text-xs text-slate-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODO: POR TAREFA
          ══════════════════════════════════════════════════════ */}
      {modo === 'by_task' && (
        <div>
          {/* Abas: Todas as Tarefas / Minhas Tarefas */}
          <div className="mb-4">
            <div className="flex border-b-2 border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAbaTarefa('todas');
                  setTarefaSelecionada('');
                  setBuscaTarefa('');
                  setMostrarTodasTarefas(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                  abaTarefa === 'todas'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <List size={14} />
                Todas as Tarefas
                <span className={`text-xs px-1.5 py-0.5 ${
                  abaTarefa === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tarefas.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbaTarefa('favoritas');
                  setTarefaSelecionada('');
                  setBuscaTarefa('');
                  setMostrarTodasTarefas(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                  abaTarefa === 'favoritas'
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Star size={14} />
                Minhas Tarefas
                <span className={`text-xs px-1.5 py-0.5 ${
                  abaTarefa === 'favoritas' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tarefasFavoritas.length}
                </span>
              </button>
            </div>
          </div>

          {/* Explicação da aba */}
          <div className={`mb-4 p-3 flex items-start gap-2 text-xs ${
            abaTarefa === 'favoritas'
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            {abaTarefa === 'favoritas' ? (
              <span>
                <strong>Minhas Tarefas</strong> são as tarefas marcadas com estrela no PJE.
                Funcionam como um painel personalizado de favoritos, reunindo apenas os processos
                das tarefas que você priorizou. Ideal para demandas prioritárias e expedientes pendentes.
              </span>
            ) : (
              <span>
                <strong>Todas as Tarefas</strong> mostra a lista completa de tarefas disponíveis no seu perfil PJE,
                incluindo todos os processos pendentes em cada tarefa, sem filtro de favoritos.
                Selecione uma tarefa para baixar todos os processos dela.
              </span>
            )}
          </div>

          {/* Busca */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={buscaTarefa}
              onChange={(e) => {
                setBuscaTarefa(e.target.value);
                setMostrarTodasTarefas(false);
              }}
              placeholder="Buscar tarefa..."
              className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Lista de tarefas */}
          {tarefasFiltradas.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200">
              <ClipboardList size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {buscaTarefa
                  ? 'Nenhuma tarefa encontrada para esta busca.'
                  : abaTarefa === 'favoritas'
                    ? 'Nenhuma tarefa favorita. Marque tarefas com estrela no PJE.'
                    : 'Nenhuma tarefa disponível neste perfil.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {tarefasVisiveis.map((tarefa) => {
                const selecionada = tarefaSelecionada === tarefa.nome && isFavorite === (abaTarefa === 'favoritas');
                return (
                  <button
                    key={`${abaTarefa}-${tarefa.id}-${tarefa.nome}`}
                    type="button"
                    onClick={() => handleSelecionarTarefa(tarefa.nome)}
                    className={`w-full text-left p-3 border-2 transition-all flex items-center justify-between ${
                      selecionada
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {abaTarefa === 'favoritas' && (
                        <Star size={12} className="text-amber-500 flex-shrink-0" fill="currentColor" />
                      )}
                      <span className={`text-sm truncate ${selecionada ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {tarefa.nome}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 flex-shrink-0 ml-2 ${
                      selecionada
                        ? 'bg-slate-900 text-white'
                        : tarefa.quantidadePendente > 500
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tarefa.quantidadePendente}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Botão "ver mais / ver menos" */}
          {tarefasFiltradas.length > TAREFAS_VISIVEIS_INICIAL && (
            <button
              type="button"
              onClick={() => setMostrarTodasTarefas(!mostrarTodasTarefas)}
              className="w-full mt-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 border border-slate-200 hover:border-slate-300 transition-colors"
            >
              {mostrarTodasTarefas ? (
                <>
                  <ChevronUp size={12} />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Ver todas ({tarefasFiltradas.length - TAREFAS_VISIVEIS_INICIAL} restantes)
                </>
              )}
            </button>
          )}

          {/* Info sobre tarefa selecionada */}
          {tarefaSelecionada && (
            <div className="mt-4 p-3 bg-slate-50 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Tarefa selecionada</span>
                <span className={`text-xs px-2 py-0.5 font-bold ${
                  isFavorite ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isFavorite ? '⭐ Minhas Tarefas' : '📋 Todas as Tarefas'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{tarefaSelecionada}</p>
              <p className="text-xs text-slate-500 mt-1">
                {totalProcessosTarefa} processo(s) pendente(s)
                {totalProcessosTarefa > 500 && (
                  <span className="ml-1 text-amber-600 font-semibold">
                    — download será paginado automaticamente
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODO: POR ETIQUETA
          ══════════════════════════════════════════════════════ */}
      {modo === 'by_tag' && (
        <div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={buscaEtiqueta}
              onChange={(e) => setBuscaEtiqueta(e.target.value)}
              placeholder="Buscar etiqueta..."
              className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {etiquetasFiltradas.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200">
              <Tag size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {buscaEtiqueta ? 'Nenhuma etiqueta encontrada.' : 'Nenhuma etiqueta disponível.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {etiquetasFiltradas.map((etiqueta,idx) => (
                <button
                  key={`tag-${etiqueta.id}-${idx}`}
                  type="button"
                  onClick={() => setEtiquetaSelecionada(etiqueta.id)}
                  className={`w-full text-left p-3 border-2 transition-all flex items-center gap-2 ${
                    etiquetaSelecionada === etiqueta.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Tag size={12} className={etiqueta.favorita ? 'text-amber-500' : 'text-slate-400'} />
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm block truncate ${
                      etiquetaSelecionada === etiqueta.id ? 'font-bold text-slate-900' : 'text-slate-700'
                    }`}>
                      {etiqueta.nomeTagCompleto || etiqueta.nomeTag}
                    </span>
                  </div>
                  {etiqueta.favorita && <Star size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODO: POR NÚMERO
          ══════════════════════════════════════════════════════ */}
      {modo === 'by_number' && (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
            Números de Processo (CNJ)
          </label>
          <textarea
            value={numerosProcesso}
            onChange={(e) => setNumerosProcesso(e.target.value)}
            placeholder={'Cole os números de processo aqui, um por linha.\nFormato: NNNNNNN-DD.AAAA.J.TT.OOOO\n\nExemplo:\n0001234-56.2024.8.05.0001\n0007890-12.2024.8.05.0001'}
            rows={8}
            className="w-full p-3 border-2 border-slate-200 text-sm font-mono focus:border-slate-400 focus:outline-none resize-none"
          />
          <div className="flex justify-between mt-2">
            <p className="text-xs text-slate-400">
              Separe por linha, vírgula ou ponto e vírgula. Máx: 500.
            </p>
            <p className="text-xs text-slate-500 font-bold">
              {numerosProcesso.split(/[\n,;]+/).filter((n) => n.trim()).length} processo(s)
            </p>
          </div>
        </div>
      )}

      {/* Botão de download */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!podeSubmit()}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all ${
            podeSubmit()
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {carregando ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Download size={16} />
              {modo === 'by_task' && tarefaSelecionada
                ? `Baixar ${totalProcessosTarefa} processo(s) de "${tarefaSelecionada}"`
                : modo === 'by_tag' && etiquetaSelecionada
                  ? 'Baixar processos da etiqueta'
                  : modo === 'by_number'
                    ? `Baixar ${numerosProcesso.split(/[\n,;]+/).filter((n) => n.trim()).length} processo(s)`
                    : 'Selecione uma opção acima'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
