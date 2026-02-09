// ============================================================
// app/componentes/tabelas/LinhaRegistro.tsx
// Linha da tabela de registros de atividade
// Layout tabular inspirado em planilha para facilitar adaptação
// ============================================================

'use client';

import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Clock, Eye, MessageSquare } from 'lucide-react';
import { Distintivo } from '../cartoes/Distintivo';
import {
  RegistroAtividade,
  CATEGORIAS_ACAO,
  STATUS_LABELS,
  StatusRegistro,
} from '../../../tipos/historico';

interface LinhaRegistroProps {
  registro: RegistroAtividade;
}

const VARIANTE_STATUS: Record<StatusRegistro, 'sucesso' | 'aviso' | 'neutro'> = {
  concluido: 'sucesso',
  em_andamento: 'aviso',
  pendente: 'neutro',
};

export function LinhaRegistro({ registro }: LinhaRegistroProps) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="border-2 border-slate-200 bg-white hover:border-slate-300 transition-colors">
      {/* Linha principal - formato tabular */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full text-left p-4 flex items-center gap-4"
      >
        {/* Data/Hora */}
        <div className="flex-shrink-0 w-20 text-center">
          <p className="text-sm font-bold text-slate-900">{registro.data.slice(0, 5)}</p>
          <p className="text-xs text-slate-500">{registro.hora}</p>
        </div>

        {/* Separador vertical */}
        <div className="w-0.5 h-10 bg-slate-200 flex-shrink-0" />

        {/* Processo */}
        <div className="flex-shrink-0 w-56">
          <p className="text-sm font-mono font-semibold text-slate-900 truncate">
            {registro.numeroProcesso}
          </p>
          <p className="text-xs text-slate-500 truncate">{registro.partes}</p>
        </div>

        {/* Categoria */}
        <div className="flex-shrink-0 w-36">
          <Distintivo
            rotulo={CATEGORIAS_ACAO[registro.categoriaAcao]}
            variante="info"
            comPonto={false}
          />
        </div>

        {/* Descrição resumida */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 truncate">{registro.descricaoAcao}</p>
        </div>

        {/* Status */}
        <div className="flex-shrink-0 w-28">
          <Distintivo
            rotulo={STATUS_LABELS[registro.status]}
            variante={VARIANTE_STATUS[registro.status]}
          />
        </div>

        {/* Indicadores */}
        <div className="flex items-center gap-2 flex-shrink-0 w-16 justify-center">
          {registro.temLembrete && (
            <Bell size={14} className="text-amber-500" />
          )}
          {registro.observacao && (
            <MessageSquare size={14} className="text-slate-400" />
          )}
        </div>

        {/* Expandir */}
        <div className="flex-shrink-0">
          {expandido ? (
            <ChevronUp size={18} className="text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="border-t-2 border-slate-100 bg-slate-50 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna esquerda - Detalhes */}
            <div className="space-y-4">
              <DetalheItem
                rotulo="Ação Realizada"
                valor={registro.descricaoAcao}
              />
              {registro.observacao && (
                <DetalheItem
                  rotulo="Observação"
                  valor={registro.observacao}
                />
              )}
              <DetalheItem
                rotulo="Servidor Responsável"
                valor={registro.servidor}
              />
            </div>

            {/* Coluna direita - Lembrete e Auditoria */}
            <div className="space-y-4">
              {registro.temLembrete && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell size={16} className="text-amber-700" />
                    <span className="text-sm font-bold text-amber-900">Lembrete de Prazo</span>
                  </div>
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Data:</span> {registro.dataLembrete}
                  </p>
                  {registro.descricaoLembrete && (
                    <p className="text-sm text-amber-800 mt-1">
                      {registro.descricaoLembrete}
                    </p>
                  )}
                </div>
              )}
              <div className="p-4 bg-slate-100 border-2 border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">Auditoria</span>
                </div>
                <p className="text-xs text-slate-600">
                  Registrado em {registro.data} às {registro.hora} por {registro.servidor}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  ID: {registro.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-componente para item de detalhe
// ============================================================

function DetalheItem({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{rotulo}</p>
      <p className="text-sm text-slate-800 leading-relaxed">{valor}</p>
    </div>
  );
}
