'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Edit3, Trash2 } from 'lucide-react';

interface MenuContextoProps {
  ancorRef: React.RefObject<HTMLButtonElement | null>;
  onDuplicar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onFechar: () => void;
}

export function MenuContexto({ ancorRef, onDuplicar, onEditar, onExcluir, onFechar }: MenuContextoProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; abrirParaCima: boolean }>({
    top: 0,
    left: 0,
    abrirParaCima: false,
  });

  // Calcular posição com base no botão âncora
  useEffect(() => {
    if (ancorRef.current) {
      const rect = ancorRef.current.getBoundingClientRect();
      const alturaMenu = 140; // altura aprox. do menu
      const espacoAbaixo = window.innerHeight - rect.bottom;
      const abrirParaCima = espacoAbaixo < alturaMenu + 8;

      setPos({
        top: abrirParaCima ? rect.top - alturaMenu : rect.bottom + 4,
        left: rect.right - 208, // 208 = w-52 (13rem = 208px)
        abrirParaCima,
      });
    }
  }, [ancorRef]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        ancorRef.current &&
        !ancorRef.current.contains(e.target as Node)
      ) {
        onFechar();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onFechar, ancorRef]);

  // Fechar ao fazer scroll na tabela
  useEffect(() => {
    const handler = () => onFechar();
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [onFechar]);

  const handleClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const menu = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded shadow-lg py-1 w-52"
    >
      <button
        onClick={(e) => handleClick(e, onDuplicar)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
      >
        <PlusCircle size={14} className="text-slate-500" />
        Outro ato neste processo
      </button>
      <button
        onClick={(e) => handleClick(e, onEditar)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
      >
        <Edit3 size={14} className="text-slate-500" />
        Editar registro
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={(e) => handleClick(e, onExcluir)}
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
      >
        <Trash2 size={14} />
        Excluir
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}
