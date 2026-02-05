'use client';

import React, { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Cabecalho } from '../../../componentes/layout/Cabecalho';
import { Rodape } from '../../../componentes/layout/Rodape';
import { CardAusencia } from '../../../../componentes/ferias/CardAusencia';
import { useFeriasManager } from '../../../../hooks/useFeriasManager';
import Link from 'next/link';
import { StatusAusencia } from '../../../../tipos/ferias';

export default function PaginaSolicitacoes() {
  const { ausencias, aprovarAusencia, rejeitarAusencia } = useFeriasManager();
  const [filtroStatus, setFiltroStatus] = useState<StatusAusencia | 'todas'>('pendente');

  // Filtrar ausências
  const ausenciasFiltradas = filtroStatus === 'todas'
    ? ausencias
    : ausencias.filter(a => a.status === filtroStatus);

  // Ordenar por data de solicitação (mais recentes primeiro)
  const ausenciasOrdenadas = [...ausenciasFiltradas].sort(
    (a, b) => b.solicitadoEm.getTime() - a.solicitadoEm.getTime()
  );

  const totalPendentes = ausencias.filter(a => a.status === 'pendente').length;
  const totalAprovadas = ausencias.filter(a => a.status === 'aprovada').length;
  const totalRejeitadas = ausencias.filter(a => a.status === 'rejeitada').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <a href="/administrador" className="hover:text-slate-900">Administrador</a>
            <span>›</span>
            <a href="/administrador/ferias" className="hover:text-slate-900">Férias</a>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Solicitações</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Solicitações de Ausências
              </h2>
              <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
                Analise e aprove solicitações de ausências. O sistema detecta automaticamente conflitos com os limites configurados por setor.
              </p>
            </div>
            <Link
              href="/administrador/ferias/nova"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              <Plus size={20} />
              Nova Ausência
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setFiltroStatus('todas')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              filtroStatus === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            Todas ({ausencias.length})
          </button>
          <button
            onClick={() => setFiltroStatus('pendente')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              filtroStatus === 'pendente'
                ? 'bg-slate-900 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            onClick={() => setFiltroStatus('aprovada')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              filtroStatus === 'aprovada'
                ? 'bg-slate-900 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            Aprovadas ({totalAprovadas})
          </button>
          <button
            onClick={() => setFiltroStatus('rejeitada')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              filtroStatus === 'rejeitada'
                ? 'bg-slate-900 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            Rejeitadas ({totalRejeitadas})
          </button>
        </div>

        {/* Lista de Solicitações */}
        <div className="space-y-6">
          {ausenciasOrdenadas.map((ausencia) => (
            <CardAusencia
              key={ausencia.id}
              ausencia={ausencia}
              exibirAcoes={ausencia.status === 'pendente'}
              onAprovar={aprovarAusencia}
              onRejeitar={(id) => rejeitarAusencia(id, 'Rejeitado pelo administrador')}
            />
          ))}
        </div>

        {/* Sem solicitações */}
        {ausenciasOrdenadas.length === 0 && (
          <div className="p-12 bg-white border-2 border-slate-200 text-center">
            <Clock size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Nenhuma solicitação encontrada
            </h3>
            <p className="text-slate-600">
              {filtroStatus === 'todas' 
                ? 'Não há solicitações no sistema.' 
                : `Não há solicitações com status "${filtroStatus}".`}
            </p>
          </div>
        )}
      </main>

      <Rodape />
    </div>
  );
}
