// ============================================================
// servidor/meus-processos/page.tsx
// "Meus Processos" — a fila do servidor (ARQUITETURA.md, seções 6, 8 e 10)
// Fila = processos do meu dígito ∪ listas manuais atribuídas a mim.
// Filtro de dígito guardado no perfil do usuário e aplicado no cliente.
// Dados: mock determinístico (lib/mock/acervo.ts) até a API da fase 1.
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Settings2, Database, RefreshCw, ClipboardList, Hash, X,
} from 'lucide-react';

import { TabelaProcessos } from '../../componentes/tabelas/TabelaProcessos';
import { Toast, useToast } from '../../componentes/layout/Toast';
import { FiltroDigitoConfig } from '../../componentes/processos/FiltroDigitoConfig';
import { PainelProcesso } from '../../componentes/processos/PainelProcesso';
import {
  montarFila, registrosDoProcesso, contarPorFiltro, obterAcervo,
  USUARIOS_UNIDADE, USUARIO_ATUAL_ID, PERFIS_PJE_MOCK, LISTAS_MANUAIS, CAPTURA_ATUAL, AGORA_MOCK,
} from '../../lib/mock/acervo';
import { descreverFiltro, somenteDigitos, type FiltroDigito } from '../../lib/cnj';
import { formatarDataHoraBR, idadeRelativa } from '../../lib/datas';
import type {
  ProcessoFila, RegistroProcesso, DadosConclusao, StatusItem, SituacaoAnalise, AnaliseAnterior,
} from '../../types/processo';

type FiltroStatus = StatusItem | 'todos';
type FiltroSituacao = SituacaoAnalise | 'todos';
type FiltroOrigem = 'todos' | 'digito' | 'lista';
type FiltroEspera = 'trabalhaveis' | 'espera' | 'todos';

interface AjusteLocal {
  statusItem?: StatusItem;
  situacaoAnalise?: SituacaoAnalise;
  analise?: AnaliseAnterior;
  observacaoItem?: string;
}

export default function PaginaMeusProcessos() {
  const usuario = USUARIOS_UNIDADE.find((u) => u.id === USUARIO_ATUAL_ID)!;

  // Contexto
  const [perfilAtivoId, setPerfilAtivoId] = useState(PERFIS_PJE_MOCK[0].id);
  const [filtroDigito, setFiltroDigito] = useState<FiltroDigito>(usuario.filtroDigito);
  const [configAberta, setConfigAberta] = useState(false);
  const [rascunhoFiltro, setRascunhoFiltro] = useState<FiltroDigito>(usuario.filtroDigito);

  // Filtros da tabela
  const [busca, setBusca] = useState('');
  const [fStatus, setFStatus] = useState<FiltroStatus>('todos');
  const [fSituacao, setFSituacao] = useState<FiltroSituacao>('todos');
  const [fOrigem, setFOrigem] = useState<FiltroOrigem>('todos');
  const [fEspera, setFEspera] = useState<FiltroEspera>('trabalhaveis');

  // Trabalho humano feito nesta sessão (até existir API)
  const [ajustes, setAjustes] = useState<Record<string, AjusteLocal>>({});
  const [registrosNovos, setRegistrosNovos] = useState<RegistroProcesso[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const toast = useToast();

  const perfilAtivo = PERFIS_PJE_MOCK.find((p) => p.id === perfilAtivoId)!;
  const unidadeComDados = perfilAtivoId === PERFIS_PJE_MOCK[0].id;

  const filaBase = useMemo(
    () => (unidadeComDados ? montarFila(USUARIO_ATUAL_ID, filtroDigito) : []),
    [filtroDigito, unidadeComDados],
  );

  const fila = useMemo(
    () => filaBase.map((p) => (ajustes[p.id] ? { ...p, ...ajustes[p.id] } : p)),
    [filaBase, ajustes],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = somenteDigitos(termo);
    return fila.filter((p) => {
      if (fStatus !== 'todos' && p.statusItem !== fStatus) return false;
      if (fSituacao !== 'todos' && p.situacaoAnalise !== fSituacao) return false;
      if (fOrigem !== 'todos' && p.origem.tipo !== fOrigem) return false;
      if (fEspera === 'trabalhaveis' && p.filaEspera) return false;
      if (fEspera === 'espera' && !p.filaEspera) return false;
      if (termo) {
        const casaNumero = termoDigitos.length > 0 && p.numeroCnj.includes(termoDigitos);
        const casaTexto = `${p.poloAtivo} ${p.poloPassivo} ${p.tarefaAtual} ${p.assunto}`.toLowerCase().includes(termo);
        if (!casaNumero && !casaTexto) return false;
      }
      return true;
    });
  }, [fila, busca, fStatus, fSituacao, fOrigem, fEspera]);

  const selecionado = fila.find((p) => p.id === selecionadoId) ?? null;

  const registrosDoSelecionado = useMemo(() => {
    if (!selecionado) return [];
    return [
      ...registrosNovos.filter((r) => r.processoId === selecionado.id),
      ...registrosDoProcesso(selecionado.id),
    ];
  }, [selecionado, registrosNovos]);

  // Contadores
  const totais = useMemo(() => ({
    fila: fila.length,
    pendentesP1: fila.filter((p) => p.statusItem !== 'concluido' && p.prioridade === 'P1' && !p.filaEspera).length,
    movimentou: fila.filter((p) => p.situacaoAnalise === 'movimentou' && p.statusItem !== 'concluido').length,
    semNovidade: fila.filter((p) => p.situacaoAnalise === 'sem_novidade').length,
    espera: fila.filter((p) => p.filaEspera).length,
    listas: LISTAS_MANUAIS.filter((l) => l.servidorId === USUARIO_ATUAL_ID).length,
  }), [fila]);

  const contagem = (pred: (p: ProcessoFila) => boolean) => fila.filter(pred).length;

  // ── Ações ─────────────────────────────────────────────

  const ajustar = (id: string, ajuste: AjusteLocal) =>
    setAjustes((prev) => ({ ...prev, [id]: { ...prev[id], ...ajuste } }));

  const concluir = (p: ProcessoFila, dados: DadosConclusao) => {
    const agora = new Date(AGORA_MOCK).toISOString();
    ajustar(p.id, {
      statusItem: 'concluido',
      situacaoAnalise: 'sem_novidade',
      analise: {
        usuarioNome: usuario.nome,
        analisadoEm: agora,
        ultimoMovimentoNaAnalise: p.ultimoMovimentoEm,
        tipoMovimentacao: dados.tipoMovimentacao,
        observacao: dados.nota || undefined,
      },
      observacaoItem: undefined,
    });
    setRegistrosNovos((prev) => [
      {
        id: `reg-novo-${p.id}-${prev.length}`,
        processoId: p.id,
        usuarioNome: usuario.nome,
        data: agora,
        tipoMovimentacao: dados.tipoMovimentacao,
        qtdAtos: dados.qtdAtos,
        nota: dados.nota,
      },
      ...prev,
    ]);
    toast.mostrar(`Processo ${p.numeroFormatado} concluído. Ato "${dados.tipoMovimentacao}" registrado.`);
  };

  const salvarFiltro = () => {
    setFiltroDigito(rascunhoFiltro);
    setConfigAberta(false);
    setSelecionadoId(null);
    toast.mostrar('Seu dígito foi salvo no perfil.', 'info');
  };

  const totalAcervo = obterAcervo().length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Barra superior */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/servidor" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
              <ArrowLeft size={16} /> <span className="font-medium">Painel</span>
            </Link>
            <div className="w-px h-5 bg-slate-200" />
            <h2 className="text-base font-bold text-slate-900 whitespace-nowrap">Meus Processos</h2>
            <span className="text-xs text-slate-500 whitespace-nowrap">{usuario.nome}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Perfil PJE ativo */}
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Perfil PJE</span>
              <select
                value={perfilAtivoId}
                onChange={(e) => { setPerfilAtivoId(e.target.value); setSelecionadoId(null); }}
                className="text-sm border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500 max-w-[22rem] truncate"
              >
                {PERFIS_PJE_MOCK.map((p) => (
                  <option key={p.id} value={p.id}>{p.unidadeNome} / {p.papel} / {p.cargo}</option>
                ))}
              </select>
            </label>

            {/* Idade dos dados */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-slate-50 px-2.5 py-1.5" title={`Captura ${CAPTURA_ATUAL.id} · ${CAPTURA_ATUAL.totalLidos} lidos, ${CAPTURA_ATUAL.novos} novos, ${CAPTURA_ATUAL.alterados} alterados, ${CAPTURA_ATUAL.ausentes} ausentes`}>
              <Database size={13} className="text-slate-400" />
              <span>Dados de <strong>{formatarDataHoraBR(CAPTURA_ATUAL.concluidaEm)}</strong> ({idadeRelativa(CAPTURA_ATUAL.concluidaEm, AGORA_MOCK)})</span>
              <RefreshCw size={12} className="text-slate-300 ml-1" />
            </div>

            {/* Meu dígito */}
            <button
              onClick={() => { setRascunhoFiltro(filtroDigito); setConfigAberta(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded"
            >
              <Hash size={14} /> Meu dígito
            </button>
          </div>
        </div>
      </div>

      {/* Resumo + filtros */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700">
            <Settings2 size={12} className="text-slate-400" /> {descreverFiltro(filtroDigito)}
          </span>
          <Resumo rotulo="na fila" valor={totais.fila} />
          <Resumo rotulo="parados há mais de 30 dias" valor={totais.pendentesP1} cor="text-rose-700" />
          <Resumo rotulo="movimentaram após análise" valor={totais.movimentou} cor="text-violet-700" />
          <Resumo rotulo="sem novidade" valor={totais.semNovidade} cor="text-slate-500" />
          <Resumo rotulo="em fila de espera" valor={totais.espera} cor="text-slate-500" />
          {totais.listas > 0 && (
            <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold ml-1">
              <ClipboardList size={12} /> {totais.listas} lista{totais.listas > 1 ? 's' : ''} manual{totais.listas > 1 ? 'is' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-72">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nº, parte, tarefa ou assunto..."
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-500"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={13} /></button>
            )}
          </div>

          <Grupo>
            <Chip ativo={fStatus === 'todos'} onClick={() => setFStatus('todos')}>Todos</Chip>
            <Chip ativo={fStatus === 'pendente'} onClick={() => setFStatus('pendente')}>Pendentes ({contagem((p) => p.statusItem === 'pendente')})</Chip>
            <Chip ativo={fStatus === 'em_andamento'} onClick={() => setFStatus('em_andamento')}>Em andamento ({contagem((p) => p.statusItem === 'em_andamento')})</Chip>
            <Chip ativo={fStatus === 'concluido'} onClick={() => setFStatus('concluido')}>Concluídos ({contagem((p) => p.statusItem === 'concluido')})</Chip>
          </Grupo>

          <Grupo>
            <Chip ativo={fSituacao === 'todos'} onClick={() => setFSituacao('todos')}>Qualquer análise</Chip>
            <Chip ativo={fSituacao === 'novo'} onClick={() => setFSituacao('novo')}>Novos</Chip>
            <Chip ativo={fSituacao === 'movimentou'} onClick={() => setFSituacao('movimentou')}>Movimentou</Chip>
            <Chip ativo={fSituacao === 'sem_novidade'} onClick={() => setFSituacao('sem_novidade')}>Sem novidade</Chip>
          </Grupo>

          <Grupo>
            <Chip ativo={fOrigem === 'todos'} onClick={() => setFOrigem('todos')}>Dígito + listas</Chip>
            <Chip ativo={fOrigem === 'digito'} onClick={() => setFOrigem('digito')}>Só dígito</Chip>
            <Chip ativo={fOrigem === 'lista'} onClick={() => setFOrigem('lista')}>Só listas</Chip>
          </Grupo>

          <Grupo>
            <Chip ativo={fEspera === 'trabalhaveis'} onClick={() => setFEspera('trabalhaveis')}>Trabalháveis</Chip>
            <Chip ativo={fEspera === 'espera'} onClick={() => setFEspera('espera')}>Fila de espera</Chip>
            <Chip ativo={fEspera === 'todos'} onClick={() => setFEspera('todos')}>Ambos</Chip>
          </Grupo>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto bg-white">
          {!unidadeComDados ? (
            <div className="p-16 text-center">
              <Database size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">Nenhuma captura para {perfilAtivo.unidadeNome}</p>
              <p className="text-sm text-slate-500 mt-1">Peça ao chefe de cartório para disparar uma captura neste perfil.</p>
            </div>
          ) : (
            <TabelaProcessos
              processos={filtrados}
              colunas={['numero', 'tarefa', 'classe', 'dias', 'etiquetas', 'situacao', 'observacao', 'status', 'origem']}
              selecionadoId={selecionadoId}
              onSelecionar={(p) => setSelecionadoId(p.id === selecionadoId ? null : p.id)}
            />
          )}
        </div>

        {selecionado && (
          <PainelProcesso
            processo={selecionado}
            registros={registrosDoSelecionado}
            onFechar={() => setSelecionadoId(null)}
            onIniciar={() => { ajustar(selecionado.id, { statusItem: 'em_andamento' }); toast.mostrar('Processo marcado como em andamento.', 'info'); }}
            onVoltarPendente={() => ajustar(selecionado.id, { statusItem: 'pendente' })}
            onConcluir={(dados) => concluir(selecionado, dados)}
            onReabrir={() => { ajustar(selecionado.id, { statusItem: 'pendente' }); toast.mostrar('Processo reaberto.', 'info'); }}
          />
        )}
      </div>

      <Toast mensagens={toast.mensagens} onFechar={toast.fechar} />

      {/* Modal: configuração do dígito */}
      {configAberta && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-6" onClick={() => setConfigAberta(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Meu dígito</h3>
                <p className="text-xs text-slate-500">Guardado no seu perfil para {perfilAtivo.unidadeNome}. Só muda o que você vê.</p>
              </div>
              <button onClick={() => setConfigAberta(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <div className="p-5">
              <FiltroDigitoConfig
                filtro={rascunhoFiltro}
                onChange={setRascunhoFiltro}
                totalCasam={contarPorFiltro(rascunhoFiltro)}
                totalAcervo={totalAcervo}
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setConfigAberta(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 hover:bg-white">Cancelar</button>
              <button onClick={salvarFiltro} className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800">Salvar no meu perfil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pequenos componentes ────────────────────────────────

function Resumo({ rotulo, valor, cor = 'text-slate-900' }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <span className="text-slate-500">
      <strong className={`${cor} tabular-nums`}>{valor}</strong> {rotulo}
    </span>
  );
}

function Grupo({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center border border-slate-200 divide-x divide-slate-200">{children}</div>;
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
        ativo ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
