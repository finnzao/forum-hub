'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, ArrowLeft, RefreshCw, LogOut,
  Lock, User, ClipboardList, History,
} from 'lucide-react';
import Link from 'next/link';

import {
  EtapaLogin, EtapaPerfil, EtapaDownload, CardJob, PainelLogs,
  type EtapaWizard, type SessaoPJE, type PerfilPJE,
  type DownloadJobResponse, type PJEDownloadProgress,
  type ParametrosDownload, type EntradaLog,
  isJobActive, logger,
} from '../../componentes/pje-download';

import {
  loginPJE, enviar2FA, selecionarPerfil,
  criarJob, listarJobs, obterProgresso, cancelarJob,
  ApiError,
} from '../../componentes/pje-download/api';

import { Cabecalho } from '../../componentes/layout/Cabecalho';

const ETAPAS_WIZARD: { id: EtapaWizard; rotulo: string; icone: React.ReactNode }[] = [
  { id: 'login', rotulo: 'Login', icone: <Lock size={16} /> },
  { id: 'perfil', rotulo: 'Perfil', icone: <User size={16} /> },
  { id: 'download', rotulo: 'Download', icone: <ClipboardList size={16} /> },
  { id: 'historico', rotulo: 'Histórico', icone: <History size={16} /> },
];

function IndicadorEtapas({ etapaAtual }: { etapaAtual: EtapaWizard }) {
  const etapaIdx = ETAPAS_WIZARD.findIndex((e) =>
    e.id === etapaAtual || (etapaAtual === '2fa' && e.id === 'login')
  );
  return (
    <div className="flex items-center gap-1">
      {ETAPAS_WIZARD.map((etapa, idx) => {
        const concluida = idx < etapaIdx;
        const ativa = idx === etapaIdx;
        return (
          <React.Fragment key={etapa.id}>
            {idx > 0 && <div className={`w-8 h-0.5 ${concluida ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
              ativa ? 'bg-slate-900 text-white' : concluida ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {etapa.icone}
              <span className="hidden md:inline">{etapa.rotulo}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function extrairMensagemErro(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Servidor indisponível. Verifique se a API está em execução.';
    return err.message;
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Não foi possível conectar ao servidor.';
  }
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido.';
}

function extrairDadosErro(err: unknown): Record<string, unknown> {
  if (err instanceof ApiError) return { tipo: 'ApiError', status: err.status, mensagem: err.message, dados: err.data };
  if (err instanceof Error) return { tipo: err.name, mensagem: err.message };
  return { tipo: 'Unknown', valor: String(err) };
}

let logIdCounter = 0;

function useUiLogs() {
  const [logs, setLogs] = useState<EntradaLog[]>([]);
  const addLog = useCallback((nivel: EntradaLog['nivel'], modulo: string, mensagem: string, dados?: unknown) => {
    const entry: EntradaLog = {
      id: ++logIdCounter,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      nivel, modulo, mensagem, dados,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 200));
    logger[nivel](modulo, mensagem, dados);
  }, []);
  const limpar = useCallback(() => setLogs([]), []);
  return { logs, addLog, limpar };
}

export default function PaginaDownloadPJE() {
  const [etapa, setEtapa] = useState<EtapaWizard>('login');
  const [sessao, setSessao] = useState<SessaoPJE>({ autenticado: false });
  const [credenciais, setCredenciais] = useState<{ cpf: string; password: string } | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [jobs, setJobs] = useState<DownloadJobResponse[]>([]);
  const [mapaProgresso, setMapaProgresso] = useState<Record<string, PJEDownloadProgress>>({});
  const [jobExpandido, setJobExpandido] = useState<string | null>(null);

  const { logs, addLog, limpar: limparLogs } = useUiLogs();

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const handleLogin = useCallback(async (cpf: string, senha: string) => {
    setCarregando(true);
    setErro(null);
    addLog('info', 'AUTH', `Iniciando login para CPF ***${cpf.slice(-4)}`);

    try {
      const result = await loginPJE({ cpf, password: senha });

      if (result.needs2FA) {
        addLog('warn', 'AUTH', '2FA necessário — aguardando código via email');
        setCredenciais({ cpf, password: senha });
        setSessao((prev) => ({ ...prev, sessionId: result.sessionId }));
        setEtapa('2fa');
      } else if (result.user) {
        addLog('success', 'AUTH', `Login OK — ${result.user.nomeUsuario}`, {
          usuario: result.user.nomeUsuario,
          perfil: result.user.perfil,
          localizacao: result.user.idUsuarioLocalizacaoMagistradoServidor,
        });
        setSessao({
          autenticado: true,
          sessionId: result.sessionId,
          usuario: result.user,
          perfis: result.profiles || [],
        });
        setCredenciais({ cpf, password: senha });

        if (result.profiles && result.profiles.length > 0) {
          setEtapa('perfil');
          addLog('info', 'AUTH', `${result.profiles.length} perfis disponíveis`,
            result.profiles.map(p => ({ nome: p.nome, orgao: p.orgao, indice: p.indice }))
          );
        } else {
          addLog('warn', 'AUTH', 'Nenhum perfil retornado — indo direto para download');
          setEtapa('download');
        }
      } else {
        const msg = 'Falha na autenticação — resposta inesperada do servidor.';
        addLog('error', 'AUTH', msg, { resposta: result });
        setErro(msg);
      }
    } catch (err: any) {
      const msg = extrairMensagemErro(err);
      addLog('error', 'AUTH', msg, extrairDadosErro(err));
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, [addLog]);

  const handleEnviar2FA = useCallback(async (codigo: string) => {
    setCarregando(true);
    setErro(null);
    addLog('info', '2FA', `Enviando código: ***${codigo.slice(-2)}`);

    try {
      const sid = sessao.sessionId || 'unknown';
      const result = await enviar2FA(sid, codigo);

      if (result.user) {
        addLog('success', '2FA', `Verificado — ${result.user.nomeUsuario}`);
        setSessao({
          autenticado: true,
          sessionId: result.sessionId || sid,
          usuario: result.user,
          perfis: result.profiles || [],
        });
        setEtapa(result.profiles?.length ? 'perfil' : 'download');
      } else if (result.needs2FA) {
        setSessao((prev) => ({ ...prev, sessionId: result.sessionId || prev.sessionId }));
        setErro('Código inválido ou expirado. Tente novamente.');
        addLog('warn', '2FA', 'Código inválido — tente novamente');
      } else {
        setErro('Resposta inesperada do servidor.');
        addLog('error', '2FA', 'Resposta inesperada', { resposta: result });
      }
    } catch (err: any) {
      addLog('error', '2FA', extrairMensagemErro(err), extrairDadosErro(err));
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [addLog, sessao.sessionId]);

  const handleSelecionarPerfil = useCallback(async (perfil: PerfilPJE) => {
    setCarregando(true);
    setErro(null);
    addLog('info', 'PERFIL', `Selecionando: "${perfil.nome}" (índice ${perfil.indice})`, {
      nome: perfil.nome, orgao: perfil.orgao, indice: perfil.indice,
    });

    try {
      const sid = sessao.sessionId;
      if (!sid) {
        setErro('Sessão expirada. Faça login novamente.');
        return;
      }

      const result = await selecionarPerfil(sid, perfil.indice);

      if (result.tasks) {
        addLog('success', 'PERFIL', `Perfil selecionado — ${result.tasks.length} tarefas, ${result.tags.length} etiquetas`, {
          tarefas: result.tasks.length,
          favoritas: result.favoriteTasks.length,
          etiquetas: result.tags.length,
          listaTarefas: result.tasks.slice(0, 5).map(t => `${t.nome} (${t.quantidadePendente})`),
        });

        setSessao((prev) => ({
          ...prev,
          perfilSelecionado: perfil,
          tarefas: result.tasks,
          tarefasFavoritas: result.favoriteTasks,
          etiquetas: result.tags,
        }));
        setEtapa('download');
      } else {
        addLog('error', 'PERFIL', 'Falha ao selecionar perfil', { resposta: result });
        setErro('Falha ao selecionar perfil.');
      }
    } catch (err: any) {
      addLog('error', 'PERFIL', extrairMensagemErro(err), extrairDadosErro(err));
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [addLog, sessao.sessionId]);

  const handleCriarJob = useCallback(async (params: ParametrosDownload) => {
    if (!credenciais) { setErro('Sessão expirada. Faça login novamente.'); return; }
    setCarregando(true);
    setErro(null);
    addLog('info', 'JOB', `Criando job: modo=${params.mode}`, params);

    try {
      const novoJob = await criarJob({
        ...params,
        credentials: credenciais,
        pjeSessionId: sessao.sessionId,
      });
      addLog('success', 'JOB', `Job criado: ${novoJob.id.slice(0, 8)}`, { id: novoJob.id, modo: novoJob.mode, status: novoJob.status });
      setJobs((prev) => [novoJob, ...prev]);
      setJobExpandido(novoJob.id);
    } catch (err: any) {
      addLog('error', 'JOB', extrairMensagemErro(err), extrairDadosErro(err));
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [credenciais, sessao.sessionId, addLog]);

  const carregarJobs = useCallback(async () => {
    try {
      const data = await listarJobs(20, 0);
      setJobs(data.jobs || []);
    } catch {
      // silencioso
    }
  }, []);

  const carregarProgresso = useCallback(async () => {
    const ativos = jobsRef.current.filter((j) => isJobActive(j.status));
    if (ativos.length === 0) return;

    for (const job of ativos) {
      try {
        const p = await obterProgresso(job.id);
        if (p) setMapaProgresso((prev) => ({ ...prev, [job.id]: p }));
      } catch {
        // silencioso
      }
    }
  }, []);

  useEffect(() => {
    if (etapa !== 'download') return;

    carregarJobs();

    const interval = setInterval(() => {
      const temAtivos = jobsRef.current.some((j) => isJobActive(j.status));
      if (temAtivos) {
        carregarJobs();
        carregarProgresso();
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [etapa, carregarJobs, carregarProgresso]);

  const handleLogout = useCallback(() => {
    addLog('info', 'AUTH', 'Logout');
    setSessao({ autenticado: false });
    setCredenciais(null);
    setEtapa('login');
    setErro(null);
  }, [addLog]);

  const handleVoltarPerfil = useCallback(() => {
    addLog('info', 'NAV', 'Voltando para seleção de perfil');
    setEtapa('perfil');
    setErro(null);
  }, [addLog]);

  const handleCancelar = useCallback(async (jobId: string) => {
    addLog('info', 'JOB', `Cancelando job ${jobId.slice(0, 8)}`);
    try {
      await cancelarJob(jobId);
      addLog('success', 'JOB', `Cancelado`);
      carregarJobs();
    } catch (err: any) {
      addLog('error', 'JOB', extrairMensagemErro(err), extrairDadosErro(err));
    }
  }, [addLog, carregarJobs]);

  const etapaAtual: EtapaWizard = etapa === '2fa' ? 'login' : etapa;
  const mostrandoDownload = etapa === 'download' && sessao.perfilSelecionado;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Cabecalho
        nomeUsuario={sessao.usuario?.nomeUsuario || 'Dr. João Magistrado'}
        subtitulo={sessao.perfilSelecionado?.nome || '1ª e 2ª Vara Cível'}
        tipoPerfil="magistrado"
      />

      <main className="flex-1 max-w-7xl mx-auto px-8 py-8 w-full">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link href="/magistrado" className="hover:text-slate-900 font-semibold flex items-center gap-1.5">
              <ArrowLeft size={14} /> Painel
            </Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Download PJE</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 flex items-center justify-center">
                <Download size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Download de Processos</h2>
                <p className="text-slate-600 text-sm">PJE/TJBA — Processo Judicial Eletrônico</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IndicadorEtapas etapaAtual={etapaAtual} />
              {sessao.autenticado && (
                <button type="button" onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 border-2 border-slate-200 hover:border-red-200 transition-colors">
                  <LogOut size={12} /> Sair do PJE
                </button>
              )}
            </div>
          </div>
        </div>

        {mostrandoDownload ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <EtapaDownload
                perfil={sessao.perfilSelecionado!}
                tarefas={sessao.tarefas || []}
                tarefasFavoritas={sessao.tarefasFavoritas || []}
                etiquetas={sessao.etiquetas || []}
                carregando={carregando} erro={erro}
                onCriarJob={handleCriarJob} onVoltar={handleVoltarPerfil}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Downloads</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
                    <button type="button" onClick={carregarJobs} className="p-1 text-slate-400 hover:text-slate-700"><RefreshCw size={12} /></button>
                  </div>
                </div>
                {jobs.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 p-8 text-center">
                    <Download size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Nenhum download ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
                    {jobs.map((job) => (
                      <CardJob key={job.id} job={job} progresso={mapaProgresso[job.id]}
                        expandido={jobExpandido === job.id}
                        onAlternarExpansao={() => setJobExpandido(jobExpandido === job.id ? null : job.id)}
                        onCancelar={() => handleCancelar(job.id)}
                        onAbrir2FA={() => addLog('info', '2FA', `2FA solicitado para job ${job.id.slice(0, 8)}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {(etapa === 'login' || etapa === '2fa') && (
              <EtapaLogin carregando={carregando} erro={erro} aguardando2FA={etapa === '2fa'}
                onLogin={handleLogin} onEnviar2FA={handleEnviar2FA} />
            )}
            {etapa === 'perfil' && sessao.usuario && (
              <EtapaPerfil usuario={sessao.usuario} perfis={sessao.perfis || []}
                carregando={carregando} erro={erro} onSelecionar={handleSelecionarPerfil} />
            )}
            {jobs.length > 0 && (
              <div className="mt-12 max-w-2xl mx-auto">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Downloads Anteriores</h3>
                <div className="space-y-2">
                  {jobs.slice(0, 3).map((job) => (
                    <CardJob key={job.id} job={job} progresso={mapaProgresso[job.id]}
                      expandido={jobExpandido === job.id}
                      onAlternarExpansao={() => setJobExpandido(jobExpandido === job.id ? null : job.id)}
                      onCancelar={() => handleCancelar(job.id)} onAbrir2FA={() => { }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-40">
        <PainelLogs logs={logs} onLimpar={limparLogs} />
      </div>
    </div>
  );
}