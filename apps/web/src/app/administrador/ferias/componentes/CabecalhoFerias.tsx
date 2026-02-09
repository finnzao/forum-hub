'use client';

import React from 'react';
import Link from 'next/link';
import { ViewType } from '../types/ferias';
import { useResponsive } from '../hooks/useResponsive';

interface CabecalhoFeriasProps {
  anoAtual: number;
  onAnoChange: (ano: number) => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const CabecalhoFerias: React.FC<CabecalhoFeriasProps> = ({
  anoAtual, onAnoChange, view, onViewChange,
}) => {
  const { isMobile, isTablet } = useResponsive();

  const views: { key: ViewType; label: string; icon: string }[] = [
    { key: 'heatmap', label: 'Calendário', icon: '📅' },
    { key: 'dashboard', label: 'Gerenciar', icon: '⚙️' },
  ];

  return (
    <div style={{
      background: '#1a1a1a', color: '#fff',
      padding: isMobile ? '12px 16px' : '14px 32px',
    }}>
      {/* Row 1: back + title + year */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: isMobile ? 8 : 16,
        marginBottom: isMobile ? 10 : 0,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flex: 1, minWidth: 0 }}>
          <Link href="/administrador" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, minWidth: 34, borderRadius: 6, background: '#333',
            color: '#aaa', textDecoration: 'none', fontSize: 18,
          }} title="Voltar ao Administrador">←</Link>
          {!isMobile && (
            <div style={{
              fontWeight: 700, fontSize: isTablet ? 14 : 17, letterSpacing: -0.3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Controle de Férias e Ausências
            </div>
          )}
        </div>

        {/* Year selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => onAnoChange(anoAtual - 1)} style={{
            background: '#333', border: 'none', color: '#aaa', borderRadius: 4,
            width: 28, height: 28, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          <span style={{
            fontWeight: 700, fontSize: 15, minWidth: 50, textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{anoAtual}</span>
          <button onClick={() => onAnoChange(anoAtual + 1)} style={{
            background: '#333', border: 'none', color: '#aaa', borderRadius: 4,
            width: 28, height: 28, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>›</button>
        </div>

        {/* View toggle - inline on tablet/desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4, background: '#2a2a2a', borderRadius: 6, padding: 3 }}>
            {views.map((v) => (
              <button key={v.key} onClick={() => onViewChange(v.key)} style={{
                padding: isTablet ? '6px 12px' : '8px 18px',
                border: 'none', borderRadius: 4, fontSize: isTablet ? 12 : 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                background: view === v.key ? '#ef6c00' : 'transparent',
                color: view === v.key ? '#fff' : '#888', transition: 'all 0.2s',
              }}>{v.icon} {v.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Row 2 mobile: title + view toggle */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{
            fontWeight: 700, fontSize: 13, letterSpacing: -0.3, opacity: 0.9,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          }}>
            Férias e Ausências
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#2a2a2a', borderRadius: 6, padding: 2, flexShrink: 0 }}>
            {views.map((v) => (
              <button key={v.key} onClick={() => onViewChange(v.key)} style={{
                padding: '5px 10px', border: 'none', borderRadius: 4, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                background: view === v.key ? '#ef6c00' : 'transparent',
                color: view === v.key ? '#fff' : '#888', transition: 'all 0.2s',
              }}>{v.icon} {v.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
