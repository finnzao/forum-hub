import React from 'react';
import {
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  Users,
  Eye,
  TrendingUp,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Cabecalho } from '../componentes/layout/Cabecalho';
import { Rodape } from '../componentes/layout/Rodape';
import { CartaoModulo } from '../componentes/cartoes/CartaoModulo';
import { CartaoEstatistica } from '../componentes/cartoes/CartaoEstatistica';
import { ItemTarefa } from '../componentes/cartoes/ItemTarefa';
import { ItemLembrete } from '../componentes/cartoes/ItemLembrete';
import { AtividadeServidor } from '../componentes/cartoes/AtividadeServidor';
import { AtividadeEnviada } from '../componentes/cartoes/AtividadeEnviada';

export default function PaginaChefeCartorio() {
  // ── Dados mockados ──────────────────────────────────────
  // Em produção viriam da API

  const minhasTarefas = [
    {
      numeroProcesso: '0001234-56.2024.8.00.0001',
      titulo: 'Revisar minuta de despacho de citação',
      prioridade: 'alta' as const,
      prazo: '08/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
    {
      numeroProcesso: '0007890-12.2024.8.00.0001',
      titulo: 'Conferir cálculos de liquidação',
      prioridade: 'media' as const,
      prazo: '12/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
    {
      numeroProcesso: '0005678-90.2024.8.00.0001',
      titulo: 'Elaborar certidão de trânsito em julgado',
      prioridade: 'baixa' as const,
      prazo: '15/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
  ];

  const atividadesEnviadas = [
    {
      numeroProcesso: '0002345-67.2024.8.00.0001',
      titulo: 'Minutar ofício ao DETRAN',
      atribuidoA: 'Maria Silva',
      status: 'em_andamento' as const,
      prazo: '10/02/2026',
      enviadoEm: '05/02/2026',
    },
    {
      numeroProcesso: '0003456-78.2024.8.00.0001',
      titulo: 'Juntar contestação e intimar autor',
      atribuidoA: 'João Santos',
      status: 'pendente' as const,
      prazo: '09/02/2026',
      enviadoEm: '04/02/2026',
    },
    {
      numeroProcesso: '0004567-89.2024.8.00.0001',
      titulo: 'Expedir mandado de intimação',
      atribuidoA: 'Ana Costa',
      status: 'atrasada' as const,
      prazo: '03/02/2026',
      enviadoEm: '28/01/2026',
    },
    {
      numeroProcesso: '0006789-01.2024.8.00.0001',
      titulo: 'Publicar despacho no DJe',
      atribuidoA: 'Pedro Oliveira',
      status: 'concluida' as const,
      prazo: '06/02/2026',
      enviadoEm: '03/02/2026',
    },
  ];

  const cargaEquipe = [
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
      setor: '1ª Vara Cível',
      tarefasPendentes: 5,
      concluidasHoje: 6,
      status: 'ativo' as const,
    },
    {
      nomeServidor: 'Pedro Oliveira',
      setor: '1ª Vara Cível',
      tarefasPendentes: 3,
      concluidasHoje: 2,
      status: 'ocioso' as const,
    },
  ];

  const lembretesProximos = [
    {
      numeroProcesso: '0001234-56.2024.8.00.0001',
      descricao: 'Prazo para manifestação da parte autora',
      prazo: '07/02/2026',
      diasRestantes: 2,
    },
    {
      numeroProcesso: '0002345-67.2024.8.00.0001',
      descricao: 'Audiência de conciliação',
      prazo: '10/02/2026',
      diasRestantes: 5,
    },
    {
      numeroProcesso: '0003456-78.2024.8.00.0001',
      descricao: 'Prazo para juntada de documentos',
      prazo: '18/02/2026',
      diasRestantes: 13,
    },
  ];

  // ── Renderização ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario="Carlos Ferreira"
        subtitulo="Chefe de Cartório — 1ª Vara Cível"
        tipoPerfil="chefe-cartorio"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Seção de Título */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Painel de Chefia
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Distribua tarefas para a equipe, execute atividades atribuídas pelo magistrado,
            acompanhe a produtividade dos servidores e controle prazos processuais.
          </p>
        </div>

        {/* Cartões de Módulos */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Módulos do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <CartaoModulo
              icone={<ClipboardList size={28} strokeWidth={2} />}
              titulo="Atribuição de Tarefas"
              descricao="Crie e priorize tarefas para o cartório. Distribua trabalho e defina prazos para cada servidor."
              href="/chefe-cartorio/atribuicao"
              estatisticas={{
                rotulo: 'tarefas ativas',
                valor: 27,
                variante: 'padrao',
              }}
            />
            <CartaoModulo
              icone={<Users size={28} strokeWidth={2} />}
              titulo="Acompanhamento"
              descricao="Monitore a execução do trabalho da equipe. Visualize carga, produtividade e atividades enviadas."
              href="/chefe-cartorio/acompanhamento"
              estatisticas={{
                rotulo: 'servidores ativos',
                valor: 8,
                variante: 'sucesso',
              }}
            />
            <CartaoModulo
              icone={<CheckSquare size={28} strokeWidth={2} />}
              titulo="Minhas Tarefas"
              descricao="Visualize e execute tarefas atribuídas pelo magistrado. Controle de status e histórico auditável."
              href="/chefe-cartorio/tarefas"
              estatisticas={{
                rotulo: 'pendentes',
                valor: 8,
                variante: 'aviso',
              }}
            />
            <CartaoModulo
              icone={<FileText size={28} strokeWidth={2} />}
              titulo="Histórico de Trabalho"
              descricao="Registre todas as atividades realizadas por processo. Linha do tempo completa e auditada."
              href="/chefe-cartorio/historico"
              estatisticas={{
                rotulo: 'registros este mês',
                valor: 47,
                variante: 'sucesso',
              }}
            />
            <CartaoModulo
              icone={<Clock size={28} strokeWidth={2} />}
              titulo="Lembretes de Prazos"
              descricao="Controle prazos processuais com notificações. Vinculação direta aos processos da vara."
              href="/chefe-cartorio/lembretes"
              estatisticas={{
                rotulo: 'próximos 7 dias',
                valor: 5,
                variante: 'perigo',
              }}
            />
          </div>
        </div>

        {/* Resumo Operacional */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Resumo Operacional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <CartaoEstatistica
              titulo="Tarefas Distribuídas"
              valor={27}
              descricao="4 atrasadas, 9 em andamento"
              icone={<Send size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Minhas Pendentes"
              valor={8}
              descricao="3 de alta prioridade"
              icone={<CheckSquare size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Concluídas pela Equipe"
              valor={21}
              descricao="Média de 5,3 por servidor hoje"
              icone={<TrendingUp size={24} strokeWidth={2} />}
              corDestaque="text-green-600"
            />
            <CartaoEstatistica
              titulo="Prazos Próximos"
              valor={5}
              descricao="Nos próximos 7 dias"
              icone={<Clock size={24} strokeWidth={2} />}
              corDestaque="text-amber-600"
            />
          </div>
        </div>

        {/* Grid duplo: Atividades Enviadas + Minhas Tarefas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Atividades Enviadas (exclusivo deste perfil) */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Atividades Enviadas
              </h3>
              <a
                href="/chefe-cartorio/acompanhamento"
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold"
              >
                Ver todas →
              </a>
            </div>
            <div className="space-y-3">
              {atividadesEnviadas.map((atividade, index) => (
                <AtividadeEnviada key={index} {...atividade} />
              ))}
            </div>
          </div>

          {/* Minhas Tarefas (recebidas do magistrado) */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Minhas Tarefas
              </h3>
              <a
                href="/chefe-cartorio/tarefas"
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold"
              >
                Ver todas →
              </a>
            </div>
            <div className="space-y-3">
              {minhasTarefas.map((tarefa, index) => (
                <ItemTarefa key={index} {...tarefa} />
              ))}
            </div>
          </div>
        </div>

        {/* Grid duplo: Carga de Trabalho + Prazos Próximos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Carga de Trabalho da Equipe */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Carga da Equipe
              </h3>
              <a
                href="/chefe-cartorio/acompanhamento"
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold"
              >
                Ver detalhes →
              </a>
            </div>
            <div className="space-y-3 mb-6">
              {cargaEquipe.map((atividade, index) => (
                <AtividadeServidor key={index} {...atividade} />
              ))}
            </div>
            <div className="p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="text-amber-700 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Atenção à distribuição
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Maria Silva possui carga elevada (12 tarefas). Considere
                  redistribuir para Pedro Oliveira que está ocioso.
                </p>
              </div>
            </div>
          </div>

          {/* Prazos Próximos */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Prazos Próximos
              </h3>
              <a
                href="/chefe-cartorio/lembretes"
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold"
              >
                Ver todos →
              </a>
            </div>
            <div className="space-y-3">
              {lembretesProximos.map((lembrete, index) => (
                <ItemLembrete key={index} {...lembrete} />
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="text-amber-700 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Atenção aos prazos
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Você possui 1 lembrete com vencimento em menos de 3 dias e 1
                  tarefa enviada com prazo estourado.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso de Acesso */}
        <div className="mt-12 p-6 bg-slate-100 border-2 border-slate-300">
          <div className="flex items-start gap-4">
            <Eye
              size={24}
              className="text-slate-600 flex-shrink-0 mt-1"
              strokeWidth={2}
            />
            <div>
              <h4 className="font-bold text-slate-900 mb-2">
                Perfil de Chefia — Acesso Híbrido
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                Como Chefe de Cartório, você possui permissão para distribuir
                tarefas à equipe, acompanhar a execução e também executar
                atividades atribuídas pelo magistrado. Todas as operações são
                registradas para fins de auditoria e rastreabilidade
                institucional.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
