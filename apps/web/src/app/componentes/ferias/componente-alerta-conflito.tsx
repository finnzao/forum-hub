import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConflitoDia } from '../../tipos/ferias';
import { formatarData } from '../../utils/datas';

interface AlertaConflitoProps {
  conflitos: ConflitoDia[];
  nomeSetor: string;
  funcionarioConflitante?: string;
  className?: string;
}

export const AlertaConflito: React.FC<AlertaConflitoProps> = ({
  conflitos,
  nomeSetor,
  funcionarioConflitante,
  className = '',
}) => {
  if (conflitos.length === 0) return null;

  const primeiroConflito = conflitos[0];
  const totalDias = conflitos.length;
  const diasExibir = Math.min(8, totalDias);

  return (
    <div className={`p-4 bg-red-50 border-2 border-red-200 ${className}`}>
      <div className="flex gap-3">
        <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-red-900 mb-2">
            Conflito Detectado - Limite de Ausências Ultrapassado
          </h4>
          
          <p className="text-sm text-red-800 mb-3">
            O setor "{nomeSetor}" permite no máximo{' '}
            <strong>{primeiroConflito.limiteSetor}</strong>{' '}
            {primeiroConflito.limiteSetor === 1 ? 'ausência' : 'ausências'} 
            {' '}simultânea{primeiroConflito.limiteSetor === 1 ? '' : 's'}.
            {funcionarioConflitante && (
              <> Esta solicitação conflita com a ausência de{' '}
              <strong>{funcionarioConflitante}</strong></>
            )}
            {' '}nos seguintes dias:
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {conflitos.slice(0, diasExibir).map((conflito, index) => (
              <span
                key={index}
                className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 border border-red-300"
              >
                {formatarData(conflito.data)}
              </span>
            ))}
            {totalDias > diasExibir && (
              <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 border border-red-300">
                +{totalDias - diasExibir} dias
              </span>
            )}
          </div>

          {primeiroConflito.funcionariosAusentes.length > 0 && (
            <div className="text-sm text-red-800">
              <strong>Já ausente(s) no período:</strong>{' '}
              {primeiroConflito.funcionariosAusentes.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
