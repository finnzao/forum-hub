// ============================================================
// componentes/processos/FiltroDigitoConfig.tsx
// Configuração do dígito do servidor (ARQUITETURA.md, seção 6).
// Quatro eixos sobre o número CNJ, cada um com 0–9 (ou anos),
// atalhos Pares / Ímpares e Limpar. Dentro do eixo: OU; entre eixos: E.
// ============================================================

'use client';

import React from 'react';
import { Eraser } from 'lucide-react';
import {
  type FiltroDigito, type EixoDigito,
  EIXOS_DIGITO, PARES, IMPARES, ANOS_DISPONIVEIS,
  alternarValor, definirValores, descreverFiltro,
} from '../../lib/cnj';

interface FiltroDigitoConfigProps {
  filtro: FiltroDigito;
  onChange: (filtro: FiltroDigito) => void;
  /** Quantos processos do acervo casam com o filtro atual (pré-visualização) */
  totalCasam?: number;
  totalAcervo?: number;
}

export function FiltroDigitoConfig({ filtro, onChange, totalCasam, totalAcervo }: FiltroDigitoConfigProps) {
  const eixosAtivos = new Set<EixoDigito>(
    EIXOS_DIGITO.filter((e) => (filtro[e.eixo]?.length ?? 0) > 0).map((e) => e.eixo),
  );

  return (
    <div className="space-y-5">
      {/* Legenda do número CNJ com os segmentos realçados */}
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">Nº Processo (NUP)</p>
        <div className="bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-center gap-1 font-mono text-sm tracking-wide">
          <Segmento texto="NNNNNN" ativo={false} />
          <Segmento texto="N" ativo={eixosAtivos.has('ultimo_seq')} titulo="Último nº da sequência" />
          <span className="text-slate-400">-</span>
          <Segmento texto="D" ativo={eixosAtivos.has('dv1')} titulo="1º dígito verificador" />
          <Segmento texto="D" ativo={eixosAtivos.has('dv2')} titulo="2º dígito verificador" />
          <span className="text-slate-400">.</span>
          <Segmento texto="AAAA" ativo={eixosAtivos.has('ano')} titulo="Ano" />
          <span className="text-slate-400">.</span>
          <Segmento texto="J" ativo={false} apagado />
          <span className="text-slate-400">.</span>
          <Segmento texto="TR" ativo={false} apagado />
          <span className="text-slate-400">.</span>
          <Segmento texto="OOOO" ativo={false} apagado />
        </div>
      </div>

      {EIXOS_DIGITO.map(({ eixo, rotulo, descricao }) => {
        const valores = eixo === 'ano' ? ANOS_DISPONIVEIS : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const selecionados = filtro[eixo] ?? [];
        return (
          <div key={eixo}>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-sm font-medium text-slate-700">{rotulo}</p>
              <span className="text-[11px] text-slate-400">{descricao}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {valores.map((v) => {
                  const ativo = selecionados.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => onChange(alternarValor(filtro, eixo, v))}
                      className={`min-w-[2.25rem] px-2 h-9 text-sm font-semibold border transition-colors tabular-nums ${
                        ativo
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {eixo !== 'ano' && (
                <div className="flex flex-col gap-1 ml-2">
                  <Atalho rotulo="Pares"   ativo={mesmoConjunto(selecionados, PARES)}   onClick={() => onChange(definirValores(filtro, eixo, PARES))} />
                  <Atalho rotulo="Ímpares" ativo={mesmoConjunto(selecionados, IMPARES)} onClick={() => onChange(definirValores(filtro, eixo, IMPARES))} />
                </div>
              )}
              {selecionados.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(definirValores(filtro, eixo, []))}
                  className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Resumo */}
      <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-900">
        <p><strong>Meu dígito:</strong> {descreverFiltro(filtro)}</p>
        {typeof totalCasam === 'number' && typeof totalAcervo === 'number' && (
          <p className="mt-1">
            <strong>{totalCasam}</strong> de {totalAcervo} processos do acervo casam com essa configuração.
          </p>
        )}
        <p className="mt-1 text-blue-700">Dentro de um eixo vale qualquer valor marcado; entre eixos, todos precisam casar.</p>
      </div>
    </div>
  );
}

function Segmento({ texto, ativo, titulo, apagado = false }: { texto: string; ativo: boolean; titulo?: string; apagado?: boolean }) {
  return (
    <span
      title={titulo}
      className={`px-1 py-0.5 ${
        ativo ? 'bg-blue-600 text-white font-bold' : apagado ? 'text-slate-300' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {texto}
    </span>
  );
}

function Atalho({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 h-6 text-[11px] font-semibold border rounded-full transition-colors ${
        ativo ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
      }`}
    >
      {rotulo}
    </button>
  );
}

function mesmoConjunto(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((v) => s.has(v));
}
