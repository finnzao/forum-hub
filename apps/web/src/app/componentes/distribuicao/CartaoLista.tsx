// ============================================================
// componentes/distribuicao/CartaoLista.tsx
// Cartão de resumo de uma Lista de Trabalho
// Usado no painel do chefe, magistrado e servidor
// ============================================================

'use client';

import React from 'react';
import { User, Calendar, FileText, ChevronRight } from 'lucide-react';
import type { ListaTrabalho } from '../../types/distribuicao';
import { STATUS_LISTA_LABELS, STATUS_LISTA_CORES } from '../../types/distribuicao';
import { BarraProgresso } from './BarraProgresso';
import { calcularProgresso } from '../../lib/distribuicao';

interface CartaoListaProps {
  lista: ListaTrabalho;
  onClick?: () => void;
  compacto?: boolean;
}

export function CartaoLista({ lista, onClick, compacto = false }: CartaoListaProps) {
  const progresso = calcularProgresso(lista.processos);
  const corStatus = STATUS_LISTA_CORES[lista.status];

  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 border-slate-200 transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-400' : ''
      } ${compacto ? 'p-4' : 'p-5'}`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold text-slate-900 truncate ${compacto ? 'text-sm' : 'text-base'}`}>
              {lista.titulo}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${corStatus.bg} ${corStatus.text} ${corStatus.border} flex-shrink-0`}>
              {STATUS_LISTA_LABELS[lista.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User size={12} />
              {lista.servidorNome}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatarDataCurta(lista.dataInicio)} — {formatarDataCurta(lista.dataFim)}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} />
              {lista.processos.length} processos
            </span>
          </div>
        </div>
        {onClick && (
          <ChevronRight size={18} className="text-slate-400 flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Progresso */}
      <BarraProgresso
        total={progresso.total}
        concluidos={progresso.concluidos}
        emAndamento={progresso.emAndamento}
        tamanho={compacto ? 'sm' : 'md'}
      />

      {/* Resumo */}
      {!compacto && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center p-2 bg-slate-50">
            <p className="text-lg font-bold text-slate-400">{progresso.pendentes}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Pendentes</p>
          </div>
          <div className="text-center p-2 bg-amber-50">
            <p className="text-lg font-bold text-amber-600">{progresso.emAndamento}</p>
            <p className="text-[10px] text-amber-600 uppercase font-semibold">Em Andamento</p>
          </div>
          <div className="text-center p-2 bg-green-50">
            <p className="text-lg font-bold text-green-600">{progresso.concluidos}</p>
            <p className="text-[10px] text-green-600 uppercase font-semibold">Concluídos</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatarDataCurta(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}`;
}
