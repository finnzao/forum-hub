import React from 'react';

interface AtividadeServidorProps {
  nomeServidor: string;
  setor: string;
  tarefasPendentes: number;
  concluidasHoje: number;
  status: 'ativo' | 'sobrecarga' | 'ocioso';
}

export const AtividadeServidor: React.FC<AtividadeServidorProps> = ({ 
  nomeServidor, 
  setor, 
  tarefasPendentes, 
  concluidasHoje, 
  status 
}) => {
  const obterCorStatus = () => {
    switch (status) {
      case 'sobrecarga':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'ativo':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ocioso':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const obterRotuloStatus = () => {
    switch (status) {
      case 'sobrecarga':
        return 'Sobrecarga';
      case 'ativo':
        return 'Normal';
      case 'ocioso':
        return 'Ocioso';
    }
  };

  return (
    <div className="p-4 bg-white border-2 border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-slate-900">{nomeServidor}</h4>
          <p className="text-xs text-slate-600 mt-1">{setor}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 border ${obterCorStatus()}`}>
          {obterRotuloStatus()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-600 text-xs">Pendentes</p>
          <p className="font-bold text-slate-900">{tarefasPendentes}</p>
        </div>
        <div>
          <p className="text-slate-600 text-xs">Concluídas hoje</p>
          <p className="font-bold text-slate-900">{concluidasHoje}</p>
        </div>
      </div>
    </div>
  );
};
