// ============================================================
// componentes/importacao/EtapaMapeamento.tsx
// Etapa 2: Mapeamento configurável de colunas
// ============================================================

'use client';

import React from 'react';
import {
  Columns3, ArrowRight, AlertCircle, CheckCircle, FileSpreadsheet,
} from 'lucide-react';
import type { MapeamentoColuna, CampoSistema, ResultadoParsing } from '../../types/importacao';
import { CAMPOS_SISTEMA } from '../../types/importacao';

interface EtapaMapeamentoProps {
  parsing: ResultadoParsing;
  mapeamento: MapeamentoColuna[];
  erro: string | null;
  onAtualizarMapeamento: (indice: number, campo: CampoSistema) => void;
  onConfirmar: () => void;
  onVoltar: () => void;
}

export const EtapaMapeamento: React.FC<EtapaMapeamentoProps> = ({
  parsing,
  mapeamento,
  erro,
  onAtualizarMapeamento,
  onConfirmar,
  onVoltar,
}) => {
  const temProcessoMapeado = mapeamento.some((m) => m.campoSistema === 'numero_processo');
  const camposMapeados = mapeamento.filter((m) => m.campoSistema !== 'ignorar').length;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Mapeamento de Colunas</h3>
          <p className="text-sm text-slate-600">
            Associe cada coluna do arquivo ao campo correspondente no sistema.
            O mapeamento automático foi sugerido — ajuste conforme necessário.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-2 border-slate-200 text-xs font-semibold text-slate-700">
          <FileSpreadsheet size={14} />
          {parsing.nomeArquivo} • {parsing.totalLinhas} linhas
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Tabela de mapeamento */}
      <div className="bg-white border-2 border-slate-200 overflow-hidden mb-6">
        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-100 border-b-2 border-slate-200">
          <div className="col-span-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Coluna do Arquivo
            </p>
          </div>
          <div className="col-span-1 flex items-center justify-center">
            <ArrowRight size={14} className="text-slate-400" />
          </div>
          <div className="col-span-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Campo do Sistema
            </p>
          </div>
          <div className="col-span-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Amostra dos Dados
            </p>
          </div>
          <div className="col-span-1 text-center">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Status
            </p>
          </div>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-slate-200">
          {mapeamento.map((item, idx) => {
            const eMapeado = item.campoSistema !== 'ignorar';
            const eObrigatorio = item.campoSistema === 'numero_processo';
            const configCampo = CAMPOS_SISTEMA.find((c) => c.campo === item.campoSistema);

            return (
              <div
                key={idx}
                className={`grid grid-cols-12 gap-4 p-4 transition-colors ${
                  eMapeado ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                {/* Coluna original */}
                <div className="col-span-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {item.colunaOriginal}
                  </span>
                </div>

                {/* Seta */}
                <div className="col-span-1 flex items-center justify-center">
                  <ArrowRight
                    size={14}
                    className={eMapeado ? 'text-green-500' : 'text-slate-300'}
                  />
                </div>

                {/* Select de campo */}
                <div className="col-span-3">
                  <select
                    value={item.campoSistema}
                    onChange={(e) => onAtualizarMapeamento(idx, e.target.value as CampoSistema)}
                    className={`w-full px-3 py-2 border-2 text-sm focus:outline-none transition-colors ${
                      eObrigatorio
                        ? 'border-green-300 bg-green-50 focus:border-green-500 font-semibold text-green-900'
                        : eMapeado
                          ? 'border-slate-300 focus:border-slate-500'
                          : 'border-slate-200 text-slate-500 focus:border-slate-400'
                    }`}
                  >
                    {CAMPOS_SISTEMA.map((campo) => (
                      <option key={campo.campo} value={campo.campo}>
                        {campo.rotulo}
                        {campo.obrigatorio ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amostra */}
                <div className="col-span-4 flex items-center">
                  {item.amostra.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.amostra.map((valor, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 truncate max-w-[160px]"
                          title={valor}
                        >
                          {valor || '(vazio)'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sem dados</span>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-1 flex items-center justify-center">
                  {eMapeado ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 mb-6">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">
            <strong className="text-slate-900">{camposMapeados}</strong> de{' '}
            {mapeamento.length} colunas mapeadas
          </span>
          {!temProcessoMapeado && (
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <AlertCircle size={14} />
              Obrigatório: Nº do Processo
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={onVoltar}
          className="px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onConfirmar}
          disabled={!temProcessoMapeado}
          className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
            temProcessoMapeado
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Validar e Prosseguir
        </button>
      </div>
    </div>
  );
};
