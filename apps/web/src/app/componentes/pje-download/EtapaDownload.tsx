// ============================================================
// apps/web/src/app/componentes/pje-download/EtapaDownload.tsx
// Etapa 4: Configuração do Download
//
// Corrigido: keys duplicadas em etiquetas (fav-ID vs all-ID)
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  Download, ClipboardList, Tag, Hash,
  Loader2, AlertCircle, ArrowLeft, ChevronDown,
} from 'lucide-react';
import type { PerfilPJE, TarefaPJE, EtiquetaPJE, ParametrosDownload } from './types';

interface Props {
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

const MODOS: { id: ModoDownload; rotulo: string; icone: React.ReactNode; descricao: string }[] = [
  { id: 'by_task', rotulo: 'Por Tarefa', icone: <ClipboardList size={16} />, descricao: 'Baixar todos os processos de uma tarefa' },
  { id: 'by_tag', rotulo: 'Por Etiqueta', icone: <Tag size={16} />, descricao: 'Baixar processos de uma etiqueta' },
  { id: 'by_number', rotulo: 'Por Número', icone: <Hash size={16} />, descricao: 'Informar números CNJ específicos' },
];

export function EtapaDownload({
  perfil, tarefas, tarefasFavoritas, etiquetas,
  carregando, erro, onCriarJob, onVoltar,
}: Props) {
  const [modo, setModo] = useState<ModoDownload>('by_task');
  const [tarefaSelecionada, setTarefaSelecionada] = useState('');
  const [isFavorita, setIsFavorita] = useState(false);
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState('');
  const [numerosTexto, setNumerosTexto] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params: ParametrosDownload = {
      mode: modo,
      documentType: tipoDocumento || undefined,
      pjeProfileIndex: perfil.indice,
    };

    switch (modo) {
      case 'by_task':
        if (!tarefaSelecionada) return;
        params.taskName = tarefaSelecionada;
        params.isFavorite = isFavorita;
        break;
      case 'by_tag': {
        if (!etiquetaSelecionada) return;
        const tag = etiquetas.find(
          (t) => String(t.id) === etiquetaSelecionada || t.nomeTag === etiquetaSelecionada,
        );
        if (tag) {
          params.tagId = tag.id;
          params.tagName = tag.nomeTag;
        } else {
          params.tagName = etiquetaSelecionada;
        }
        break;
      }
      case 'by_number': {
        const numeros = numerosTexto
          .split(/[\n,;]+/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (numeros.length === 0) return;
        params.processNumbers = numeros;
        break;
      }
    }

    onCriarJob(params);
  };

  // Deduplicar tarefas por ID: favoritas primeiro, depois as demais (sem repetir)
  const tarefasFavUnicas = (() => {
    const seen = new Set<number>();
    return tarefasFavoritas.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  })();
  const favTaskIds = new Set(tarefasFavUnicas.map((t) => t.id));
  const tarefasNaoFavoritas = tarefas.filter((t) => !favTaskIds.has(t.id));

  // Deduplicar etiquetas por ID (a API pode retornar duplicatas)
  const etiquetasUnicas = (() => {
    const seen = new Set<number>();
    return etiquetas.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  })();

  const etiquetasFavoritas = etiquetasUnicas.filter((t) => t.favorita);
  const favEtiqIds = new Set(etiquetasFavoritas.map((t) => t.id));
  const etiquetasNaoFavoritas = etiquetasUnicas.filter((t) => !favEtiqIds.has(t.id));

  return (
    <div className="border-2 border-slate-200">
      {/* Header */}
      <div className="p-4 border-b-2 border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVoltar}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configurar Download</h3>
            <p className="text-xs text-slate-500">Perfil: {perfil.nome}</p>
          </div>
        </div>
        <Download size={18} className="text-slate-300" />
      </div>

      {/* Erro global */}
      {erro && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* Seletor de modo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            Modo de Download
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModo(m.id)}
                className={`p-3 border-2 text-left transition-colors ${
                  modo === m.id
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {m.icone}
                  <span className="text-xs font-bold text-slate-900">{m.rotulo}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{m.descricao}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Campos por modo */}
        {modo === 'by_task' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Tarefa ({tarefasFavUnicas.length + tarefasNaoFavoritas.length} disponíveis)
            </label>
            <div className="relative">
              <select
                value={tarefaSelecionada}
                onChange={(e) => {
                  setTarefaSelecionada(e.target.value);
                  setIsFavorita(favTaskIds.has(
                    tarefasFavUnicas.find((t) => t.nome === e.target.value)?.id ?? -1
                  ));
                }}
                className="w-full px-3 py-2.5 border-2 border-slate-200 focus:border-slate-900 focus:outline-none text-sm appearance-none bg-white pr-8"
              >
                <option value="">Selecione uma tarefa...</option>
                {tarefasFavUnicas.length > 0 && (
                  <optgroup label="⭐ Favoritas">
                    {tarefasFavUnicas.map((t) => (
                      <option key={`fav-task-${t.id}`} value={t.nome}>
                        {t.nome} ({t.quantidadePendente})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todas as tarefas">
                  {tarefasNaoFavoritas.map((t) => (
                    <option key={`all-task-${t.id}`} value={t.nome}>
                      {t.nome} ({t.quantidadePendente})
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {modo === 'by_tag' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Etiqueta ({etiquetas.length} disponíveis)
            </label>
            <div className="relative">
              <select
                value={etiquetaSelecionada}
                onChange={(e) => setEtiquetaSelecionada(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 focus:border-slate-900 focus:outline-none text-sm appearance-none bg-white pr-8"
              >
                <option value="">Selecione uma etiqueta...</option>
                {etiquetasFavoritas.length > 0 && (
                  <optgroup label="⭐ Favoritas">
                    {etiquetasFavoritas.map((t) => (
                      <option key={`fav-etiq-${t.id}`} value={String(t.id)}>
                        {t.nomeTag}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todas as etiquetas">
                  {etiquetasNaoFavoritas.map((t) => (
                    <option key={`all-etiq-${t.id}`} value={String(t.id)}>
                      {t.nomeTag}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {modo === 'by_number' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Números de Processo (CNJ)
            </label>
            <textarea
              value={numerosTexto}
              onChange={(e) => setNumerosTexto(e.target.value)}
              placeholder={`Um número por linha:\n0001234-56.2024.8.05.0001\n0007890-12.2024.8.05.0001`}
              rows={5}
              className="w-full px-3 py-2.5 border-2 border-slate-200 focus:border-slate-900 focus:outline-none text-sm font-mono resize-y"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Formato: NNNNNNN-DD.AAAA.J.TT.OOOO — até 500 por vez
            </p>
          </div>
        )}

        {/* Tipo de documento (opcional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            Tipo de Documento (opcional)
          </label>
          <div className="relative">
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(Number(e.target.value))}
              className="w-full px-3 py-2.5 border-2 border-slate-200 focus:border-slate-900 focus:outline-none text-sm appearance-none bg-white pr-8"
            >
              <option value={0}>Todos os documentos</option>
              <option value={1}>Sentença</option>
              <option value={2}>Decisão</option>
              <option value={3}>Despacho</option>
              <option value={59}>Petição Inicial</option>
              <option value={67}>Ato Ordinatório</option>
              <option value={161}>Acórdão</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Botão submit */}
        <button
          type="submit"
          disabled={carregando}
          className="w-full px-4 py-3 bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {carregando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {carregando ? 'Criando job...' : 'Iniciar Download'}
        </button>
      </form>
    </div>
  );
}
