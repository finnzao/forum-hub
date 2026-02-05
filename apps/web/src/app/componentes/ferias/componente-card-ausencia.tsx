import React from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import { Ausencia, StatusAusencia, TipoAusencia } from '../../tipos/ferias';
import { formatarData, calcularDiasRestantes } from '../../utils/datas';

interface CardAusenciaProps {
  ausencia: Ausencia;
  exibirAcoes?: boolean;
  onAprovar?: (id: string) => void;
  onRejeitar?: (id: string) => void;
  onVisualizar?: (id: string) => void;
  className?: string;
}

export const CardAusencia: React.FC<CardAusenciaProps> = ({
  ausencia,
  exibirAcoes = false,
  onAprovar,
  onRejeitar,
  onVisualizar,
  className = '',
}) => {
  const obterCorStatus = (status: StatusAusencia) => {
    switch (status) {
      case 'aprovada':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pendente':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejeitada':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelada':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const obterRotuloStatus = (status: StatusAusencia) => {
    switch (status) {
      case 'aprovada':
        return 'APROVADA';
      case 'pendente':
        return 'PENDENTE';
      case 'rejeitada':
        return 'REJEITADA';
      case 'cancelada':
        return 'CANCELADA';
    }
  };

  const obterRotuloTipo = (tipo: TipoAusencia) => {
    switch (tipo) {
      case 'ferias':
        return 'Férias';
      case 'licenca-premio':
        return 'Licença Prêmio';
      case 'licenca-medica':
        return 'Licença Médica';
      case 'outros':
        return 'Outros';
    }
  };

  const diasRestantes = calcularDiasRestantes(ausencia.dataInicio);

  return (
    <div className={`p-6 bg-white border-2 border-slate-200 ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-slate-900">
              {ausencia.funcionario?.nome || 'Funcionário não identificado'}
            </h3>
            <span
              className={`text-xs font-bold px-3 py-1 border ${obterCorStatus(
                ausencia.status
              )}`}
            >
              {obterRotuloStatus(ausencia.status)}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {ausencia.setor?.nome || ausencia.funcionario?.setor?.nome || 'Setor não identificado'} • {obterRotuloTipo(ausencia.tipo)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Solicitado em</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatarData(ausencia.solicitadoEm)}
          </p>
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-slate-500" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Período
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {formatarData(ausencia.dataInicio)}
          </p>
          <p className="text-xs text-slate-600">até</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatarData(ausencia.dataFim)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-slate-500" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Duração
            </p>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {ausencia.diasCorridos} dias
          </p>
          <p className="text-xs text-slate-600">
            {ausencia.diasUteis} dias úteis
          </p>
        </div>

        {diasRestantes >= 0 && ausencia.status !== 'rejeitada' && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Início em
              </p>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {diasRestantes} dias
            </p>
            <p className="text-xs text-slate-600">a partir de hoje</p>
          </div>
        )}
      </div>

      {/* Motivo adicional */}
      {ausencia.motivo && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
            Observação
          </p>
          <p className="text-sm text-slate-700">{ausencia.motivo}</p>
        </div>
      )}

      {/* Ações */}
      {exibirAcoes && ausencia.status === 'pendente' && (
        <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
          <button
            onClick={() => onAprovar?.(ausencia.id)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
          >
            Aprovar
          </button>
          <button
            onClick={() => onRejeitar?.(ausencia.id)}
            className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
          >
            Rejeitar
          </button>
          {onVisualizar && (
            <button
              onClick={() => onVisualizar(ausencia.id)}
              className="px-4 py-2 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
            >
              Detalhes
            </button>
          )}
        </div>
      )}

      {/* Status de aprovação/rejeição */}
      {ausencia.status === 'aprovada' && ausencia.aprovadoEm && (
        <div className="mt-4 pt-4 border-t-2 border-slate-200 text-sm text-slate-600">
          Aprovada em {formatarData(ausencia.aprovadoEm)}
          {ausencia.aprovadoPor && ` por ${ausencia.aprovadoPor}`}
        </div>
      )}

      {ausencia.status === 'rejeitada' && ausencia.rejeitadoEm && (
        <div className="mt-4 pt-4 border-t-2 border-slate-200">
          <p className="text-sm text-slate-600 mb-2">
            Rejeitada em {formatarData(ausencia.rejeitadoEm)}
            {ausencia.rejeitadoPor && ` por ${ausencia.rejeitadoPor}`}
          </p>
          {ausencia.motivoRejeicao && (
            <div className="p-3 bg-red-50 border border-red-200">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
                Motivo da Rejeição
              </p>
              <p className="text-sm text-red-800">{ausencia.motivoRejeicao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
