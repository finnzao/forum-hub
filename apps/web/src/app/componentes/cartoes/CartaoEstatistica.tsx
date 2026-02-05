import React from 'react';

interface CartaoEstatisticaProps {
  titulo: string;
  valor: string | number;
  descricao: string;
  icone: React.ReactNode;
  corDestaque?: string;
}

export const CartaoEstatistica: React.FC<CartaoEstatisticaProps> = ({ 
  titulo, 
  valor, 
  descricao, 
  icone,
  corDestaque = 'text-slate-600'
}) => {
  return (
    <div className="bg-white border-2 border-slate-200 p-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">
          {titulo}
        </p>
        <div className="text-slate-400">
          {icone}
        </div>
      </div>
      <p className="text-4xl font-bold text-slate-900 mb-2">{valor}</p>
      <p className={`text-sm font-medium ${corDestaque}`}>
        {descricao}
      </p>
    </div>
  );
};
