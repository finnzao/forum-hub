import React from 'react';
import { Clock } from 'lucide-react';

interface ItemTarefaProps {
  numeroProcesso: string;
  titulo: string;
  prioridade: 'alta' | 'media' | 'baixa';
  prazo: string;
  atribuidoPor: string;
}

export const ItemTarefa: React.FC<ItemTarefaProps> = ({ 
  numeroProcesso, 
  titulo, 
  prioridade, 
  prazo, 
  atribuidoPor 
}) => {
  const obterCorPrioridade = () => {
    switch (prioridade) {
      case 'alta':
        return 'border-l-red-600 bg-red-50';
      case 'media':
        return 'border-l-amber-600 bg-amber-50';
      case 'baixa':
        return 'border-l-slate-600 bg-slate-50';
    }
  };

  const obterRotuloPrioridade = () => {
    switch (prioridade) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
    }
  };

  const obterCorRotulo = () => {
    switch (prioridade) {
      case 'alta':
        return 'text-red-700 bg-red-100';
      case 'media':
        return 'text-amber-700 bg-amber-100';
      case 'baixa':
        return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${obterCorPrioridade()}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {numeroProcesso}
          </p>
          <h4 className="font-semibold text-slate-900">{titulo}</h4>
        </div>
        <span className={`text-xs font-bold px-2 py-1 ${obterCorRotulo()}`}>
          {obterRotuloPrioridade()}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Prazo: {prazo}
        </span>
        <span>•</span>
        <span>Atribuído por: {atribuidoPor}</span>
      </div>
    </div>
  );
};
