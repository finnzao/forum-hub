'use client';

import React, { useState, useCallback } from 'react';
import {
  Download, ArrowLeft, LogOut,
  Lock, User, ClipboardList, FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

import {
  EtapaLogin, EtapaPerfil, EtapaDownloadStream, EtapaAdvogados, PainelLogs,
  type EtapaWizard, type SessaoPJE, type PerfilPJE, type EntradaLog,
  logger,
} from '../../componentes/pje-download';

import {
  loginPJE, enviar2FA, selecionarPerfil, ApiError,
} from '../../componentes/pje-download/api';

import { Cabecalho } from '../../componentes/layout/Cabecalho';

type AbaDownload = 'processos' | 'advogados';

const ETAPAS_WIZARD: { id: EtapaWizard; rotulo: string; icone: React.ReactNode }[] = [
  { id: 'login', rotulo: 'Login', icone: <Lock size={16} /> },
  { id: 'perfil', rotulo: 'Perfil', icone: <User size={16} /> },
  { id: 'download', rotulo: 'Download', icone: <ClipboardList size={16} /> },
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

function isSessionExpiredError(err: unknown): boolean {
  if (err instanceof ApiError) {
    if (err.status === 401) return true;
    const data = err.data as any;
    if (data?.error?.code === 'SESSION_EXPIRED') return true;
  }
  return false;
}

function extrairMensagemErro(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Servidor indisponível. Verifique se a API está em execução.';
    return err.message;
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') return 'Não foi possível conectar ao servidor.';
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido.';
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
  const [abaAtiva, setAbaAtiva] = useState<AbaDownload>('processos');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { logs, addLog, limpar: limparLogs } = useUiLogs();

  const handleLogout = useCallback(() => {
    addLog('info', 'AUTH', 'Logout');
    setSessao({ autenticado: false });
    setCredenciais(null);
    setEtapa('login');
    setErro(null);
  }, [addLog]);

  const handleLogin = useCallback(async (cpf: string, senha: string) => {
    setCarregando(true);
    setErro(null);
    addLog('info', 'AUTH', `Iniciando login para CPF ***${cpf.slice(-4)}`);
    try {
      const result = await loginPJE({ cpf, password: senha });
      if (result.needs2FA) {
        addLog('warn', 'AUTH', '2FA necessário');
        setCredenciais({ cpf, password: senha });
        setSessao((prev) => ({ ...prev, sessionId: result.sessionId }));
        setEtapa('2fa');
      } else if (result.user) {
        addLog('success', 'AUTH', `Login OK — ${result.user.nomeUsuario}`);
        setSessao({ autenticado: true, sessionId: result.sessionId, usuario: result.user, perfis: result.profiles || [] });
        setCredenciais({ cpf, password: senha });
        setEtapa(result.profiles?.length ? 'perfil' : 'download');
      } else {
        setErro('Falha na autenticação.');
      }
    } catch (err: any) {
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [addLog]);

  const handleEnviar2FA = useCallback(async (codigo: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const sid = sessao.sessionId || 'unknown';
      const result = await enviar2FA(sid, codigo);
      if (result.user) {
        addLog('success', '2FA', `Verificado — ${result.user.nomeUsuario}`);
        setSessao({ autenticado: true, sessionId: result.sessionId || sid, usuario: result.user, perfis: result.profiles || [] });
        setEtapa(result.profiles?.length ? 'perfil' : 'download');
      } else if (result.needs2FA) {
        setErro('Código inválido ou expirado.');
      } else {
        setErro('Resposta inesperada.');
      }
    } catch (err: any) {
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [addLog, sessao.sessionId]);

  const handleSelecionarPerfil = useCallback(async (perfil: PerfilPJE) => {
    setCarregando(true);
    setErro(null);
    addLog('info', 'PERFIL', `Selecionando: "${perfil.nome}"`);
    try {
      const sid = sessao.sessionId;
      if (!sid) { handleLogout(); return; }
      const result = await selecionarPerfil(sid, perfil.indice);
      if (result.tasks) {
        addLog('success', 'PERFIL', `OK — ${result.tasks.length} tarefas`);
        setSessao((prev) => ({
          ...prev, perfilSelecionado: perfil,
          tarefas: result.tasks, tarefasFavoritas: result.favoriteTasks, etiquetas: result.tags,
        }));
        setEtapa('download');
      } else {
        setErro('Falha ao selecionar perfil.');
      }
    } catch (err: any) {
      if (isSessionExpiredError(err)) { handleLogout(); return; }
      setErro(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }, [addLog, sessao.sessionId, handleLogout]);

  const handleVoltarPerfil = useCallback(() => {
    setEtapa('perfil');
    setErro(null);
  }, []);

  const etapaAtual: EtapaWizard = etapa === '2fa' ? 'login' : etapa;
  const mostrandoDownload = etapa === 'download' && sessao.perfilSelecionado;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <main className="flex-1 max-w-5xl mx-auto px-8 py-8 w-full">
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
                <p className="text-slate-600 text-sm">PJE/TJBA — Zero Storage (salva direto no seu PC)</p>
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
          <div className="max-w-3xl">
            <div className="flex border-b-2 border-slate-200 mb-6">
              <button type="button" onClick={() => setAbaAtiva('processos')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                  abaAtiva === 'processos' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <Download size={16} /> Download Processos
              </button>
              <button type="button" onClick={() => setAbaAtiva('advogados')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-colors ${
                  abaAtiva === 'advogados' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <FileSpreadsheet size={16} /> Planilha Advogados
              </button>
            </div>

            {abaAtiva === 'processos' ? (
              <EtapaDownloadStream
                perfil={sessao.perfilSelecionado!}
                tarefas={sessao.tarefas || []}
                tarefasFavoritas={sessao.tarefasFavoritas || []}
                etiquetas={sessao.etiquetas || []}
                sessionId={sessao.sessionId || ''}
                onVoltar={handleVoltarPerfil}
              />
            ) : (
              <EtapaAdvogados
                perfil={sessao.perfilSelecionado!}
                tarefas={sessao.tarefas || []}
                tarefasFavoritas={sessao.tarefasFavoritas || []}
                etiquetas={sessao.etiquetas || []}
                credenciais={credenciais!}
                sessionId={sessao.sessionId}
                onVoltar={handleVoltarPerfil}
              />
            )}
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
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-40">
        <PainelLogs logs={logs} onLimpar={limparLogs} />
      </div>
    </div>
  );
}
