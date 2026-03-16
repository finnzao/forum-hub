// ============================================================
// componentes/importacao/EtapaValidacao.tsx
// Etapa 3: Resultado da validação automática
// ============================================================

'use client';

import React from 'react';
import {
  CheckCircle, AlertTriangle, AlertCircle, Copy, ArrowRight,
} from 'lucide-react';
import type { ResultadoValidacao, RegistroImportado } from '../../types/importacao';
import { CAMPOS_SISTEMA } from '../../types/importacao';

interface EtapaValidacaoProps {
  validacao: ResultadoValidacao;
  onProsseguir: () => void;
  onVoltar: () => void;
}

const STATUS_CONFIG: Record<string, { rotulo: string; cor: string; bgCard: string; icon: React.ReactNode }> = {
  valido:      { rotulo: 'Válidos',      cor: 'text-green-700', bgCard: 'bg-green-50 border-green-200', icon: <CheckCircle size={20} className="text-green-600" /> },
  incompleto:  { rotulo: 'Incompletos',  cor: 'text-amber-700', bgCard: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={20} className="text-amber-600" /> },
  duplicado:   { rotulo: 'Duplicados',   cor: 'text-blue-700',  bgCard: 'bg-blue-50 border-blue-200',  icon: <Copy size={20} className="text-blue-600" /> },
  erro:        { rotulo: 'Com Erros',    cor: 'text-red-700',   bgCard: 'bg-red-50 border-red-200',    icon: <AlertCircle size={20} className="text-red-600" /> },
};

export const EtapaValidacao: React.FC<EtapaValidacaoProps> = ({
  validacao,
  onProsseguir,
  onVoltar,
}) => {
  const { resumo, registros } = validacao;
  const temProblemas = resumo.incompletos + resumo.duplicados + resumo.erros > 0;
  const problemáticos = registros.filter((r) => r.status !== 'valido').slice(0, 10);

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Resultado da Validação</h3>
      <p className="text-sm text-slate-600 mb-6">
        O sistema analisou {resumo.total} registros. Revise o resultado abaixo antes de prosseguir.
      </p>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(['valido', 'incompleto', 'duplicado', 'erro'] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const valor = resumo[status === 'valido' ? 'validos' : status === 'incompleto' ? 'incompletos' : status === 'duplicado' ? 'duplicados' : 'erros'];

          return (
            <div key={status} className={`p-4 border-2 ${cfg.bgCard}`}>
              <div className="flex items-center justify-between mb-2">
                {cfg.icon}
                <span className={`text-2xl font-bold ${cfg.cor}`}>{valor}</span>
              </div>
              <p className={`text-xs font-semibold ${cfg.cor} uppercase tracking-wide`}>
                {cfg.rotulo}
              </p>
            </div>
          );
        })}
      </div>

      {/* Resultado geral */}
      {!temProblemas ? (
        <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 flex items-start gap-3">
          <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900">Todos os registros estão válidos!</p>
            <p className="text-sm text-green-700 mt-1">
              {resumo.validos} registro(s) prontos para importação. Prossiga para a revisão final.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">
                {resumo.incompletos + resumo.duplicados + resumo.erros} registro(s) com problemas
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Você poderá corrigir ou descartar registros problemáticos na tela de revisão.
              </p>
            </div>
          </div>

          {/* Lista de problemas (preview) */}
          <div className="bg-white border-2 border-slate-200">
            <div className="p-3 bg-slate-100 border-b-2 border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Primeiros problemas encontrados
              </p>
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {problemáticos.map((reg) => {
                const cfg = STATUS_CONFIG[reg.status];
                const processo = reg.dados['numero_processo'] || `Linha ${reg.indice + 2}`;

                return (
                  <div key={reg.id} className="p-3 flex items-start gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 ${cfg.bgCard} ${cfg.cor}`}>
                      {cfg.rotulo.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-slate-900 truncate">{processo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {reg.erros.join(' • ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={onVoltar}
          className="px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
        >
          Voltar ao Mapeamento
        </button>
        <button
          onClick={onProsseguir}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          Revisar Registros
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
