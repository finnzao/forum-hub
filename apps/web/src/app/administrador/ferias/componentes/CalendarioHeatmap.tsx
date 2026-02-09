'use client';

import React, { useState } from 'react';
import { MESES, CORES_SETOR } from '../data/constants';
import { getAusenciaNoMes, getMotivoConfig, formatarData, calcularDias } from '../data/utils';
import { SetorComFuncionarios, Ausencia } from '../types/ferias';
import { useResponsive } from '../hooks/useResponsive';

interface CalendarioHeatmapProps {
  grouped: SetorComFuncionarios[];
  ausencias: Ausencia[];
  conflitos: Record<string, boolean>;
  ano: number;
}

export const CalendarioHeatmap: React.FC<CalendarioHeatmapProps> = ({
  grouped, ausencias, conflitos, ano,
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const { isMobile, isTablet } = useResponsive();

  const CELL_W = isMobile ? 56 : isTablet ? 66 : 82;
  const LABEL_W = isMobile ? 110 : isTablet ? 140 : 180;
  const totalW = LABEL_W + 12 * CELL_W + 20;

  const handleCellClick = (key: string) => {
    setSelectedCell(selectedCell === key ? null : key);
  };

  return (
    <div style={{
      overflowX: 'auto', background: '#fff', border: '2px solid #e8e6e1', borderRadius: 8,
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Mobile scroll hint */}
      {isMobile && (
        <div style={{
          padding: '6px 12px', background: '#f5f4f0', borderBottom: '1px solid #e8e6e1',
          fontSize: 11, color: '#999', textAlign: 'center',
        }}>
          ← Deslize para ver todos os meses →
        </div>
      )}

      <div style={{ minWidth: totalW }}>
        {/* Month headers */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e8e6e1', position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{
            width: LABEL_W, minWidth: LABEL_W, padding: isMobile ? '8px 8px' : '12px 12px',
            background: '#f5f4f0', borderRight: '2px solid #e8e6e1',
            fontSize: isMobile ? 9 : 11, fontWeight: 700, color: '#999',
            textTransform: 'uppercase', letterSpacing: 0.5,
            position: 'sticky', left: 0, zIndex: 3,
          }}>Funcionário</div>
          {MESES.map((m, i) => (
            <div key={i} style={{
              width: CELL_W, minWidth: CELL_W, textAlign: 'center',
              padding: isMobile ? '8px 0' : '12px 0',
              background: i % 2 === 0 ? '#f5f4f0' : '#faf9f6',
              borderRight: i < 11 ? '1px solid #e8e6e1' : 'none',
              fontSize: isMobile ? 9 : 11, fontWeight: 700, color: '#555', textTransform: 'uppercase',
            }}>{m.slice(0, 3)}</div>
          ))}
        </div>

        {grouped.map((setor, si) => {
          const corSet = CORES_SETOR[setor.cor % CORES_SETOR.length];
          return (
            <div key={setor.id}>
              {/* Sector header */}
              <div style={{
                display: 'flex', background: corSet.light,
                borderBottom: `1px solid ${corSet.bg}44`,
                borderTop: si > 0 ? '2px solid #e8e6e1' : 'none',
              }}>
                <div style={{
                  width: LABEL_W, minWidth: LABEL_W,
                  padding: isMobile ? '6px 8px' : '8px 12px',
                  borderRight: '2px solid #e8e6e1',
                  display: 'flex', alignItems: 'center', gap: 6,
                  position: 'sticky', left: 0, zIndex: 1, background: corSet.light,
                }}>
                  <div style={{ width: 4, height: 20, background: corSet.bg, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{
                    fontWeight: 700, fontSize: isMobile ? 10 : 13, color: corSet.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{setor.nome}</span>
                  {!isMobile && (
                    <span style={{
                      fontSize: 10, background: `${corSet.bg}22`, color: corSet.text,
                      padding: '2px 6px', borderRadius: 3, fontWeight: 600, marginLeft: 'auto', flexShrink: 0,
                    }}>máx {setor.limiteAusencias}</span>
                  )}
                </div>
                {Array.from({ length: 12 }).map((_, mes) => {
                  const key = `${setor.id}-${mes}`;
                  const hasConflict = conflitos[key];
                  const ausentes = setor.funcs.filter((f) => getAusenciaNoMes(ausencias, f.id, ano, mes) !== null).length;
                  return (
                    <div key={mes} style={{
                      width: CELL_W, minWidth: CELL_W,
                      background: hasConflict ? '#FFCDD2' : corSet.light,
                      borderRight: mes < 11 ? `1px solid ${corSet.bg}33` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? 8 : 10, fontWeight: 700,
                      color: hasConflict ? '#B71C1C' : ausentes > 0 ? corSet.text : 'transparent',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{ausentes > 0 ? `${ausentes} aus.` : ''}</div>
                  );
                })}
              </div>

              {/* Employee rows */}
              {setor.funcs.map((func, fi) => (
                <div key={func.id} style={{
                  display: 'flex', borderBottom: '1px solid #f0eeea',
                  background: fi % 2 === 0 ? '#fff' : '#fdfcfa',
                }}>
                  <div style={{
                    width: LABEL_W, minWidth: LABEL_W,
                    padding: isMobile ? '5px 8px 5px 16px' : '6px 12px 6px 30px',
                    borderRight: '2px solid #e8e6e1', fontSize: isMobile ? 10 : 12, color: '#555',
                    display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    position: 'sticky', left: 0, zIndex: 1,
                    background: fi % 2 === 0 ? '#fff' : '#fdfcfa',
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%', background: corSet.bg,
                      marginRight: 6, flexShrink: 0,
                    }} />
                    {func.nome}
                  </div>
                  {Array.from({ length: 12 }).map((_, mes) => {
                    const ausencia = getAusenciaNoMes(ausencias, func.id, ano, mes);
                    const conflictKey = `${setor.id}-${mes}`;
                    const hasConflict = conflitos[conflictKey] && ausencia !== null;
                    const cellKey = `${func.id}-${mes}`;
                    const isHovered = hoveredCell === cellKey;
                    const isSelected = selectedCell === cellKey;
                    const mc = ausencia ? getMotivoConfig(ausencia.motivo) : null;
                    const dias = ausencia ? calcularDias(ausencia.dataInicio, ausencia.dataFim) : 0;

                    return (
                      <div key={mes}
                        onMouseEnter={() => !isMobile && setHoveredCell(cellKey)}
                        onMouseLeave={() => !isMobile && setHoveredCell(null)}
                        onClick={() => ausencia && isMobile && handleCellClick(cellKey)}
                        title={!isMobile && ausencia
                          ? `${func.nome} — ${mc!.rotulo}\n${formatarData(ausencia.dataInicio)} a ${formatarData(ausencia.dataFim)}\n${dias} dia(s)${hasConflict ? '\n⚠️ CONFLITO' : ''}`
                          : undefined}
                        style={{
                          width: CELL_W, minWidth: CELL_W, height: isMobile ? 28 : 30,
                          background: ausencia
                            ? hasConflict
                              ? `repeating-linear-gradient(135deg, ${mc!.cor}, ${mc!.cor} 4px, #F44336 4px, #F44336 8px)`
                              : mc!.cor
                            : isHovered ? '#f5f4f0' : 'transparent',
                          borderRight: mes < 11 ? '1px solid #f0eeea' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 2, position: 'relative',
                          fontSize: isMobile ? 7 : 9, fontWeight: 700,
                          color: ausencia ? mc!.corTexto : 'transparent',
                          letterSpacing: 0.3, transition: 'background 0.15s',
                          cursor: ausencia ? 'pointer' : 'default', textTransform: 'uppercase',
                        }}
                      >
                        {ausencia && (
                          <>
                            <span>{isMobile ? mc!.rotulo.slice(0, 4) : mc!.rotulo}</span>
                            {!isMobile && (
                              <span style={{
                                fontSize: 8, opacity: 0.85,
                                background: 'rgba(0,0,0,0.15)', padding: '1px 3px', borderRadius: 2,
                              }}>{dias}d</span>
                            )}
                          </>
                        )}

                        {/* Mobile tooltip on tap */}
                        {isSelected && ausencia && isMobile && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                            background: '#1a1a1a', color: '#fff', borderRadius: 6, padding: '8px 12px',
                            fontSize: 11, whiteSpace: 'nowrap', zIndex: 10, fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textTransform: 'none', letterSpacing: 0,
                            marginBottom: 4,
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 2 }}>{func.nome}</div>
                            <div>{mc!.rotulo} · {dias}d</div>
                            <div style={{ opacity: 0.7 }}>
                              {formatarData(ausencia.dataInicio)} → {formatarData(ausencia.dataFim)}
                            </div>
                            {hasConflict && <div style={{ color: '#FF8A80', marginTop: 2 }}>⚠️ Conflito</div>}
                            <div style={{
                              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                              width: 0, height: 0, borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent', borderTop: '5px solid #1a1a1a',
                            }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
