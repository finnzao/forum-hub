import React from 'react';

interface CartaoModuloProps {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  href: string;
  estatisticas?: {
    rotulo: string;
    valor: string | number;
    variante?: 'padrao' | 'aviso' | 'perigo' | 'sucesso';
  };
}

export const CartaoModulo: React.FC<CartaoModuloProps> = ({ 
  icone, 
  titulo, 
  descricao, 
  href, 
  estatisticas 
}) => {
  const obterCorEstatisticas = (variante?: string) => {
    switch (variante) {
      case 'aviso':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'perigo':
        return 'text-red-700 bg-red-50 border border-red-200';
      case 'sucesso':
        return 'text-green-700 bg-green-50 border border-green-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <a
      href={href}
      className="group block p-8 bg-white border-2 border-slate-200 hover:border-slate-400 transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-4 bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
          {icone}
        </div>
        {estatisticas && (
          <div className={`px-4 py-2 text-sm font-semibold ${obterCorEstatisticas(estatisticas.variante)}`}>
            {estatisticas.valor} {estatisticas.rotulo}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {titulo}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{descricao}</p>
      </div>
    </a>
  );
};
