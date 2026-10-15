// ============================================================
// componentes/layout/Toast.tsx
// Aviso curto de resultado ("Ato registrado com sucesso!").
// Hook useToast + componente Toast. Some sozinho em 4 s.
// ============================================================

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type TipoToast = 'sucesso' | 'erro' | 'info';

export interface MensagemToast {
  id: number;
  tipo: TipoToast;
  texto: string;
}

export function useToast() {
  const [mensagens, setMensagens] = useState<MensagemToast[]>([]);

  const mostrar = useCallback((texto: string, tipo: TipoToast = 'sucesso') => {
    const id = Date.now() + Math.random();
    setMensagens((prev) => [...prev, { id, tipo, texto }]);
  }, []);

  const fechar = useCallback((id: number) => {
    setMensagens((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { mensagens, mostrar, fechar };
}

const ESTILO: Record<TipoToast, { caixa: string; icone: React.ReactNode }> = {
  sucesso: { caixa: 'bg-green-700 text-white border-green-800', icone: <CheckCircle size={18} /> },
  erro:    { caixa: 'bg-red-700 text-white border-red-800',     icone: <AlertCircle size={18} /> },
  info:    { caixa: 'bg-slate-800 text-white border-slate-900', icone: <Info size={18} /> },
};

export function Toast({ mensagens, onFechar }: { mensagens: MensagemToast[]; onFechar: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none" aria-live="polite">
      {mensagens.map((m) => (
        <ItemToast key={m.id} mensagem={m} onFechar={() => onFechar(m.id)} />
      ))}
    </div>
  );
}

function ItemToast({ mensagem, onFechar }: { mensagem: MensagemToast; onFechar: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFechar, 4000);
    return () => clearTimeout(t);
  }, [onFechar]);

  const estilo = ESTILO[mensagem.tipo];
  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 border shadow-lg text-sm font-semibold ${estilo.caixa}`} role="status">
      {estilo.icone}
      <span>{mensagem.texto}</span>
      <button onClick={onFechar} className="ml-2 opacity-70 hover:opacity-100" aria-label="Fechar aviso">
        <X size={14} />
      </button>
    </div>
  );
}
