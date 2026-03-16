import React from 'react';
import { Clock, User } from 'lucide-react';

type StatusAtividade = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';

interface AtividadeEnviadaProps {
  numeroProcesso: string;
  titulo: string;
  atribuidoA: string;
  status: StatusAtividade;
  prazo: string;
  enviadoEm: string;
}

const CONFIG_STATUS: Record<StatusAtividade, { rotulo: string; corBorda: string; corBadge: string }> = {
  pendente:      { rotulo: 'Pendente',      corBorda: 'border-l-amber-500',  corBadge: 'text-amber-700 bg-amber-100' },
  em_andamento:  { rotulo: 'Em andamento',  corBorda: 'border-l-blue-500',   corBadge: 'text-blue-700 bg-blue-100' },
  concluida:     { rotulo: 'Concluída',     corBorda: 'border-l-green-500',  corBadge: 'text-green-700 bg-green-100' },
  atrasada:      { rotulo: 'Atrasada',      corBorda: 'border-l-red-600',    corBadge: 'text-red-700 bg-red-100' },
};

export const AtividadeEnviada: React.FC<AtividadeEnviadaProps> = ({
  numeroProcesso,
  titulo,
  atribuidoA,
  status,
  prazo,
  enviadoEm,
}) => {
  const cfg = CONFIG_STATUS[status];

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${cfg.corBorda}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {numeroProcesso}
          </p>
          <h4 className="font-semibold text-slate-900 text-sm">{titulo}</h4>
        </div>
        <span className={`text-xs font-bold px-2 py-1 ${cfg.corBadge}`}>
          {cfg.rotulo}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
        <span className="flex items-center gap-1">
          <User size={12} />
          Para: {atribuidoA}
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Prazo: {prazo}
        </span>
        <span>•</span>
        <span>Enviado: {enviadoEm}</span>
      </div>
    </div>
  );
};
