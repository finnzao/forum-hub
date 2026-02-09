'use client';

import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface EstatisticaItem { label: string; value: number; color: string; }
interface BarraEstatisticasProps { itens: EstatisticaItem[]; }

export const BarraEstatisticas: React.FC<BarraEstatisticasProps> = ({ itens }) => {
  const { isMobile } = useResponsive();

  return (
    <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
      {itens.map((s, i) => (
        <div key={i} style={{
          flex: isMobile ? '1 1 calc(50% - 4px)' : '1 1 180px',
          background: '#fff', border: '2px solid #e8e6e1',
          borderRadius: 6, padding: isMobile ? '10px 14px' : '14px 20px',
          display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
        }}>
          <div style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
            background: `${s.color}18`, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 18 : 22, fontWeight: 800, color: s.color,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{s.value}</div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#666' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};
