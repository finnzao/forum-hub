'use client';

import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface SkeletonLoadingProps {
  linhas?: number;
  tipo?: 'tabela' | 'cards' | 'heatmap';
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0eeea 25%, #e8e6e1 50%, #f0eeea 75%)',
  backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 4,
};

// Deterministic widths to avoid hydration mismatch
const NAME_WIDTHS = [120, 95, 140, 110, 130, 100, 125, 115, 135, 105];
const SHOW_CELL = [false, false, true, false, false, false, true, false, false, true, false, false];

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({ linhas = 5, tipo = 'tabela' }) => {
  const { isMobile } = useResponsive();

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {tipo === 'cards' && (
        <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 24, animation: 'fadeIn 0.3s', flexWrap: 'wrap' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{
              flex: isMobile ? '1 1 calc(50% - 4px)' : '1 1 180px',
              background: '#fff', border: '2px solid #e8e6e1', borderRadius: 6,
              padding: isMobile ? '10px 14px' : '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ ...shimmerStyle, width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 6 }} />
              <div style={{ ...shimmerStyle, width: 80, height: 14 }} />
            </div>
          ))}
        </div>
      )}

      {tipo === 'heatmap' && (
        <div style={{
          background: '#fff', border: '2px solid #e8e6e1', borderRadius: 8, overflow: 'hidden', animation: 'fadeIn 0.3s',
        }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #e8e6e1', padding: '12px 0' }}>
            <div style={{ width: isMobile ? 110 : 180, padding: '0 12px' }}>
              <div style={{ ...shimmerStyle, width: isMobile ? 60 : 120, height: 12 }} />
            </div>
            {Array.from({ length: isMobile ? 6 : 12 }).map((_, i) => (
              <div key={i} style={{ width: isMobile ? 56 : 82, display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...shimmerStyle, width: 30, height: 12 }} />
              </div>
            ))}
          </div>
          {Array.from({ length: linhas }).map((_, i) => (
            <div key={i} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f0eeea' }}>
              <div style={{ width: isMobile ? 110 : 180, padding: '0 12px 0 30px' }}>
                <div style={{ ...shimmerStyle, width: NAME_WIDTHS[i % NAME_WIDTHS.length], height: 12 }} />
              </div>
              {Array.from({ length: isMobile ? 6 : 12 }).map((_, j) => (
                <div key={j} style={{ width: isMobile ? 56 : 82, display: 'flex', justifyContent: 'center' }}>
                  {SHOW_CELL[(i + j) % SHOW_CELL.length] && (
                    <div style={{ ...shimmerStyle, width: isMobile ? 40 : 60, height: 20, borderRadius: 3 }} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tipo === 'tabela' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {Array.from({ length: linhas }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center',
              padding: isMobile ? '10px 14px' : '12px 20px',
              borderBottom: '1px solid #f0eeea', gap: 12,
            }}>
              <div style={{ ...shimmerStyle, width: 4, height: 32 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ ...shimmerStyle, width: NAME_WIDTHS[i % NAME_WIDTHS.length], height: 13 }} />
                <div style={{ ...shimmerStyle, width: 60, height: 10 }} />
              </div>
              <div style={{ ...shimmerStyle, width: 50, height: 14 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
