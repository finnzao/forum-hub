'use client';

import { useState } from 'react';
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

const CORES_NIVEL: Record<EntradaLog['nivel'], { text: string; bg: string; dot: string; border: string }> = {
  info: { text: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-200' },
  warn: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', border: 'border-amber-200' },
  error: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500', border: 'border-red-300' },
  success: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-200' },
};

/**
 * Formata dados do log para exibição legível
 */
function formatarDados(dados: unknown): string {
  if (dados === undefined || dados === null) return '';

  if (typeof dados === 'string') return dados;

  try {
    return JSON.stringify(dados, null, 2);
  } catch {
    return String(dados);
  }
}

export function PainelLogs({ logs, onLimpar }: PainelLogsProps) {
  const [expandido, setExpandido] = useState(false);
  const [logExpandido, setLogExpandido] = useState<number | null>(null);

  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_PJE_DEBUG !== 'true') {
    return null;
  }

  const totalErros = logs.filter(l => l.nivel === 'error').length;
  const totalAvisos = logs.filter(l => l.nivel === 'warn').length;

  const copiarLogs = () => {
    const texto = logs
      .map((l) => `[${l.timestamp}] [${l.nivel.toUpperCase()}] [${l.modulo}] ${l.mensagem}${l.dados ? '\n  ' + formatarDados(l.dados) : ''}`)
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
          {totalErros > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {totalErros} erro{totalErros !== 1 ? 's' : ''}
            </span>
          )}
          {totalAvisos > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">
              {totalAvisos} aviso{totalAvisos !== 1 ? 's' : ''}
            </span>
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
                const isError = entry.nivel === 'error';
                return (
                  <div
                    key={entry.id}
                    className={`border-b last:border-b-0 ${isError
                        ? 'border-red-900/50 bg-red-950/30'
                        : 'border-slate-800'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setLogExpandido(isExpanded ? null : entry.id)}
                      className={`w-full text-left px-4 py-1.5 flex items-start gap-2 transition-colors ${isError
                          ? 'hover:bg-red-950/50'
                          : 'hover:bg-slate-800/50'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cores.dot} ${isError ? 'animate-pulse' : ''
                        }`} />
                      <span className="text-slate-500 flex-shrink-0 w-20">{entry.timestamp}</span>
                      <span className={`flex-shrink-0 w-14 font-bold ${cores.text}`}>
                        [{entry.modulo}]
                      </span>
                      <span className={`truncate ${isError ? 'text-red-300 font-semibold' : 'text-slate-300'}`}>
                        {entry.mensagem}
                      </span>
                      {entry.dados !== undefined && (
                        <span className="text-slate-600 flex-shrink-0">
                          {isExpanded ? '▾' : '▸'}
                        </span>
                      )}
                    </button>
                    {isExpanded && entry.dados !== undefined && (
                      <div className={`px-4 py-2 overflow-x-auto text-[10px] leading-relaxed whitespace-pre-wrap ${isError
                          ? 'bg-red-950/50 text-red-300 border-t border-red-900/30'
                          : 'bg-slate-950 text-green-300'
                        }`}>
                        {typeof entry.dados === 'string' ? (
                          <p>{entry.dados}</p>
                        ) : (
                          <pre>{formatarDados(entry.dados)}</pre>
                        )}
                      </div>
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