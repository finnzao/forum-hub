// ============================================================
// componentes/importacao/IndicadorEtapas.tsx
// Barra de progresso visual do wizard de importação
// ============================================================

'use client';

import React from 'react';
import { Upload, Columns3, ShieldCheck, Eye, CheckCircle } from 'lucide-react';
import type { EtapaImportacao } from '../../types/importacao';

interface IndicadorEtapasProps {
  etapaAtual: EtapaImportacao;
}

const ETAPAS: { id: EtapaImportacao; rotulo: string; icone: React.ReactNode }[] = [
  { id: 'upload',     rotulo: 'Upload',     icone: <Upload size={16} /> },
  { id: 'mapeamento', rotulo: 'Mapeamento', icone: <Columns3 size={16} /> },
  { id: 'validacao',  rotulo: 'Validação',  icone: <ShieldCheck size={16} /> },
  { id: 'revisao',    rotulo: 'Revisão',    icone: <Eye size={16} /> },
  { id: 'concluido',  rotulo: 'Concluído',  icone: <CheckCircle size={16} /> },
];

export const IndicadorEtapas: React.FC<IndicadorEtapasProps> = ({ etapaAtual }) => {
  const idxAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);

  return (
    <div className="flex items-center gap-1 mb-8">
      {ETAPAS.map((etapa, idx) => {
        const concluida = idx < idxAtual;
        const ativa = idx === idxAtual;
        const futura = idx > idxAtual;

        return (
          <React.Fragment key={etapa.id}>
            {idx > 0 && (
              <div className={`flex-1 h-0.5 ${concluida ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
            <div
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors ${
                ativa
                  ? 'bg-slate-900 text-white'
                  : concluida
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {etapa.icone}
              <span className="hidden md:inline">{etapa.rotulo}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
