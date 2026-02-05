// componentes/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variante?: 'padrao' | 'sucesso' | 'aviso' | 'perigo' | 'info' | 'neutro';
  tamanho?: 'pequeno' | 'medio' | 'grande';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variante = 'padrao',
  tamanho = 'medio'
}) => {
  const obterCorVariante = () => {
    switch (variante) {
      case 'sucesso':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'aviso':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'perigo':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'neutro':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const obterTamanho = () => {
    switch (tamanho) {
      case 'pequeno':
        return 'px-2 py-0.5 text-xs';
      case 'grande':
        return 'px-4 py-1.5 text-sm';
      default:
        return 'px-3 py-1 text-xs';
    }
  };

  return (
    <span className={`inline-flex items-center font-semibold border ${obterCorVariante()} ${obterTamanho()}`}>
      {children}
    </span>
  );
};
