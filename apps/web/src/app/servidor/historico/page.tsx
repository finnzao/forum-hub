'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Plus, X, Bell, BellRing, Copy, FileText, Search, Filter,
  MoreHorizontal, ArrowLeft, Download, StickyNote,
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

type PainelModo = 'visualizar' | 'editar' | 'novo' | 'lote' | 'lembretes';

const TITULOS_PAINEL: Record<PainelModo, string> = {
  visualizar: 'Detalhes',
  editar: 'Editar Registro',
  novo: 'Novo Registro',
  lote: 'Registro em Lote',
  lembretes: 'Lembretes',
};

const PAGE_SIZE = 30;

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
  const menuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const setMenuBtnRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) menuBtnRefs.current.set(id, el);
    else menuBtnRefs.current.delete(id);
  }, []);
  const ancorRefAtual = useRef<HTMLButtonElement | null>(null);
  if (menuAberto) {
    ancorRefAtual.current = menuBtnRefs.current.get(menuAberto) || null;
  }
  const [dadosNovo, setDadosNovo] = useState<Partial<DadosNovoRegistro>>({});

  const registrosFiltradosOrdenados = useMemo(() => {
    let resultado = registros.filter((r) => {
      if (busca && !r.processo.includes(busca)) return false;
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
    if (ordenacao.coluna !== coluna) return <ArrowUpDown size={12} className="text-gray-300" />;
    if (ordenacao.direcao === 'asc') return <ArrowUp size={12} className="text-blue-500" />;
    return <ArrowDown size={12} className="text-blue-500" />;
  };

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
  };

  const adicionarRegistro = (dados: DadosNovoRegistro) => {
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
  };

  const salvarEdicao = (id: string, dados: Partial<RegistroHistorico>) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, ...dados } : r)));
    setPainelModo('visualizar');
  };

  const salvarNota = (id: string, nota: string) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, nota } : r)));
  };

  const duplicarRegistro = (reg: RegistroHistorico) => {
    setMenuAberto(null);
    abrirNovo({ processo: reg.processo, data: reg.data });
  };

  const excluirRegistro = (id: string) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setMenuAberto(null);
    if (painelAberto === id) fecharPainel();
  };

  const adicionarLembrete = (registroId: string, lembrete: { data: string; texto: string }) => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === registroId
          ? { ...r, lembretes: [...r.lembretes, { id: `l${Date.now()}`, ...lembrete, concluido: false }] }
          : r
      )
    );
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
    painelAberto && painelAberto !== 'novo' && painelAberto !== 'lote'
      ? registros.find((r) => r.id === painelAberto) || null
      : null;

  const ThOrdenavel = ({ coluna, children, className = '' }: { coluna: ColunaOrdenavel; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => alternarOrdenacao(coluna)}
      className={`px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider border-r border-gray-200 cursor-pointer select-none hover:bg-gray-200 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {iconeOrdenacao(coluna)}
      </div>
    </th>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/servidor" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={16} />
              <span className="font-medium">Painel</span>
            </a>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-1">
              <FileText size={18} className="text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Histórico de Trabalho</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded">
              <Download size={14} /> Exportar
            </button>
            <button onClick={abrirLote} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded">
              <Copy size={14} /> Lote
            </button>
            <button onClick={() => abrirNovo()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors rounded">
              <Plus size={14} /> Novo registro
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por nº do processo..."
              value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoMovimentacao | 'todos')}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-slate-500 bg-white cursor-pointer">
              <option value="todos">Todos os tipos</option>
              {Object.entries(CATEGORIAS_MOVIMENTACAO).map(([cat, tipos]) => (
                <optgroup key={cat} label={cat}>
                  {tipos.map((t) => (
                    <option key={t} value={t}>{TIPOS_MOVIMENTACAO[t]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {registrosVisiveis.length} de {registrosFiltradosOrdenados.length} registro{registrosFiltradosOrdenados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider w-64 border-r border-gray-200">
                  Nº do Processo
                </th>
                <ThOrdenavel coluna="data" className="text-left w-28">Data</ThOrdenavel>
                <ThOrdenavel coluna="tipo" className="text-left w-40">Tipo Movimentação</ThOrdenavel>
                <ThOrdenavel coluna="qtdAtos" className="text-center w-20">Atos</ThOrdenavel>
                <ThOrdenavel coluna="lembrete" className="text-center w-10">
                  <Bell size={13} className="text-gray-400" />
                </ThOrdenavel>
                <th className="text-center px-2 py-2.5 w-10" />
              </tr>
            </thead>

            <tbody>
              {registrosVisiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-gray-500">Nenhum registro encontrado</p>
                    <p className="text-xs mt-1">Ajuste os filtros ou crie um novo registro</p>
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
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <td className="px-4 py-2.5 border-r border-gray-100">
                      <span className="font-mono text-slate-800 text-xs font-medium">{reg.processo}</span>
                      {reg.nota && <StickyNote size={11} className="inline ml-2 text-amber-400 -mt-0.5" />}
                    </td>
                    <td className="px-4 py-2.5 border-r border-gray-100 text-gray-700">{reg.data}</td>
                    <td className="px-4 py-2.5 border-r border-gray-100">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                        {TIPOS_MOVIMENTACAO[reg.tipo]}
                      </span>
                    </td>
                    <td className="text-center px-4 py-2.5 border-r border-gray-100">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
                        reg.qtdAtos > 1 ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {reg.qtdAtos}
                      </span>
                    </td>
                    <td className="text-center px-2 py-2.5 border-r border-gray-100">
                      {reg.lembretes.length > 0 && (
                        <button
                          onClick={(e) => abrirLembretes(reg, e)}
                          className={`p-1 rounded transition-colors ${
                            temLembretePendente ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 hover:bg-gray-100'
                          }`}
                          title={`${reg.lembretes.filter((l) => !l.concluido).length} lembrete(s) pendente(s)`}
                        >
                          {temLembretePendente ? <BellRing size={15} /> : <Bell size={15} />}
                        </button>
                      )}
                    </td>
                    <td className="text-center px-2 py-2.5 relative">
                      <button
                        ref={(el) => setMenuBtnRef(reg.id, el)}
                        onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === reg.id ? null : reg.id); }}
                        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-700"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuAberto === reg.id && (
                        <MenuContexto
                          ancorRef={ancorRefAtual}
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
                  <td colSpan={6} className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-slate-600 rounded-full animate-spin" />
                      Carregando mais registros...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {painelAberto && (
          <div className="w-96 min-w-[24rem] bg-white border-l border-gray-200 flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {TITULOS_PAINEL[painelModo]}
              </h3>
              <button onClick={fecharPainel} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {painelModo === 'visualizar' && registroAtual && (
                <PainelVisualizar
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
                  onSalvar={(dados) => { adicionarRegistro(dados); fecharPainel(); }}
                  onCancelar={fecharPainel}
                />
              )}
              {painelModo === 'lote' && (
                <PainelLote
                  onSalvar={(items) => { items.forEach((item) => adicionarRegistro(item)); fecharPainel(); }}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
