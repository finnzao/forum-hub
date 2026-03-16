// ============================================================
// componentes/importacao/EtapaConcluido.tsx
// Etapa 5: Confirmação de importação concluída
// ============================================================

'use client';

import React from 'react';
import { CheckCircle, FileSpreadsheet, ArrowRight, RotateCcw } from 'lucide-react';

interface EtapaConcluidoProps {
  totalImportados: number;
  totalDescartados: number;
  nomeArquivo: string;
  onNovaImportacao: () => void;
  onIrParaDistribuicao?: () => void;
}

export const EtapaConcluido: React.FC<EtapaConcluidoProps> = ({
  totalImportados,
  totalDescartados,
  nomeArquivo,
  onNovaImportacao,
  onIrParaDistribuicao,
}) => {
  return (
    <div className="text-center py-8">
      {/* Ícone de sucesso */}
      <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={36} className="text-green-600" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        Importação Concluída!
      </h3>
      <p className="text-sm text-slate-600 mb-8">
        Os processos foram importados e estão prontos para distribuição.
      </p>

      {/* Resumo */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-white border-2 border-slate-200 divide-y divide-slate-200">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-slate-400" />
              Arquivo
            </span>
            <span className="text-sm font-semibold text-slate-900">{nomeArquivo}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-slate-600">Registros importados</span>
            <span className="text-lg font-bold text-green-700">{totalImportados}</span>
          </div>
          {totalDescartados > 0 && (
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-600">Registros descartados</span>
              <span className="text-sm font-semibold text-slate-500">{totalDescartados}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={onNovaImportacao}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
        >
          <RotateCcw size={16} />
          Nova Importação
        </button>
        {onIrParaDistribuicao && (
          <button
            onClick={onIrParaDistribuicao}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Distribuir Tarefas
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
