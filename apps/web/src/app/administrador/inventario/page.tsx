'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Package, ArrowLeft, TrendingUp, Plus, FileText } from 'lucide-react';
import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { CardEstatistica } from './componentes/CardEstatistica';
import { FiltrosInventarioComponent } from './componentes/FiltrosInventario';
import { Tabela } from './componentes/Tabela';
import { Badge } from './componentes/Badge';
import { ModalAcoesItem } from './componentes/ModalAcoesItem';
import { ModalNovoItem } from './componentes/ModalNovoItem';
import {
  itensInventario as itensIniciais,
  movimentacoes as movimentacoesIniciais,
  estatisticas as estatisticasIniciais,
  LOCALIZACOES,
  CATEGORIAS,
} from './data/mockData';
import {
  ItemInventario,
  FiltrosInventario,
  Movimentacao,
  FormularioNovoItem,
} from './types/inventario';

type AbaAtiva = 'inventario' | 'movimentacoes';

export default function PaginaInventario() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('inventario');
  const [filtros, setFiltros] = useState<FiltrosInventario>({});
  const [itemSelecionado, setItemSelecionado] = useState<ItemInventario | null>(null);
  const [modalAcoesAberto, setModalAcoesAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  // Estados mutáveis (simulando backend)
  const [itens, setItens] = useState<ItemInventario[]>(itensIniciais);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(movimentacoesIniciais);
  const [localizacoes, setLocalizacoes] = useState<string[]>(LOCALIZACOES);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS);

  // Recalcular estatísticas
  const estatisticas = useMemo(() => {
    const porCategoria: Record<string, number> = {};
    const porStatus: Record<string, number> = { ativo: 0, manutencao: 0, baixado: 0 };

    itens.forEach((item) => {
      porCategoria[item.categoria] = (porCategoria[item.categoria] || 0) + 1;
      porStatus[item.status] = (porStatus[item.status] || 0) + 1;
    });

    return {
      totalItens: itens.length,
      porCategoria,
      porStatus,
      movimentacoesMes: movimentacoes.length,
    };
  }, [itens, movimentacoes]);

  // Filtrar itens
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      if (filtros.categoria && item.categoria !== filtros.categoria) return false;
      if (filtros.localizacao && item.localizacaoAtual !== filtros.localizacao)
        return false;
      if (filtros.status && item.status !== filtros.status) return false;
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const contemNome = item.nome.toLowerCase().includes(busca);
        const contemTombo = item.tombos.some((t) =>
          t.numero.toLowerCase().includes(busca)
        );
        if (!contemNome && !contemTombo) return false;
      }
      return true;
    });
  }, [itens, filtros]);

  const abrirAcoes = (item: ItemInventario) => {
    setItemSelecionado(item);
    setModalAcoesAberto(true);
  };

  const handleNovoItem = (form: FormularioNovoItem) => {
    const tombos = [];
    if (form.tomboAzul) tombos.push({ tipo: 'azul' as const, numero: form.tomboAzul });
    if (form.tomboCinza) tombos.push({ tipo: 'cinza' as const, numero: form.tomboCinza });

    const novoItem: ItemInventario = {
      id: String(Date.now()),
      nome: form.nome,
      descricao: form.descricao,
      categoria: form.categoria,
      tombos,
      localizacaoAtual: form.localizacaoAtual,
      status: 'ativo',
      dataAquisicao: form.dataAquisicao,
      observacoes: form.observacoes,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    setItens([...itens, novoItem]);

    // Adicionar nova categoria/localização se não existir
    if (!categorias.includes(form.categoria)) {
      setCategorias([...categorias, form.categoria]);
    }
    if (!localizacoes.includes(form.localizacaoAtual)) {
      setLocalizacoes([...localizacoes, form.localizacaoAtual]);
    }

    // Criar movimentação de entrada
    const novaMovimentacao: Movimentacao = {
      id: String(Date.now()),
      itemId: novoItem.id,
      itemNome: novoItem.nome,
      tipo: 'entrada',
      destino: novoItem.localizacaoAtual,
      responsavel: 'Usuário Admin',
      data: new Date().toISOString().split('T')[0],
      observacoes: 'Cadastro inicial do item',
      criadoEm: new Date().toISOString(),
    };

    setMovimentacoes([novaMovimentacao, ...movimentacoes]);
  };

  const handleTransferir = (itemId: string, novaLocalizacao: string) => {
    const item = itens.find((i) => i.id === itemId);
    if (!item) return;

    const localizacaoAnterior = item.localizacaoAtual;

    setItens(
      itens.map((i) =>
        i.id === itemId
          ? { ...i, localizacaoAtual: novaLocalizacao, atualizadoEm: new Date().toISOString() }
          : i
      )
    );

    // Adicionar nova localização se não existir
    if (!localizacoes.includes(novaLocalizacao)) {
      setLocalizacoes([...localizacoes, novaLocalizacao]);
    }

    // Criar movimentação
    const novaMovimentacao: Movimentacao = {
      id: String(Date.now()),
      itemId: item.id,
      itemNome: item.nome,
      tipo: 'transferencia',
      origem: localizacaoAnterior,
      destino: novaLocalizacao,
      responsavel: 'Usuário Admin',
      data: new Date().toISOString().split('T')[0],
      criadoEm: new Date().toISOString(),
    };

    setMovimentacoes([novaMovimentacao, ...movimentacoes]);
  };

  const handleEditar = (itemEditado: ItemInventario) => {
    setItens(
      itens.map((i) =>
        i.id === itemEditado.id
          ? { ...itemEditado, atualizadoEm: new Date().toISOString() }
          : i
      )
    );
  };

  const handleExcluir = (itemId: string) => {
    setItens(itens.filter((i) => i.id !== itemId));
    setMovimentacoes(movimentacoes.filter((m) => m.itemId !== itemId));
  };

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'sucesso';
      case 'manutencao':
        return 'aviso';
      case 'baixado':
        return 'perigo';
      default:
        return 'neutro';
    }
  };

  const obterCorTipoMovimentacao = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'sucesso';
      case 'saida':
        return 'perigo';
      case 'transferencia':
        return 'info';
      default:
        return 'neutro';
    }
  };

  const colunasItens = [
    {
      chave: 'nome',
      titulo: 'Nome',
      largura: '30%',
    },
    {
      chave: 'tombos',
      titulo: 'Tombos',
      largura: '25%',
      renderizar: (item: ItemInventario) => (
        <div className="flex flex-wrap gap-1">
          {item.tombos.map((tombo, idx) => (
            <Badge
              key={idx}
              variante={tombo.tipo === 'azul' ? 'info' : 'neutro'}
              tamanho="pequeno"
            >
              {tombo.numero}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      chave: 'categoria',
      titulo: 'Categoria',
      largura: '15%',
    },
    {
      chave: 'localizacaoAtual',
      titulo: 'Localização',
      largura: '20%',
    },
    {
      chave: 'status',
      titulo: 'Status',
      largura: '10%',
      renderizar: (item: ItemInventario) => (
        <Badge variante={obterCorStatus(item.status)}>
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  const colunasMovimentacoes = [
    {
      chave: 'data',
      titulo: 'Data',
      largura: '12%',
      renderizar: (mov: Movimentacao) =>
        new Date(mov.data).toLocaleDateString('pt-BR'),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      largura: '12%',
      renderizar: (mov: Movimentacao) => (
        <Badge variante={obterCorTipoMovimentacao(mov.tipo)}>
          {mov.tipo.toUpperCase()}
        </Badge>
      ),
    },
    {
      chave: 'itemNome',
      titulo: 'Item',
      largura: '25%',
    },
    {
      chave: 'origem',
      titulo: 'Origem',
      largura: '15%',
      renderizar: (mov: Movimentacao) => mov.origem || '-',
    },
    {
      chave: 'destino',
      titulo: 'Destino',
      largura: '15%',
      renderizar: (mov: Movimentacao) => mov.destino || '-',
    },
    {
      chave: 'responsavel',
      titulo: 'Responsável',
      largura: '13%',
    },
    {
      chave: 'observacoes',
      titulo: 'Obs.',
      largura: '8%',
      renderizar: (mov: Movimentacao) => (mov.observacoes ? '📝' : '-'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Cabeçalho */}
        <div className="mb-8">
          <Link
            href="/administrador"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-semibold mb-4"
          >
            <ArrowLeft size={16} />
            Voltar ao Painel
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 border-2 border-blue-200">
                <Package size={32} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Sistema de Inventário
                </h1>
                <p className="text-slate-600 mt-1">
                  Gestão patrimonial com controle completo
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              <Plus size={20} />
              Novo Item
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="mb-6">
          <div className="flex border-b-2 border-slate-200">
            <button
              onClick={() => setAbaAtiva('inventario')}
              className={`px-6 py-3 font-bold transition-colors ${
                abaAtiva === 'inventario'
                  ? 'border-b-4 border-slate-900 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inventário ({itensFiltrados.length})
            </button>
            <button
              onClick={() => setAbaAtiva('movimentacoes')}
              className={`px-6 py-3 font-bold transition-colors ${
                abaAtiva === 'movimentacoes'
                  ? 'border-b-4 border-slate-900 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico de Movimentações ({movimentacoes.length})
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {abaAtiva === 'inventario' && (
          <>
            {/* Resumo do Patrimônio */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">
                Resumo do Patrimônio
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CardEstatistica
                  titulo="Total de Itens"
                  valor={estatisticas.totalItens}
                  icone={<Package size={24} />}
                  cor="azul"
                />
                <CardEstatistica
                  titulo="Movimentações/Mês"
                  valor={estatisticas.movimentacoesMes}
                  icone={<TrendingUp size={24} />}
                  cor="roxo"
                />
                <CardEstatistica
                  titulo="Em Manutenção"
                  valor={estatisticas.porStatus.manutencao}
                  icone={<FileText size={24} />}
                  cor="ambar"
                />
                <CardEstatistica
                  titulo="Baixados"
                  valor={estatisticas.porStatus.baixado}
                  icone={<FileText size={24} />}
                  cor="vermelho"
                />
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">
                Distribuição por Categoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(estatisticas.porCategoria).map(([categoria, quantidade]) => (
                  <div
                    key={categoria}
                    className="p-4 bg-slate-50 border-2 border-slate-200"
                  >
                    <p className="text-sm font-semibold text-slate-600 mb-1">
                      {categoria}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {quantidade} {quantidade === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Listagem de Itens */}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">
                Itens do Inventário
              </h2>
            </div>
            
            <FiltrosInventarioComponent
              filtros={filtros}
              localizacoes={localizacoes}
              onFiltrosChange={setFiltros}
            />
            <div className="bg-white border-2 border-slate-200">
              <Tabela
                dados={itensFiltrados}
                colunas={colunasItens}
                onCliqueLinha={abrirAcoes}
                mensagemVazia="Nenhum item encontrado com os filtros aplicados"
              />
            </div>
          </>
        )}

        {abaAtiva === 'movimentacoes' && (
          <div className="bg-white border-2 border-slate-200">
            <Tabela
              dados={movimentacoes}
              colunas={colunasMovimentacoes}
              mensagemVazia="Nenhuma movimentação registrada"
            />
          </div>
        )}
      </main>

      <Rodape />

      {/* Modais */}
      <ModalAcoesItem
        item={itemSelecionado}
        aberto={modalAcoesAberto}
        onFechar={() => setModalAcoesAberto(false)}
        onTransferir={handleTransferir}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
        localizacoes={localizacoes}
      />

      <ModalNovoItem
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onSalvar={handleNovoItem}
        categorias={categorias}
        localizacoes={localizacoes}
      />
    </div>
  );
}