'use client';

import React from 'react';
import { Calendar, Users, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { CartaoEstatistica } from '../../componentes/cartoes/CartaoEstatistica';
import { CardAusencia } from '../../../componentes/ferias/CardAusencia';
import { useFeriasManager } from '../../../hooks/useFeriasManager';
import Link from 'next/link';

export default function PaginaFeriasAdministrador() {
  const { ausencias, obterEstatisticas, aprovarAusencia, rejeitarAusencia } = useFeriasManager();
  const stats = obterEstatisticas();
  
  // Pegar ausências recentes (últimas 3)
  const ausenciasRecentes = ausencias
    .sort((a, b) => b.solicitadoEm.getTime() - a.solicitadoEm.getTime())
    .slice(0, 3);
  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Seção de Título */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Gestão de Férias e Ausências
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Controle centralizado de ausências por setor com validação automática de limites e prevenção de conflitos operacionais.
          </p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Resumo Operacional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <CartaoEstatistica
              titulo="Pendentes"
              valor={stats.totalPendentes}
              descricao="Aguardando aprovação"
              icone={<Clock size={24} strokeWidth={2} />}
              corDestaque="text-amber-700"
            />
            <CartaoEstatistica
              titulo="Aprovadas"
              valor={stats.totalAprovadas}
              descricao="No ano corrente"
              icone={<CheckCircle size={24} strokeWidth={2} />}
              corDestaque="text-green-700"
            />
            <CartaoEstatistica
              titulo="Rejeitadas"
              valor={stats.totalRejeitadas}
              descricao="Não aprovadas"
              icone={<AlertCircle size={24} strokeWidth={2} />}
              corDestaque="text-red-700"
            />
            <CartaoEstatistica
              titulo="Funcionários"
              valor={stats.totalFuncionarios}
              descricao="Total cadastrados"
              icone={<Users size={24} strokeWidth={2} />}
              corDestaque="text-slate-600"
            />
          </div>
        </div>

        {/* Ações Principais */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Ações Principais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/administrador/ferias/solicitacoes"
              className="group block p-6 bg-white border-2 border-slate-200 hover:border-amber-600 transition-all duration-150"
            >
              <div className="p-3 bg-amber-100 text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-colors inline-flex mb-4">
                <Clock size={24} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Solicitações Pendentes
              </h4>
              <p className="text-sm text-slate-600">
                Aprovar ou rejeitar solicitações
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
                3 pendentes
              </div>
            </Link>

            <Link
              href="/administrador/ferias/calendario"
              className="group block p-6 bg-white border-2 border-slate-200 hover:border-slate-400 transition-all duration-150"
            >
              <div className="p-3 bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors inline-flex mb-4">
                <Calendar size={24} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Calendário Geral
              </h4>
              <p className="text-sm text-slate-600">
                Visualização temporal das ausências
              </p>
            </Link>

            <Link
              href="/administrador/ferias/funcionarios"
              className="group block p-6 bg-white border-2 border-slate-200 hover:border-slate-400 transition-all duration-150"
            >
              <div className="p-3 bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors inline-flex mb-4">
                <Users size={24} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Funcionários
              </h4>
              <p className="text-sm text-slate-600">
                Gerenciar cadastro de funcionários
              </p>
            </Link>

            <Link
              href="/administrador/ferias/setores"
              className="group block p-6 bg-white border-2 border-slate-200 hover:border-slate-400 transition-all duration-150"
            >
              <div className="p-3 bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors inline-flex mb-4">
                <Settings size={24} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Configurar Setores
              </h4>
              <p className="text-sm text-slate-600">
                Definir limites de ausências
              </p>
            </Link>
          </div>
        </div>

        {/* Solicitações Recentes */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Solicitações Recentes
            </h3>
            <Link 
              href="/administrador/ferias/solicitacoes"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Ver todas →
            </Link>
          </div>
          
          {ausenciasRecentes.length > 0 ? (
            <div className="space-y-4">
              {ausenciasRecentes.map(ausencia => (
                <CardAusencia
                  key={ausencia.id}
                  ausencia={ausencia}
                  exibirAcoes={ausencia.status === 'pendente'}
                  onAprovar={aprovarAusencia}
                  onRejeitar={(id) => rejeitarAusencia(id, 'Rejeitado pelo administrador')}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white border-2 border-slate-200 text-center">
              <Clock size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600">Nenhuma solicitação recente</p>
            </div>
          )}
        </div>
      </main>

      <Rodape />
    </div>
  );
}
