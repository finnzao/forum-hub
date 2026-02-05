import React from 'react';
import { CheckSquare, Clock, FileText, AlertCircle } from 'lucide-react';
import { Cabecalho } from '../componentes/layout/Cabecalho';
import { Rodape } from '../componentes/layout/Rodape';
import { CartaoModulo } from '../componentes/cartoes/CartaoModulo';
import { CartaoEstatistica } from '../componentes/cartoes/CartaoEstatistica';
import { ItemTarefa } from '../componentes/cartoes/ItemTarefa';
import { ItemLembrete } from '../componentes/cartoes/ItemLembrete';

export default function PaginaServidor() {
  // Dados mockados - em produção viriam da API
  const tarefasPendentes = [
    {
      numeroProcesso: '0001234-56.2024.8.00.0001',
      titulo: 'Minutar despacho de citação',
      prioridade: 'alta' as const,
      prazo: '08/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
    {
      numeroProcesso: '0007890-12.2024.8.00.0001',
      titulo: 'Elaborar relatório de cumprimento de sentença',
      prioridade: 'media' as const,
      prazo: '12/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
    {
      numeroProcesso: '0005678-90.2024.8.00.0001',
      titulo: 'Revisar petição inicial',
      prioridade: 'baixa' as const,
      prazo: '15/02/2026',
      atribuidoPor: 'Dr. João Magistrado',
    },
  ];

  const lembretesProximos = [
    {
      numeroProcesso: '0001234-56.2024.8.00.0001',
      descricao: 'Prazo para manifestação da parte',
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Maria Silva"
        subtitulo="Setor Cível - 1ª Vara"
        tipoPerfil="servidor"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Seção de Título */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Painel Operacional
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Gerencie suas tarefas, registre o histórico de trabalho e acompanhe prazos processuais com rastreabilidade completa.
          </p>
        </div>

        {/* Cartões de Módulos */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Módulos do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CartaoModulo
              icone={<CheckSquare size={28} strokeWidth={2} />}
              titulo="Tarefas"
              descricao="Visualize e execute tarefas atribuídas pelo magistrado. Controle de status e histórico auditável."
              href="/servidor/tarefas"
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
              href="/servidor/historico"
              estatisticas={{
                rotulo: 'registros este mês',
                valor: 47,
                variante: 'sucesso',
              }}
            />
            <CartaoModulo
              icone={<Clock size={28} strokeWidth={2} />}
              titulo="Lembretes de Prazos"
              descricao="Controle prazos processuais com notificações. Vinculação direta aos processos."
              href="/servidor/lembretes"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CartaoEstatistica
              titulo="Tarefas Pendentes"
              valor={8}
              descricao="3 de alta prioridade"
              icone={<CheckSquare size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Prazos Próximos"
              valor={5}
              descricao="Nos próximos 7 dias"
              icone={<Clock size={24} strokeWidth={2} />}
            />
            <CartaoEstatistica
              titulo="Registros Hoje"
              valor={12}
              descricao="Em 8 processos diferentes"
              icone={<FileText size={24} strokeWidth={2} />}
            />
          </div>
        </div>

        {/* Tarefas e Lembretes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tarefas Urgentes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Tarefas Urgentes
              </h3>
              <a href="/servidor/tarefas" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todas →
              </a>
            </div>
            <div className="space-y-3">
              {tarefasPendentes.map((tarefa, index) => (
                <ItemTarefa key={index} {...tarefa} />
              ))}
            </div>
          </div>

          {/* Prazos Próximos */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                Prazos Próximos
              </h3>
              <a href="/servidor/lembretes" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todos →
              </a>
            </div>
            <div className="space-y-3">
              {lembretesProximos.map((lembrete, index) => (
                <ItemLembrete key={index} {...lembrete} />
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Atenção aos prazos</p>
                <p className="text-xs text-amber-800 mt-1">
                  Você possui 2 lembretes com vencimento em menos de 3 dias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
