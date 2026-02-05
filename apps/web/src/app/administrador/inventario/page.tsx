'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { CardEstatistica } from './componentes/CardEstatistica';
import { FiltrosInventarioComponent } from './componentes/FiltrosInventario';
import { Tabela } from './componentes/Tabela';
import { Badge } from './componentes/Badge';
import { ModalDetalhesItem } from './componentes/ModalDetalhesItem';
import {
  itensInventario,
  movimentacoes,
  estatisticas,
  LOCALIZACOES,
} from './data/mockData';
import { ItemInventario, FiltrosInventario, Movimentacao } from './types/inventario';

export default function PaginaInventario() {
  const [abaAtiva, setAbaAtiva] = useState<'itens' | 'movimentacoes'>('itens');
  const [filtros, setFiltros] = useState<FiltrosInventario>({});
  const [itemSelecionado, setItemSelecionado] = useState<ItemInventario | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Filtrar itens
  const itensFiltrados = useMemo(() => {
    return itensInventario.filter((item) => {
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
  }, [filtros]);

  const abrirDetalhes = (item: ItemInventario) => {
    setItemSelecionado(item);
    setModalAberto(true);
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
      largura: '25%',
    },
    {
      chave: 'tombos',
      titulo: 'Tombos',
      largura: '20%',
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
      largura: '12%',
    },
    {
      chave: 'localizacaoAtual',
      titulo: 'Localização',
      largura: '20%',
    },
    {
      chave: 'status',
      titulo: 'Status',
      largura: '12%',
      renderizar: (item: ItemInventario) => (
        <Badge variante={obterCorStatus(item.status)}>
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      chave: 'valorAquisicao',
      titulo: 'Valor',
      largura: '11%',
      renderizar: (item: ItemInventario) =>
        item.valorAquisicao.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
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
      titulo: 'Observações',
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
        {/* Breadcrumb e Título */}
        <div className="mb-8">
          <Link
            href="/administrador"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-semibold mb-4"
          >
            <ArrowLeft size={16} />
            Voltar ao Painel
          </Link>
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-blue-100 text-blue-700 border-2 border-blue-200">
              <Package size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Sistema de Inventário
              </h1>
              <p className="text-slate-600 mt-1">
                Gestão patrimonial com controle completo e auditoria
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard - Estatísticas */}
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
              titulo="Valor Total"
              valor={estatisticas.valorTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
              icone={<DollarSign size={24} />}
              cor="verde"
            />
            <CardEstatistica
              titulo="Movimentações/Mês"
              valor={estatisticas.movimentacoesMes}
              icone={<TrendingUp size={24} />}
              cor="roxo"
              tendencia={{ valor: '+2 vs mês anterior', positiva: true }}
            />
            <CardEstatistica
              titulo="Em Manutenção"
              valor={estatisticas.porStatus.manutencao}
              icone={<FileText size={24} />}
              cor="ambar"
            />
          </div>
        </div>

        {/* Distribuição por Categoria */}
        <div className="mb-8 bg-white border-2 border-slate-200 p-6">
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
                <p className="text-2xl font-bold text-slate-900">{quantidade} itens</p>
              </div>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div className="mb-6">
          <div className="flex border-b-2 border-slate-200">
            <button
              onClick={() => setAbaAtiva('itens')}
              className={`px-6 py-3 font-bold transition-colors ${
                abaAtiva === 'itens'
                  ? 'border-b-4 border-slate-900 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Itens do Inventário ({itensFiltrados.length})
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
        {abaAtiva === 'itens' ? (
          <>
            <FiltrosInventarioComponent
              filtros={filtros}
              localizacoes={LOCALIZACOES}
              onFiltrosChange={setFiltros}
            />
            <div className="bg-white border-2 border-slate-200">
              <Tabela
                dados={itensFiltrados}
                colunas={colunasItens}
                onCliqueLinha={abrirDetalhes}
                mensagemVazia="Nenhum item encontrado com os filtros aplicados"
              />
            </div>
          </>
        ) : (
          <div className="bg-white border-2 border-slate-200">
            <Tabela
              dados={movimentacoes}
              colunas={colunasMovimentacoes}
              mensagemVazia="Nenhuma movimentação registrada"
            />
          </div>
        )}

        {/* Informações de Auditoria */}
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <Calendar size={24} className="text-blue-700 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Auditoria Completa</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                Todas as operações de criação, edição e movimentação são registradas
                com timestamp e responsável. O histórico completo está disponível para
                consulta e geração de relatórios de compliance.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Rodape />

      {/* Modal de Detalhes */}
      <ModalDetalhesItem
        item={itemSelecionado}
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      />
    </div>
  );
}
