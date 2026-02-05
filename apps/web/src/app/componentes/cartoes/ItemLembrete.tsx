import React from 'react';

interface ItemLembreteProps {
  numeroProcesso: string;
  descricao: string;
  prazo: string;
  diasRestantes: number;
}

export const ItemLembrete: React.FC<ItemLembreteProps> = ({ 
  numeroProcesso, 
  descricao, 
  prazo, 
  diasRestantes 
}) => {
  const obterCorUrgencia = () => {
    if (diasRestantes <= 3) return 'border-l-red-600 bg-red-50';
    if (diasRestantes <= 7) return 'border-l-amber-600 bg-amber-50';
    return 'border-l-slate-600 bg-slate-50';
  };

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${obterCorUrgencia()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {numeroProcesso}
          </p>
          <h4 className="font-medium text-slate-900 text-sm">{descricao}</h4>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-700">{diasRestantes} dias</p>
          <p className="text-xs text-slate-500">{prazo}</p>
        </div>
      </div>
    </div>
  );
};
