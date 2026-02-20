// ============================================================
// app/componentes/pje-download/CardJob.tsx
// Card expansível para exibição de um job de download PJE
// ============================================================

'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Shield, Trash2, FileText } from 'lucide-react';
import { DistintivoStatus, DistintivoModo } from './DistintivoPJE';
import { BarraProgresso } from './BarraProgresso';
import {
  type DownloadJobResponse,
  type PJEDownloadProgress,
  isJobActive,
  isJobCancellable,
  formatFileSize,
} from './tipos';

interface CardJobProps {
  job: DownloadJobResponse;
  progresso?: PJEDownloadProgress | null;
  expandido: boolean;
  onAlternarExpansao: () => void;
  onCancelar: () => void;
  onAbrir2FA: () => void;
}

export function CardJob({ job, progresso, expandido, onAlternarExpansao, onCancelar, onAbrir2FA }: CardJobProps) {
  const atual = progresso || job;
  const ativo = isJobActive(atual.status);

  return (
    <div className={`border-2 transition-colors ${ativo ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="p-4 cursor-pointer" onClick={onAlternarExpansao}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <DistintivoModo mode={job.mode} />
              <DistintivoStatus status={atual.status} />
            </div>
            <p className="text-sm text-slate-700 truncate">
              {progresso?.message || `Job ${job.id.slice(0, 8)}...`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Criado em {new Date(job.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {atual.status === 'awaiting_2fa' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onAbrir2FA(); }}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors flex items-center gap-1">
                <Shield size={12} /> Enviar 2FA
              </button>
            )}
            {ativo && isJobCancellable(atual.status) && atual.status !== 'awaiting_2fa' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onCancelar(); }}
                className="px-3 py-1.5 border-2 border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-1">
                <Trash2 size={12} /> Cancelar
              </button>
            )}
            {expandido ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </div>
        </div>
        {ativo && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{atual.successCount} sucesso · {atual.failureCount} falha</span>
              <span>{atual.progress}%</span>
            </div>
            <BarraProgresso valor={atual.progress} status={atual.status} />
          </div>
        )}
      </div>

      {expandido && (
        <div className="border-t-2 border-slate-100 p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat rotulo="Total" valor={atual.totalProcesses} cor="bg-slate-50" corTexto="text-slate-900" />
            <MiniStat rotulo="Sucesso" valor={atual.successCount} cor="bg-emerald-50" corTexto="text-emerald-700" corRotulo="text-emerald-600" />
            <MiniStat rotulo="Falhas" valor={atual.failureCount} cor="bg-red-50" corTexto="text-red-700" corRotulo="text-red-600" />
            <MiniStat rotulo="Progresso" valor={`${atual.progress}%`} cor="bg-blue-50" corTexto="text-blue-700" corRotulo="text-blue-600" />
          </div>

          {atual.files.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Arquivos ({atual.files.length})</h5>
              <div className="border-2 border-slate-100 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {atual.files.map((file, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-xs font-mono text-slate-700">{file.processNumber}</span>
                    </div>
                    <span className="text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {atual.errors.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Erros ({atual.errors.length})</h5>
              <div className="border-2 border-red-100 divide-y divide-red-100 max-h-40 overflow-y-auto bg-red-50/50">
                {atual.errors.map((err, idx) => (
                  <div key={idx} className="px-3 py-2">
                    {err.processNumber && <span className="text-xs font-mono text-red-700 font-semibold">{err.processNumber}: </span>}
                    <span className="text-xs text-red-600">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.completedAt && <p className="text-xs text-slate-400">Finalizado em {new Date(job.completedAt).toLocaleString('pt-BR')}</p>}
        </div>
      )}
    </div>
  );
}

function MiniStat({ rotulo, valor, cor, corTexto, corRotulo }: {
  rotulo: string; valor: number | string; cor: string; corTexto: string; corRotulo?: string;
}) {
  return (
    <div className={`${cor} p-3`}>
      <p className={`text-xs ${corRotulo || 'text-slate-500'}`}>{rotulo}</p>
      <p className={`text-lg font-bold ${corTexto}`}>{valor}</p>
    </div>
  );
}
