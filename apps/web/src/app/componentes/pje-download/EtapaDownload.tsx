// ============================================================
// app/componentes/pje-download/EtapaDownload.tsx
// Etapa 3 — Configuração do download (modo + parâmetros)
// Mostra tarefas/etiquetas reais carregadas do perfil selecionado
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  ClipboardList, Tag, Hash, Play, Loader2, AlertTriangle,
  ChevronDown, Info, Star, Plus, X, Search,
} from 'lucide-react';
import {
  type PJEDownloadMode,
  type TarefaPJE,
  type EtiquetaPJE,
  type PerfilPJE,
  MODE_CONFIG,
  DOCUMENT_TYPES,
  CNJ_PATTERN,
} from './tipos';

// ── Ícones de modo (estáticos, sem cloneElement) ─────────────

const ICONE_MODO: Record<PJEDownloadMode, React.ReactNode> = {
  by_task:   <ClipboardList size={18} />,
  by_tag:    <Tag size={18} />,
  by_number: <Hash size={18} />,
};

// ── Props ────────────────────────────────────────────────────

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

export interface ParametrosDownload {
  mode: PJEDownloadMode;
  taskName?: string;
  isFavorite?: boolean;
  tagId?: number;
  tagName?: string;
  processNumbers?: string[];
  documentType?: number;
  pjeProfileIndex: number;
}

// ── Componente ───────────────────────────────────────────────

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
  const [modo, setModo] = useState<PJEDownloadMode>('by_task');
  const [tarefaSelecionada, setTarefaSelecionada] = useState('');
  const [ehFavorita, setEhFavorita] = useState(false);
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState('');
  const [buscaEtiqueta, setBuscaEtiqueta] = useState('');
  const [numerosProcesso, setNumerosProcesso] = useState<string[]>([]);
  const [inputNumero, setInputNumero] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState(0);

  // Filtrar tarefas com base no checkbox favoritas
  const tarefasExibidas = ehFavorita ? tarefasFavoritas : tarefas;

  // Filtrar etiquetas pela busca
  const etiquetasFiltradas = buscaEtiqueta
    ? etiquetas.filter((e) =>
        e.nomeTag.toLowerCase().includes(buscaEtiqueta.toLowerCase())
      )
    : etiquetas;

  // ── Handlers ───────────────────────────────────────────────

  const adicionarNumero = () => {
    const trimmed = inputNumero.trim();
    if (!trimmed) return;
    const nums = trimmed.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
    setNumerosProcesso((prev) => [...new Set([...prev, ...nums])]);
    setInputNumero('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params: ParametrosDownload = {
      mode: modo,
      documentType: tipoDocumento || undefined,
      pjeProfileIndex: perfil.indice,
    };

    switch (modo) {
      case 'by_task': {
        if (!tarefaSelecionada) return;
        params.taskName = tarefaSelecionada;
        params.isFavorite = ehFavorita;
        break;
      }
      case 'by_tag': {
        const tag = etiquetas.find((e) => String(e.id) === etiquetaSelecionada);
        if (!tag) return;
        params.tagId = tag.id;
        params.tagName = tag.nomeTag;
        break;
      }
      case 'by_number': {
        if (numerosProcesso.length === 0) return;
        params.processNumbers = numerosProcesso;
        break;
      }
    }

    onCriarJob(params);
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">
      {/* Contexto do perfil */}
      <div className="bg-slate-100 border-2 border-slate-200 p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
            <Star size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{perfil.nome}</p>
            <p className="text-xs text-slate-500">{perfil.orgao}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onVoltar}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Trocar perfil →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Seleção de modo ──────────────────────────────── */}
        <div className="border-2 border-slate-200 bg-white">
          <div className="grid grid-cols-3">
            {(['by_task', 'by_tag', 'by_number'] as const).map((m) => {
              const cfg = MODE_CONFIG[m];
              const ativo = modo === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`py-3 px-2 text-center transition-colors border-b-2 ${
                    ativo
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {ICONE_MODO[m]}
                    <span className="text-xs font-bold">{cfg.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-5">
            <p className="text-xs text-slate-500 mb-5">{MODE_CONFIG[modo].description}</p>

            {/* ── Por Tarefa ──────────────────────────────── */}
            {modo === 'by_task' && (
              <div className="space-y-4">
                {/* Toggle favoritas */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => {
                      setEhFavorita(!ehFavorita);
                      setTarefaSelecionada('');
                    }}
                    className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                      ehFavorita
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-300 group-hover:border-slate-500'
                    }`}
                  >
                    {ehFavorita && <Star size={12} className="text-white" fill="white" />}
                  </button>
                  <span className="text-sm text-slate-700">Apenas favoritas</span>
                </label>

                {/* Lista de tarefas */}
                <div className="border-2 border-slate-200 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {tarefasExibidas.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">
                      Nenhuma tarefa {ehFavorita ? 'favorita ' : ''}encontrada neste perfil.
                    </div>
                  ) : (
                    tarefasExibidas.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          tarefaSelecionada === t.nome
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="tarefa"
                            value={t.nome}
                            checked={tarefaSelecionada === t.nome}
                            onChange={(e) => setTarefaSelecionada(e.target.value)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                              tarefaSelecionada === t.nome
                                ? 'border-blue-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {tarefaSelecionada === t.nome && (
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <span className="text-sm text-slate-800">{t.nome}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5">
                          {t.quantidadePendente}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Por Etiqueta ────────────────────────────── */}
            {modo === 'by_tag' && (
              <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={buscaEtiqueta}
                    onChange={(e) => setBuscaEtiqueta(e.target.value)}
                    placeholder="Buscar etiqueta..."
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 text-sm focus:border-slate-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Lista de etiquetas */}
                <div className="border-2 border-slate-200 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {etiquetasFiltradas.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">
                      Nenhuma etiqueta encontrada.
                    </div>
                  ) : (
                    etiquetasFiltradas.map((e) => (
                      <label
                        key={e.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          etiquetaSelecionada === String(e.id)
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="etiqueta"
                          value={String(e.id)}
                          checked={etiquetaSelecionada === String(e.id)}
                          onChange={(ev) => setEtiquetaSelecionada(ev.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                            etiquetaSelecionada === String(e.id) ? 'border-blue-600' : 'border-slate-300'
                          }`}
                        >
                          {etiquetaSelecionada === String(e.id) && (
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-800 truncate block">
                            {e.nomeTag}
                          </span>
                        </div>
                        {e.favorita && <Star size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Por Número ──────────────────────────────── */}
            {modo === 'by_number' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputNumero}
                    onChange={(e) => setInputNumero(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarNumero(); } }}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="flex-1 px-3 py-2.5 border-2 border-slate-200 text-sm font-mono focus:border-slate-900 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={adicionarNumero}
                    className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
                </p>

                {numerosProcesso.length > 0 && (
                  <div className="border-2 border-slate-200 divide-y-2 divide-slate-100">
                    <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        {numerosProcesso.length} processo{numerosProcesso.length !== 1 ? 's' : ''}
                      </span>
                      <button type="button" onClick={() => setNumerosProcesso([])} className="text-xs text-red-600 hover:text-red-800 font-semibold">
                        Limpar
                      </button>
                    </div>
                    {numerosProcesso.map((num, idx) => {
                      const valido = CNJ_PATTERN.test(num);
                      return (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                          <span className={`text-sm font-mono ${valido ? 'text-slate-800' : 'text-red-600'}`}>{num}</span>
                          <div className="flex items-center gap-2">
                            {!valido && <span className="text-xs text-red-500 font-medium">Inválido</span>}
                            <button type="button" onClick={() => setNumerosProcesso((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Tipo de documento ────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Documento</label>
          <div className="relative">
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm bg-white focus:border-slate-900 focus:outline-none appearance-none transition-colors"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Erro ────────────────────────────────────────── */}
        {erro && (
          <div className="p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{erro}</p>
          </div>
        )}

        {/* ── Botão de envio ──────────────────────────────── */}
        <button
          type="submit"
          disabled={carregando}
          className="w-full py-3 bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {carregando ? (
            <><Loader2 size={16} className="animate-spin" /> Criando job...</>
          ) : (
            <><Play size={16} /> Iniciar Download</>
          )}
        </button>

        <div className="p-3 bg-slate-100 flex items-start gap-2">
          <Info size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Máximo de 3 downloads simultâneos. O processamento ocorre em segundo plano.
          </p>
        </div>
      </form>
    </div>
  );
}
