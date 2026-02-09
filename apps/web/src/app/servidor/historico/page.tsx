// ============================================================
// app/servidor/historico/page.tsx
// Página principal do Histórico de Trabalho
// Substitui a planilha Excel com interface web aprimorada
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  ArrowLeft,
  Download,
  List,
  GitBranch,
  Clock,
  CheckSquare,
  Bell,
  BarChart3,
} from 'lucide-react';
import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { CartaoEstatistica } from '../../componentes/cartoes/CartaoEstatistica';
import { BarraFiltros } from '../../componentes/formularios/BarraFiltros';
import { ModalNovoRegistro } from '../../componentes/formularios/ModalNovoRegistro';
import { TabelaRegistros } from '../../componentes/tabelas/TabelaRegistros';
import { LinhaDoTempo } from '../../componentes/tabelas/LinhaDoTempo';
import { registrosMock, estatisticasMock } from './dados-mock';
import { FiltrosHistorico, RegistroAtividade } from '../../tipos/historico';

type ModoVisualizacao = 'tabela' | 'timeline';

const FILTROS_INICIAIS: FiltrosHistorico = {
  busca: '',
  categoria: 'todas',
  status: 'todos',
  dataInicio: '',
  dataFim: '',
};

export default function PaginaHistorico() {
  const [registros, setRegistros] = useState<RegistroAtividade[]>(registrosMock);
  const [filtros, setFiltros] = useState<FiltrosHistorico>(FILTROS_INICIAIS);
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('tabela');
  const [modalAberto, setModalAberto] = useState(false);

  // Filtragem dos registros
  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      // Busca textual
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase();
        const corresponde =
          reg.numeroProcesso.toLowerCase().includes(termo) ||
          reg.partes.toLowerCase().includes(termo) ||
          reg.descricaoAcao.toLowerCase().includes(termo) ||
          (reg.observacao?.toLowerCase().includes(termo) ?? false);
        if (!corresponde) return false;
      }

      // Categoria
      if (filtros.categoria !== 'todas' && reg.categoriaAcao !== filtros.categoria) {
        return false;
      }

      // Status
      if (filtros.status !== 'todos' && reg.status !== filtros.status) {
        return false;
      }

      // Datas (comparação simples DD/MM/YYYY)
      if (filtros.dataInicio) {
        const dataInicioISO = filtros.dataInicio; // yyyy-mm-dd
        const regDataISO = converterDataParaISO(reg.data);
        if (regDataISO < dataInicioISO) return false;
      }
      if (filtros.dataFim) {
        const dataFimISO = filtros.dataFim;
        const regDataISO = converterDataParaISO(reg.data);
        if (regDataISO > dataFimISO) return false;
      }

      return true;
    });
  }, [registros, filtros]);

  const handleSalvarRegistro = (dados: any) => {
    const novoRegistro: RegistroAtividade = {
      id: `reg-${Date.now()}`,
      numeroProcesso: dados.numeroProcesso,
      partes: dados.partes || 'Partes não informadas',
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      categoriaAcao: dados.categoriaAcao,
      descricaoAcao: dados.descricaoAcao,
      observacao: dados.observacao || undefined,
      servidor: 'Maria Silva',
      status: dados.status,
      temLembrete: dados.temLembrete,
      dataLembrete: dados.temLembrete ? formatarDataBR(dados.dataLembrete) : undefined,
      descricaoLembrete: dados.temLembrete ? dados.descricaoLembrete : undefined,
    };

    setRegistros((prev) => [novoRegistro, ...prev]);
    setModalAberto(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario="Maria Silva"
        subtitulo="Setor Cível - 1ª Vara"
        tipoPerfil="servidor"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Navegação de volta + título */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a
              href="/servidor"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-semibold mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar ao painel
            </a>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Histórico de Trabalho
            </h2>
            <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
              Registre e consulte todas as atividades realizadas por processo. Cada entrada é auditada com data, hora e servidor responsável.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {/* Em produção: exportar para Excel */}}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 border-2 border-slate-200 hover:border-slate-400 transition-colors"
            >
              <Download size={16} />
              Exportar
            </button>
            <button
              onClick={() => setModalAberto(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              Novo Registro
            </button>
          </div>
        </div>

        {/* Cartões de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <CartaoEstatistica
            titulo="Total de Registros"
            valor={estatisticasMock.totalRegistros}
            descricao="Este mês"
            icone={<BarChart3 size={24} strokeWidth={2} />}
          />
          <CartaoEstatistica
            titulo="Registros Hoje"
            valor={estatisticasMock.registrosHoje}
            descricao="Atividades realizadas"
            icone={<CheckSquare size={24} strokeWidth={2} />}
          />
          <CartaoEstatistica
            titulo="Processos Atendidos"
            valor={estatisticasMock.processosAtendidos}
            descricao="Distintos este mês"
            icone={<FileText size={24} strokeWidth={2} />}
          />
          <CartaoEstatistica
            titulo="Lembretes Ativos"
            valor={estatisticasMock.lembretesAtivos}
            descricao="Pendentes de verificação"
            icone={<Bell size={24} strokeWidth={2} />}
          />
        </div>

        {/* Barra de filtros */}
        <div className="mb-6">
          <BarraFiltros
            filtros={filtros}
            onFiltroChange={setFiltros}
            onLimpar={() => setFiltros(FILTROS_INICIAIS)}
            totalResultados={registrosFiltrados.length}
          />
        </div>

        {/* Alternador de visualização */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">
            Visualização
          </span>
          <button
            onClick={() => setModoVisualizacao('tabela')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border-2 transition-colors ${
              modoVisualizacao === 'tabela'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            <List size={16} />
            Tabela
          </button>
          <button
            onClick={() => setModoVisualizacao('timeline')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border-2 transition-colors ${
              modoVisualizacao === 'timeline'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            <GitBranch size={16} />
            Linha do Tempo
          </button>
        </div>

        {/* Conteúdo principal */}
        {modoVisualizacao === 'tabela' ? (
          <TabelaRegistros registros={registrosFiltrados} />
        ) : (
          <LinhaDoTempo registros={registrosFiltrados} />
        )}

        {/* Legenda - cabeçalho da tabela tipo Excel */}
        {modoVisualizacao === 'tabela' && registrosFiltrados.length > 0 && (
          <div className="mt-8 p-4 bg-slate-100 border-2 border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Legenda
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Concluído
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Em andamento
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Pendente
              </span>
              <span className="flex items-center gap-1.5">
                <Bell size={12} className="text-amber-500" /> Possui lembrete
              </span>
            </div>
          </div>
        )}
      </main>

      <Rodape />

      {/* Modal de novo registro */}
      <ModalNovoRegistro
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleSalvarRegistro}
      />
    </div>
  );
}

// ============================================================
// Utilitários
// ============================================================

function converterDataParaISO(dataBR: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const [dia, mes, ano] = dataBR.split('/');
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}
