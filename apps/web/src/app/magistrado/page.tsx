import React from 'react';
import { Users, ClipboardList, BarChart3, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import { Cabecalho } from '../componentes/layout/Cabecalho';
import { Rodape } from '../componentes/layout/Rodape';
import { CartaoModulo } from '../componentes/cartoes/CartaoModulo';
import { CartaoEstatistica } from '../componentes/cartoes/CartaoEstatistica';
import { AtividadeServidor, ProcessoPrioritario } from '../../../perfis/AtividadeServidor';

export default function PaginaMagistrado() {
  // Dados mockados - em produção viriam da API
  const atividadesServidores = [
    {
      nomeServidor: 'Maria Silva',
      setor: '1ª Vara Cível',
      tarefasPendentes: 12,
      concluidasHoje: 5,
      status: 'sobrecarga' as const,
    },
    {
      nomeServidor: 'João Santos',
      setor: '1ª Vara Cível',
      tarefasPendentes: 7,
      concluidasHoje: 8,
      status: 'ativo' as const,
    },
    {
      nomeServidor: 'Ana Costa',
      setor: '2ª Vara Cível',
      tarefasPendentes: 5,
      concluidasHoje: 6,
      status: 'ativo' as const,
    },
    {
      nomeServidor: 'Pedro Oliveira',
      setor: '2ª Vara Cível',
      tarefasPendentes: 3,
      concluidasHoje: 2,
      status: 'ocioso' as const,
    },
  ];

  const processosPrioritarios = [
    {
      numeroProcesso: '0001234-56.2024.8.00.0001',
      assunto: 'Ação de Indenização por Danos Morais',
      atribuidoA: 'Maria Silva',
      status: 'Aguardando despacho',
      prioridade: 'alta' as const,
    },
    {
      numeroProcesso: '0007890-12.2024.8.00.0001',
      assunto: 'Cumprimento de Sentença',
      atribuidoA: 'João Santos',
      status: 'Em andamento',
      prioridade: 'alta' as const,
    },
    {
      numeroProcesso: '0005678-90.2024.8.00.0001',
      assunto: 'Ação de Cobrança',
      atribuidoA: 'Ana Costa',
      status: 'Revisão pendente',
      prioridade: 'media' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Dr. João Magistrado"
        subtitulo="1ª e 2ª Vara Cível"
        tipoPerfil="magistrado"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Seção de Título */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Painel de Orquestração
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Gerencie tarefas do cartório, acompanhe a execução e tome decisões estratégicas com base em dados consolidados.
          </p>
        </div>

        {/* Cartões de Módulos */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Módulos do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CartaoModulo
              icone={<ClipboardList size={28} strokeWidth={2} />}
              titulo="Atribuição de Tarefas"
              descricao="Crie e priorize tarefas para o cartório. Distribua trabalho e defina prazos."
              href="/magistrado/tarefas"
              estatisticas={{
                rotulo: 'tarefas ativas',
                valor: 27,
                variante: 'padrao',
              }}
            />
            <CartaoModulo
              icone={<Users size={28} strokeWidth={2} />}
              titulo="Acompanhamento"
              descricao="Monitore a execução do trabalho do cartório. Visualize carga e produtividade."
              href="/magistrado/acompanhamento"
              estatisticas={{
                rotulo: 'servidores ativos',
                valor: 8,
                variante: 'sucesso',
              }}
            />
            <CartaoModulo
              icone={<BarChart3 size={28} strokeWidth={2} />}
              titulo="Relatórios"
              descricao="Acesse dashboards consolidados e relatórios para tomada de decisão."
              href="/magistrado/relatorios"
              estatisticas={{
                rotulo: 'processos em análise',
                valor: 156,
                variante: 'padrao',
              }}
            />
          </div>
        </div>

        {/* Visão Consolidada */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Visão Consolidada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <CartaoEstatistica
              titulo="Tarefas Pendentes"
              valor={27}
              descricao="Distribuídas ao cartório"
              icone={<ClipboardList size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Concluídas Hoje"
              valor={21}
              descricao="Média de 2,6 por servidor"
              icone={<TrendingUp size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Processos Ativos"
              valor={156}
              descricao="Em acompanhamento"
              icone={<Eye size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Taxa de Conclusão"
              valor="87%"
              descricao="+5% vs semana anterior"
              icone={<BarChart3 size={24} strokeWidth={2} />}
              corDestaque="text-green-600"
            />
          </div>
        </div>

        {/* Carga de Trabalho e Processos Prioritários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Carga de Trabalho */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Carga de Trabalho
              </h3>
              <a href="/magistrado/acompanhamento" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver detalhes →
              </a>
            </div>
            <div className="space-y-3 mb-6">
              {atividadesServidores.map((atividade, index) => (
                <AtividadeServidor key={index} {...atividade} />
              ))}
            </div>
            <div className="p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Atenção à distribuição</p>
                <p className="text-xs text-amber-800 mt-1">
                  Maria Silva possui carga elevada (12 tarefas). Considere redistribuir para equilibrar.
                </p>
              </div>
            </div>
          </div>

          {/* Processos Prioritários */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Processos Prioritários
              </h3>
              <a href="/magistrado/processos" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todos →
              </a>
            </div>
            <div className="space-y-3">
              {processosPrioritarios.map((processo, index) => (
                <ProcessoPrioritario key={index} {...processo} />
              ))}
            </div>
          </div>
        </div>

        {/* Aviso de Acesso */}
        <div className="mt-12 p-6 bg-slate-100 border-2 border-slate-300">
          <div className="flex items-start gap-4">
            <Eye size={24} className="text-slate-600 flex-shrink-0 mt-1" strokeWidth={2} />
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Acesso Global de Leitura</h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                Como magistrado, você possui acesso de leitura a todos os módulos do sistema, incluindo Inventário, Férias e demais controles administrativos. 
                Todas as consultas são registradas para fins de auditoria e rastreabilidade institucional.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
