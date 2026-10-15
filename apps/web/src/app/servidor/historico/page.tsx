// ============================================================
// servidor/historico/page.tsx
// Histórico de atos do servidor — listagem em planilha + painel lateral.
// Fluxo de cadastro: "+ Registrar ato" → preencher → "Salvar ato" →
// confirmação com "Registrar outro ato" / "Voltar para a lista".
// Persistência: localStorage (até a API da fase 1), sobre o mock inicial.
// ============================================================

'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Plus, X, Bell, BellRing, Copy, FileText, Search, Filter,
  MoreHorizontal, ArrowLeft, Download, CheckCircle,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import {
  RegistroHistorico, DadosNovoRegistro, TipoMovimentacao, TIPOS_MOVIMENTACAO,
  CATEGORIAS_MOVIMENTACAO, ColunaOrdenavel, Ordenacao,
} from './types';
import {
  MenuContexto, PainelVisualizar, PainelEditar, PainelNovo, PainelLote,
  PainelLembretes, LembreteComContexto,
} from './componentes';
import { registrosMock } from './data/dados-mock';
import { CelulaObservacao } from '../../componentes/tabelas/TabelaProcessos';
import { Toast, useToast } from '../../componentes/layout/Toast';

type PainelModo = 'visualizar' | 'editar' | 'novo' | 'lote' | 'lembretes' | 'sucesso';

const TITULOS_PAINEL: Record<PainelModo, string> = {
  visualizar: 'Detalhes do ato',
  editar: 'Editar ato',
  novo: 'Registrar ato',
  lote: 'Registrar vários atos',
  lembretes: 'Lembretes',
  sucesso: 'Pronto',
};

const PAGE_SIZE = 30;
const STORAGE_KEY = 'forum-hub:historico-registros-v1';

interface InfoSucesso {
  processo: string;
  data: string;
  tipos: string[];
  qtdAtos: number;
  comObservacao: boolean;
}

function parseDateBR(str: string): number {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
}

function getProximoLembrete(reg: RegistroHistorico): number {
  const pendentes = reg.lembretes.filter((l) => !l.concluido);
  if (pendentes.length === 0) return Infinity;
  return Math.min(...pendentes.map((l) => parseDateBR(l.data)));
}

function compararRegistros(a: RegistroHistorico, b: RegistroHistorico, coluna: ColunaOrdenavel, direcao: 'asc' | 'desc'): number {
  const mul = direcao === 'asc' ? 1 : -1;
  switch (coluna) {
    case 'data':
      return (parseDateBR(a.data) - parseDateBR(b.data)) * mul;
    case 'tipo':
      return (TIPOS_MOVIMENTACAO[a.tipo] || '').localeCompare(TIPOS_MOVIMENTACAO[b.tipo] || '') * mul;
    case 'qtdAtos':
      return (a.qtdAtos - b.qtdAtos) * mul;
    case 'lembrete':
      return (getProximoLembrete(a) - getProximoLembrete(b)) * mul;
    default:
      return 0;
  }
}

export default function PaginaHistorico() {
  const [registros, setRegistros] = useState<RegistroHistorico[]>(registrosMock);
  const [carregado, setCarregado] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | 'todos'>('todos');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({ coluna: null, direcao: null });
  const [itensVisiveis, setItensVisiveis] = useState(PAGE_SIZE);
  const sentinelaRef = useRef<HTMLTableRowElement>(null);
  const [painelAberto, setPainelAberto] = useState<string | null>(null);
  const [painelModo, setPainelModo] = useState<PainelModo>('visualizar');
  const [linhaSelecionada, setLinhaSelecionada] = useState<string | null>(null);
  const [lembreteProcesso, setLembreteProcesso] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<InfoSucesso | null>(null);
  const toast = useToast();
  const menuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const setMenuBtnRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) menuBtnRefs.current.set(id, el);
    else menuBtnRefs.current.delete(id);
  }, []);
  const obterAncoraMenu = useCallback(
    () => (menuAberto ? menuBtnRefs.current.get(menuAberto) || null : null),
    [menuAberto],
  );
  const [dadosNovo, setDadosNovo] = useState<Partial<DadosNovoRegistro>>({});

  // ── Persistência local (até existir API) ──────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const salvos = JSON.parse(raw) as RegistroHistorico[];
        if (Array.isArray(salvos) && salvos.length > 0) setRegistros(salvos);
      }
    } catch { /* storage indisponível: segue com o mock */ }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); } catch { /* ignora */ }
  }, [registros, carregado]);

  // ── Lista filtrada / ordenada ─────────────────────────
  const registrosFiltradosOrdenados = useMemo(() => {
    const termo = busca.replace(/\D/g, '');
    let resultado = registros.filter((r) => {
      if (termo && !r.processo.replace(/\D/g, '').includes(termo)) return false;
      if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false;
      return true;
    });
    if (ordenacao.coluna && ordenacao.direcao) {
      resultado = [...resultado].sort((a, b) =>
        compararRegistros(a, b, ordenacao.coluna!, ordenacao.direcao as 'asc' | 'desc')
      );
    }
    return resultado;
  }, [registros, busca, filtroTipo, ordenacao]);

  useEffect(() => { setItensVisiveis(PAGE_SIZE); }, [busca, filtroTipo, ordenacao]);

  const registrosVisiveis = registrosFiltradosOrdenados.slice(0, itensVisiveis);
  const temMais = itensVisiveis < registrosFiltradosOrdenados.length;

  useEffect(() => {
    if (!sentinelaRef.current || !temMais) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setItensVisiveis((prev) => Math.min(prev + PAGE_SIZE, registrosFiltradosOrdenados.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelaRef.current);
    return () => observer.disconnect();
  }, [temMais, registrosFiltradosOrdenados.length]);

  const alternarOrdenacao = (coluna: ColunaOrdenavel) => {
    setOrdenacao((prev) => {
      if (prev.coluna !== coluna) return { coluna, direcao: 'asc' };
      if (prev.direcao === 'asc') return { coluna, direcao: 'desc' };
      return { coluna: null, direcao: null };
    });
  };

  const iconeOrdenacao = (coluna: ColunaOrdenavel) => {
    if (ordenacao.coluna !== coluna) return <ArrowUpDown size={12} className="text-slate-300" />;
    if (ordenacao.direcao === 'asc') return <ArrowUp size={12} className="text-blue-600" />;
    return <ArrowDown size={12} className="text-blue-600" />;
  };

  // ── Abrir / fechar painéis ────────────────────────────
  const abrirVisualizacao = (reg: RegistroHistorico) => {
    setLinhaSelecionada(reg.id);
    setPainelAberto(reg.id);
    setPainelModo('visualizar');
    setLembreteProcesso(null);
  };

  const abrirEdicao = (reg: RegistroHistorico) => {
    setLinhaSelecionada(reg.id);
    setPainelAberto(reg.id);
    setPainelModo('editar');
  };

  const abrirNovo = (dadosIniciais?: Partial<DadosNovoRegistro>) => {
    setDadosNovo(dadosIniciais || {});
    setPainelAberto('novo');
    setPainelModo('novo');
    setLinhaSelecionada(null);
  };

  const abrirLote = () => {
    setPainelAberto('lote');
    setPainelModo('lote');
    setLinhaSelecionada(null);
  };

  const abrirLembretes = (reg: RegistroHistorico, e: React.MouseEvent) => {
    e.stopPropagation();
    setLinhaSelecionada(reg.id);
    setPainelAberto(reg.id);
    setPainelModo('lembretes');
    setLembreteProcesso(reg.processo);
  };

  const fecharPainel = () => {
    setPainelAberto(null);
    setPainelModo('visualizar');
    setLinhaSelecionada(null);
    setLembreteProcesso(null);
    setSucesso(null);
  };

  const mostrarSucesso = (info: InfoSucesso) => {
    setSucesso(info);
    setPainelAberto('sucesso');
    setPainelModo('sucesso');
    setLinhaSelecionada(null);
  };

  // ── Alterações nos registros ──────────────────────────
  const adicionarRegistro = (dados: DadosNovoRegistro): RegistroHistorico => {
    const lembretes = dados.lembrete?.data
      ? [{ id: `l${Date.now()}`, data: dados.lembrete.data, texto: dados.lembrete.texto, concluido: false }]
      : [];
    const novo: RegistroHistorico = {
      id: `r${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      processo: dados.processo,
      data: dados.data || new Date().toLocaleDateString('pt-BR'),
      tipo: dados.tipo,
      qtdAtos: dados.qtdAtos || 1,
      nota: dados.nota || '',
      lembretes,
    };
    setRegistros((prev) => [novo, ...prev]);
    return novo;
  };

  const salvarNovo = (dados: DadosNovoRegistro) => {
    const novo = adicionarRegistro(dados);
    toast.mostrar('Ato registrado com sucesso!');
    mostrarSucesso({
      processo: novo.processo,
      data: novo.data,
      tipos: [TIPOS_MOVIMENTACAO[novo.tipo]],
      qtdAtos: novo.qtdAtos,
      comObservacao: !!novo.nota,
    });
  };

  const salvarLote = (itens: DadosNovoRegistro[]) => {
    if (itens.length === 0) return;
    itens.forEach((item) => adicionarRegistro(item));
    toast.mostrar(`${itens.length} ato${itens.length > 1 ? 's' : ''} registrado${itens.length > 1 ? 's' : ''} com sucesso!`);
    mostrarSucesso({
      processo: itens[0].processo,
      data: itens[0].data,
      tipos: itens.map((i) => TIPOS_MOVIMENTACAO[i.tipo]),
      qtdAtos: itens.reduce((s, i) => s + (i.qtdAtos || 1), 0),
      comObservacao: itens.some((i) => !!i.nota),
    });
  };

  const salvarEdicao = (id: string, dados: Partial<RegistroHistorico>) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, ...dados } : r)));
    setPainelModo('visualizar');
    toast.mostrar('Alterações salvas.');
  };

  const salvarNota = (id: string, nota: string) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, nota } : r)));
    toast.mostrar('Observação salva.');
  };

  const duplicarRegistro = (reg: RegistroHistorico) => {
    setMenuAberto(null);
    abrirNovo({ processo: reg.processo, data: reg.data });
  };

  const excluirRegistro = (id: string) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setMenuAberto(null);
    if (painelAberto === id) fecharPainel();
    toast.mostrar('Registro excluído.', 'info');
  };

  const adicionarLembrete = (registroId: string, lembrete: { data: string; texto: string }) => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === registroId
          ? { ...r, lembretes: [...r.lembretes, { id: `l${Date.now()}`, ...lembrete, concluido: false }] }
          : r
      )
    );
    toast.mostrar('Lembrete adicionado.');
  };

  const toggleLembrete = (registroId: string, lembreteId: string) => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === registroId
          ? { ...r, lembretes: r.lembretes.map((l) => l.id === lembreteId ? { ...l, concluido: !l.concluido } : l) }
          : r
      )
    );
  };

  const excluirLembrete = (registroId: string, lembreteId: string) => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === registroId
          ? { ...r, lembretes: r.lembretes.filter((l) => l.id !== lembreteId) }
          : r
      )
    );
  };

  const lembretesDoProcesso: LembreteComContexto[] = lembreteProcesso
    ? registros
        .filter((r) => r.processo === lembreteProcesso)
        .flatMap((r) => r.lembretes.map((l) => ({ ...l, registroId: r.id, tipoMov: r.tipo, dataMov: r.data })))
    : [];

  const registroAtual =
    painelAberto && !['novo', 'lote', 'sucesso'].includes(painelAberto)
      ? registros.find((r) => r.id === painelAberto) || null
      : null;

  const ThOrdenavel = ({ coluna, children, className = '' }: { coluna: ColunaOrdenavel; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => alternarOrdenacao(coluna)}
      className={`px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider border-r border-slate-200 cursor-pointer select-none hover:bg-slate-200 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {iconeOrdenacao(coluna)}
      </div>
    </th>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Barra superior */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <a href="/servidor" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={16} />
              <span className="font-medium">Painel</span>
            </a>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <FileText size={18} className="text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Histórico de Atos</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:border-slate-500 hover:bg-slate-50 transition-colors rounded">
              <Download size={14} /> Exportar
            </button>
            <button onClick={abrirLote} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:border-slate-500 hover:bg-slate-50 transition-colors rounded">
              <Copy size={14} /> Vários atos no mesmo processo
            </button>
            <button onClick={() => abrirNovo()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 transition-colors rounded">
              <Plus size={16} /> Registrar ato
            </button>
          </div>
        </div>
      </div>

      {/* Busca e filtro */}
      <div className="bg-white border-b border-slate-200 px-6 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[14rem]">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar pelo nº do processo"
              value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-500 transition-colors" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoMovimentacao | 'todos')}
              className="text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-slate-500 bg-white cursor-pointer">
              <option value="todos">Todos os tipos de ato</option>
              {Object.entries(CATEGORIAS_MOVIMENTACAO).map(([cat, tipos]) => (
                <optgroup key={cat} label={cat}>
                  {tipos.map((t) => (
                    <option key={t} value={t}>{TIPOS_MOVIMENTACAO[t]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <span className="ml-auto text-xs text-slate-500">
            {registrosVisiveis.length} de {registrosFiltradosOrdenados.length} ato{registrosFiltradosOrdenados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider w-60 border-r border-slate-200">
                  Nº do processo
                </th>
                <ThOrdenavel coluna="data" className="text-left w-28">Data</ThOrdenavel>
                <ThOrdenavel coluna="tipo" className="text-left w-44">Tipo de ato</ThOrdenavel>
                <ThOrdenavel coluna="qtdAtos" className="text-center w-20">Qtd.</ThOrdenavel>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider border-r border-slate-200">
                  Observação
                </th>
                <ThOrdenavel coluna="lembrete" className="text-center w-12">
                  <Bell size={13} className="text-slate-400" aria-label="Lembrete" />
                </ThOrdenavel>
                <th className="text-center px-2 py-2.5 w-10" />
              </tr>
            </thead>

            <tbody>
              {registrosVisiveis.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600">Nenhum ato encontrado</p>
                    <p className="text-xs mt-1">Ajuste a busca ou clique em &ldquo;Registrar ato&rdquo;.</p>
                  </td>
                </tr>
              )}

              {registrosVisiveis.map((reg) => {
                const isSelected = linhaSelecionada === reg.id;
                const temLembretePendente = reg.lembretes.some((l) => !l.concluido);

                return (
                  <tr
                    key={reg.id}
                    onClick={() => abrirVisualizacao(reg)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <td className="px-4 py-2.5 border-r border-slate-100 align-top">
                      <span className="font-mono text-slate-900 text-xs font-semibold">{reg.processo}</span>
                    </td>
                    <td className="px-4 py-2.5 border-r border-slate-100 text-slate-700 tabular-nums align-top">{reg.data}</td>
                    <td className="px-4 py-2.5 border-r border-slate-100 align-top">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-800">
                        {TIPOS_MOVIMENTACAO[reg.tipo]}
                      </span>
                    </td>
                    <td className="text-center px-4 py-2.5 border-r border-slate-100 align-top">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1 rounded text-xs font-bold bg-slate-100 text-slate-800 tabular-nums">
                        {reg.qtdAtos}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-r border-slate-100 align-top">
                      <CelulaObservacao texto={reg.nota} />
                    </td>
                    <td className="text-center px-2 py-2.5 border-r border-slate-100 align-top">
                      {reg.lembretes.length > 0 && (
                        <button
                          onClick={(e) => abrirLembretes(reg, e)}
                          className={`p-1 rounded transition-colors ${
                            temLembretePendente ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100'
                          }`}
                          title={`${reg.lembretes.filter((l) => !l.concluido).length} lembrete(s) pendente(s)`}
                        >
                          {temLembretePendente ? <BellRing size={15} /> : <Bell size={15} />}
                        </button>
                      )}
                    </td>
                    <td className="text-center px-2 py-2.5 relative align-top">
                      <button
                        ref={(el) => setMenuBtnRef(reg.id, el)}
                        onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === reg.id ? null : reg.id); }}
                        className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800"
                        aria-label="Mais ações"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuAberto === reg.id && (
                        <MenuContexto
                          obterAncora={obterAncoraMenu}
                          onDuplicar={() => duplicarRegistro(reg)}
                          onEditar={() => { setMenuAberto(null); abrirEdicao(reg); }}
                          onExcluir={() => excluirRegistro(reg.id)}
                          onFechar={() => setMenuAberto(null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {temMais && (
                <tr ref={sentinelaRef}>
                  <td colSpan={7} className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      Carregando mais atos...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {painelAberto && (
          <div className="w-96 min-w-[24rem] bg-white border-l border-slate-200 flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {TITULOS_PAINEL[painelModo]}
              </h3>
              <button onClick={fecharPainel} className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors" aria-label="Fechar painel">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {painelModo === 'visualizar' && registroAtual && (
                <PainelVisualizar
                  key={registroAtual.id}
                  registro={registroAtual}
                  onEditar={() => setPainelModo('editar')}
                  onDuplicar={() => duplicarRegistro(registroAtual)}
                  onSalvarNota={(nota) => salvarNota(registroAtual.id, nota)}
                  onVerLembretes={() => { setPainelModo('lembretes'); setLembreteProcesso(registroAtual.processo); }}
                />
              )}
              {painelModo === 'editar' && registroAtual && (
                <PainelEditar
                  registro={registroAtual}
                  onSalvar={(dados) => salvarEdicao(registroAtual.id, dados)}
                  onCancelar={() => setPainelModo('visualizar')}
                />
              )}
              {painelModo === 'novo' && (
                <PainelNovo
                  dadosIniciais={dadosNovo}
                  onSalvar={salvarNovo}
                  onCancelar={fecharPainel}
                />
              )}
              {painelModo === 'lote' && (
                <PainelLote
                  onSalvar={salvarLote}
                  onCancelar={fecharPainel}
                />
              )}
              {painelModo === 'lembretes' && (
                <PainelLembretes
                  processo={lembreteProcesso || ''}
                  lembretes={lembretesDoProcesso}
                  onToggle={toggleLembrete}
                  onExcluir={excluirLembrete}
                  onAdicionar={adicionarLembrete}
                  registroId={painelAberto}
                />
              )}
              {painelModo === 'sucesso' && sucesso && (
                <PainelSucesso
                  info={sucesso}
                  onRegistrarOutro={() => abrirNovo({ processo: sucesso.processo, data: sucesso.data })}
                  onVoltar={fecharPainel}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <Toast mensagens={toast.mensagens} onFechar={toast.fechar} />
    </div>
  );
}

// ── Confirmação após salvar ─────────────────────────────

function PainelSucesso({ info, onRegistrarOutro, onVoltar }: { info: InfoSucesso; onRegistrarOutro: () => void; onVoltar: () => void }) {
  return (
    <div className="p-5 space-y-5">
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3 rounded-full">
          <CheckCircle size={30} />
        </div>
        <p className="text-base font-bold text-slate-900">
          {info.tipos.length > 1 ? `${info.tipos.length} atos registrados com sucesso!` : 'Ato registrado com sucesso!'}
        </p>
        <p className="text-xs text-slate-500 mt-1">Já aparece no topo da lista.</p>
      </div>

      <dl className="text-sm border border-slate-200 divide-y divide-slate-100">
        <Linha rotulo="Processo"><span className="font-mono text-xs font-semibold">{info.processo}</span></Linha>
        <Linha rotulo="Data">{info.data}</Linha>
        <Linha rotulo={info.tipos.length > 1 ? 'Tipos' : 'Tipo'}>{info.tipos.join(', ')}</Linha>
        <Linha rotulo="Qtd. de atos">{info.qtdAtos}</Linha>
        <Linha rotulo="Observação">{info.comObservacao ? 'Registrada' : <span className="text-slate-400 italic">Sem observação</span>}</Linha>
      </dl>

      <div className="space-y-2">
        <button onClick={onRegistrarOutro}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-slate-900 rounded hover:bg-slate-700 transition-colors">
          <Plus size={15} /> Registrar outro ato neste processo
        </button>
        <button onClick={onVoltar}
          className="w-full px-3 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
          Voltar para a lista
        </button>
      </div>
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
