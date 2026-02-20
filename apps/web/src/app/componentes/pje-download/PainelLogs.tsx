// ============================================================
// app/componentes/pje-download/PainelLogs.tsx
// Painel de logs para desenvolvimento — exibe na interface
// ============================================================

'use client';

import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';

export interface EntradaLog {
  id: number;
  timestamp: string;
  nivel: 'info' | 'warn' | 'error' | 'success';
  modulo: string;
  mensagem: string;
  dados?: unknown;
}

interface PainelLogsProps {
  logs: EntradaLog[];
  onLimpar: () => void;
}

const CORES_NIVEL: Record<EntradaLog['nivel'], { text: string; bg: string; dot: string }> = {
  info:    { text: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  warn:    { text: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  error:   { text: 'text-red-700',     bg: 'bg-red-50',     dot: 'bg-red-500' },
  success: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
};

export function PainelLogs({ logs, onLimpar }: PainelLogsProps) {
  const [expandido, setExpandido] = useState(false);
  const [logExpandido, setLogExpandido] = useState<number | null>(null);

  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_PJE_DEBUG !== 'true') {
    return null;
  }

  const copiarLogs = () => {
    const texto = logs
      .map((l) => `[${l.timestamp}] [${l.nivel.toUpperCase()}] [${l.modulo}] ${l.mensagem}${l.dados ? '\n  ' + JSON.stringify(l.dados, null, 2) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(texto);
  };

  return (
    <div className="border-2 border-slate-700 bg-slate-900 text-slate-300 font-mono text-xs">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-green-400" />
          <span className="font-bold text-green-400">PJE Debug</span>
          <span className="text-slate-500">({logs.length} entradas)</span>
          {logs.some((l) => l.nivel === 'error') && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Body */}
      {expandido && (
        <>
          {/* Toolbar */}
          <div className="px-4 py-1.5 border-t border-slate-700 flex items-center gap-2">
            <button
              type="button"
              onClick={onLimpar}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Trash2 size={12} />
              Limpar
            </button>
            <button
              type="button"
              onClick={copiarLogs}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Copy size={12} />
              Copiar
            </button>
          </div>

          {/* Log entries */}
          <div className="max-h-64 overflow-y-auto border-t border-slate-700">
            {logs.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-500">
                Nenhum log registrado.
              </div>
            ) : (
              logs.map((entry) => {
                const cores = CORES_NIVEL[entry.nivel];
                const isExpanded = logExpandido === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="border-b border-slate-800 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => setLogExpandido(isExpanded ? null : entry.id)}
                      className="w-full text-left px-4 py-1.5 flex items-start gap-2 hover:bg-slate-800/50 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cores.dot}`} />
                      <span className="text-slate-500 flex-shrink-0 w-20">{entry.timestamp}</span>
                      <span className={`flex-shrink-0 w-14 font-bold ${cores.text}`}>
                        [{entry.modulo}]
                      </span>
                      <span className="text-slate-300 truncate">{entry.mensagem}</span>
                      {entry.dados !== undefined && (
                        <span className="text-slate-600 flex-shrink-0">▸</span>
                      )}
                    </button>
                    {isExpanded && entry.dados !== undefined && (
                      <pre className="px-4 py-2 bg-slate-950 text-green-300 overflow-x-auto text-[10px] leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(entry.dados, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
