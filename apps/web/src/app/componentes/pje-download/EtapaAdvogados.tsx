'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, Search, User, Hash, ClipboardList, Tag,
  Star, List, ArrowLeft, AlertCircle, Info, Loader2,
  Download, X, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

import type { PerfilPJE } from './types';
import {
  gerarPlanilhaAdvogados, obterProgressoAdvogados,
  cancelarPlanilhaAdvogados, getDownloadUrl,
  type GerarPlanilhaParams,
} from './api-advogados';

interface TarefaPJE { id: number; nome: string; quantidadePendente: number; }
interface EtiquetaPJE { id: number; nomeTag: string; nomeTagCompleto: string; favorita: boolean; }

interface EtapaAdvogadosProps {
  perfil: PerfilPJE;
  tarefas: TarefaPJE[];
  tarefasFavoritas: TarefaPJE[];
  etiquetas: EtiquetaPJE[];
  credenciais: { cpf: string; password: string };
  sessionId?: string;
  onVoltar: () => void;
}

type FonteProcessos = 'by_task' | 'by_tag';
type AbaListaTarefa = 'todas' | 'favoritas';
type TipoFiltro = 'nome' | 'oab';

interface JobState {
  jobId: string;
  status: string;
  progress: number;
  message: string;
  totalProcesses: number;
  processedCount: number;
}

export function EtapaAdvogados({
  perfil, tarefas, tarefasFavoritas, etiquetas,
  credenciais, sessionId, onVoltar,
}: EtapaAdvogadosProps) {
  const [fonte, setFonte] = useState<FonteProcessos>('by_tag');
  const [abaTarefa, setAbaTarefa] = useState<AbaListaTarefa>('todas');

  const [tarefaSelecionada, setTarefaSelecionada] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState<number | null>(null);

  const [buscaTarefa, setBuscaTarefa] = useState('');
  const [buscaEtiqueta, setBuscaEtiqueta] = useState('');
  const [mostrarTodasTarefas, setMostrarTodasTarefas] = useState(false);

  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('nome');
  const [valorFiltro, setValorFiltro] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [job, setJob] = useState<JobState | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TAREFAS_VISIVEIS = 10;

  const tarefasFiltradas = React.useMemo(() => {
    const lista = abaTarefa === 'favoritas' ? tarefasFavoritas : tarefas;
    if (!buscaTarefa.trim()) return lista;
    const t = buscaTarefa.toLowerCase();
    return lista.filter((x) => x.nome.toLowerCase().includes(t));
  }, [tarefas, tarefasFavoritas, abaTarefa, buscaTarefa]);

  const etiquetasFiltradas = React.useMemo(() => {
    if (!buscaEtiqueta.trim()) return etiquetas;
    const t = buscaEtiqueta.toLowerCase();
    return etiquetas.filter((e) => e && ((e.nomeTag || '').toLowerCase().includes(t) || (e.nomeTagCompleto || '').toLowerCase().includes(t)));
  }, [etiquetas, buscaEtiqueta]);

  const tarefasVisiveis = mostrarTodasTarefas ? tarefasFiltradas : tarefasFiltradas.slice(0, TAREFAS_VISIVEIS);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const p = await obterProgressoAdvogados(jobId);
        setJob({
          jobId, status: p.status, progress: p.progress,
          message: p.message, totalProcesses: p.totalProcesses, processedCount: p.processedCount,
        });
        if (['completed', 'failed', 'cancelled'].includes(p.status)) {
          stopPolling();
          setCarregando(false);
        }
      } catch { /* silent */ }
    }, 3000);
  }, [stopPolling]);

  const handleSelecionarTarefa = (nome: string) => {
    setTarefaSelecionada(nome);
    setIsFavorite(abaTarefa === 'favoritas');
  };

  const podeSubmit = (): boolean => {
    if (carregando) return false;
    if (fonte === 'by_task') return !!tarefaSelecionada;
    if (fonte === 'by_tag') return !!etiquetaSelecionada;
    return false;
  };

  const handleGerar = async () => {
    setCarregando(true);
    setErro(null);
    setJob(null);

    const params: GerarPlanilhaParams = {
      credentials: credenciais,
      fonte,
      pjeSessionId: sessionId,
      pjeProfileIndex: perfil.indice,
    };

    if (fonte === 'by_task') {
      params.taskName = tarefaSelecionada;
      params.isFavorite = isFavorite;
    } else {
      params.tagId = etiquetaSelecionada!;
      const etq = etiquetas.find((e) => e.id === etiquetaSelecionada);
      params.tagName = etq?.nomeTag;
    }

    if (valorFiltro.trim()) {
      params.filtro = { tipo: tipoFiltro, valor: valorFiltro.trim() };
    }

    try {
      const result = await gerarPlanilhaAdvogados(params);
      setJob({ jobId: result.jobId, status: 'listing', progress: 0, message: 'Iniciando...', totalProcesses: 0, processedCount: 0 });
      startPolling(result.jobId);
    } catch (err: any) {
      setErro(err.message || 'Erro ao iniciar geração');
      setCarregando(false);
    }
  };

  const handleCancelar = async () => {
    if (!job) return;
    try {
      await cancelarPlanilhaAdvogados(job.jobId);
      stopPolling();
      setJob((prev) => prev ? { ...prev, status: 'cancelled', message: 'Cancelado.' } : null);
      setCarregando(false);
    } catch { /* silent */ }
  };

  const isJobDone = job && ['completed', 'failed', 'cancelled'].includes(job.status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={onVoltar} className="text-slate-400 hover:text-slate-700">
              <ArrowLeft size={16} />
            </button>
            <FileSpreadsheet size={20} className="text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Planilha de Advogados</h3>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            Perfil: <span className="font-semibold text-slate-700">{perfil.nome}</span>
          </p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Job em andamento */}
      {job && (
        <div className={`mb-6 p-4 border-2 ${
          job.status === 'completed' ? 'border-emerald-300 bg-emerald-50' :
          job.status === 'failed' ? 'border-red-300 bg-red-50' :
          'border-blue-300 bg-blue-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {job.status === 'completed' ? <CheckCircle size={16} className="text-emerald-600" /> :
               job.status === 'failed' ? <AlertCircle size={16} className="text-red-600" /> :
               <Loader2 size={16} className="text-blue-600 animate-spin" />}
              <span className="text-sm font-bold text-slate-900">{job.message}</span>
            </div>
            {!isJobDone && (
              <button type="button" onClick={handleCancelar} className="text-xs font-bold text-red-600 hover:text-red-800">
                <X size={14} />
              </button>
            )}
          </div>

          {!isJobDone && (
            <div className="w-full h-2 bg-slate-200 overflow-hidden mb-1">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${job.progress}%` }} />
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-500">
            <span>{job.processedCount}/{job.totalProcesses || '?'} processos</span>
            <span>{job.progress}%</span>
          </div>

          {job.status === 'completed' && (
            <a
              href={getDownloadUrl(job.jobId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              <Download size={16} />
              Baixar Planilha
            </a>
          )}
        </div>
      )}

      {/* Fonte de processos */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
          Fonte dos Processos
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'by_tag' as FonteProcessos, icone: <Tag size={16} />, rotulo: 'Por Etiqueta' },
            { id: 'by_task' as FonteProcessos, icone: <ClipboardList size={16} />, rotulo: 'Por Tarefa' },
          ].map((m) => (
            <button key={m.id} type="button" onClick={() => setFonte(m.id)}
              className={`p-3 border-2 text-left transition-all ${
                fonte === m.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}>
              <div className="flex items-center gap-2">
                <span className={fonte === m.id ? 'text-slate-900' : 'text-slate-400'}>{m.icone}</span>
                <span className={`text-sm font-bold ${fonte === m.id ? 'text-slate-900' : 'text-slate-600'}`}>{m.rotulo}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de advogado */}
      <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-amber-700" />
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
            Filtrar por Advogado (opcional)
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={() => setTipoFiltro('nome')}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              tipoFiltro === 'nome' ? 'bg-amber-700 text-white' : 'bg-white border border-amber-300 text-amber-700'
            }`}>
            <User size={12} className="inline mr-1" />Nome
          </button>
          <button type="button" onClick={() => setTipoFiltro('oab')}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              tipoFiltro === 'oab' ? 'bg-amber-700 text-white' : 'bg-white border border-amber-300 text-amber-700'
            }`}>
            <Hash size={12} className="inline mr-1" />OAB
          </button>
        </div>
        <input
          type="text"
          value={valorFiltro}
          onChange={(e) => setValorFiltro(e.target.value)}
          placeholder={tipoFiltro === 'nome'
            ? 'Ex: Felipe, Paulo Eduardo...'
            : 'Ex: BA33407, SE6662...'}
          className="w-full px-3 py-2 border-2 border-amber-200 text-sm focus:border-amber-400 focus:outline-none bg-white"
        />
        <p className="text-xs text-amber-600 mt-2">
          {tipoFiltro === 'nome'
            ? 'A planilha conterá apenas processos com advogados cujo nome contenha o termo digitado.'
            : 'A planilha conterá apenas processos com advogados cuja OAB contenha o número digitado.'}
          {!valorFiltro.trim() && ' Deixe vazio para incluir todos os processos.'}
        </p>
      </div>

      {/* Seleção por tarefa */}
      {fonte === 'by_task' && (
        <div className="mb-6">
          <div className="flex border-b-2 border-slate-200 mb-4">
            <button type="button" onClick={() => { setAbaTarefa('todas'); setTarefaSelecionada(''); setBuscaTarefa(''); setMostrarTodasTarefas(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                abaTarefa === 'todas' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <List size={14} /> Todas
              <span className={`text-xs px-1.5 py-0.5 ${abaTarefa === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{tarefas.length}</span>
            </button>
            <button type="button" onClick={() => { setAbaTarefa('favoritas'); setTarefaSelecionada(''); setBuscaTarefa(''); setMostrarTodasTarefas(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                abaTarefa === 'favoritas' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <Star size={14} /> Favoritas
              <span className={`text-xs px-1.5 py-0.5 ${abaTarefa === 'favoritas' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{tarefasFavoritas.length}</span>
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={buscaTarefa} onChange={(e) => { setBuscaTarefa(e.target.value); setMostrarTodasTarefas(false); }}
              placeholder="Buscar tarefa..."
              className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 text-sm focus:border-slate-400 focus:outline-none" />
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {tarefasVisiveis.map((tarefa) => {
              const sel = tarefaSelecionada === tarefa.nome && isFavorite === (abaTarefa === 'favoritas');
              return (
                <button key={`${abaTarefa}-${tarefa.id}`} type="button" onClick={() => handleSelecionarTarefa(tarefa.nome)}
                  className={`w-full text-left p-3 border-2 transition-all flex items-center justify-between ${
                    sel ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {abaTarefa === 'favoritas' && <Star size={12} className="text-amber-500 flex-shrink-0" fill="currentColor" />}
                    <span className={`text-sm truncate ${sel ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{tarefa.nome}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 flex-shrink-0 ml-2 ${sel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tarefa.quantidadePendente}
                  </span>
                </button>
              );
            })}
          </div>

          {tarefasFiltradas.length > TAREFAS_VISIVEIS && (
            <button type="button" onClick={() => setMostrarTodasTarefas(!mostrarTodasTarefas)}
              className="w-full mt-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 border border-slate-200">
              {mostrarTodasTarefas ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Ver todas ({tarefasFiltradas.length - TAREFAS_VISIVEIS})</>}
            </button>
          )}
        </div>
      )}

      {/* Seleção por etiqueta */}
      {fonte === 'by_tag' && (
        <div className="mb-6">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={buscaEtiqueta} onChange={(e) => setBuscaEtiqueta(e.target.value)}
              placeholder="Buscar etiqueta..."
              className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 text-sm focus:border-slate-400 focus:outline-none" />
          </div>

          {etiquetasFiltradas.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200">
              <Tag size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">{buscaEtiqueta ? 'Nenhuma encontrada.' : 'Nenhuma etiqueta.'}</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {etiquetasFiltradas.map((etq, idx) => (
                <button key={`tag-${etq.id}-${idx}`} type="button" onClick={() => setEtiquetaSelecionada(etq.id)}
                  className={`w-full text-left p-3 border-2 transition-all flex items-center gap-2 ${
                    etiquetaSelecionada === etq.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'
                  }`}>
                  <Tag size={12} className={etq.favorita ? 'text-amber-500' : 'text-slate-400'} />
                  <span className={`text-sm truncate ${etiquetaSelecionada === etq.id ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                    {etq.nomeTagCompleto || etq.nomeTag || '(sem nome)'}
                  </span>
                  {etq.favorita && <Star size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botão gerar */}
      <button type="button" onClick={handleGerar} disabled={!podeSubmit()}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all ${
          podeSubmit() ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}>
        {carregando ? (
          <><Loader2 size={16} className="animate-spin" /> Gerando...</>
        ) : (
          <><FileSpreadsheet size={16} /> Gerar Planilha de Advogados</>
        )}
      </button>

      {valorFiltro.trim() && (
        <p className="mt-2 text-xs text-center text-slate-500">
          Filtro: <strong>{tipoFiltro === 'nome' ? 'Nome' : 'OAB'}</strong> contém "<strong>{valorFiltro}</strong>"
        </p>
      )}
    </div>
  );
}
