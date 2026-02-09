'use client';

import React from 'react';
import { MOTIVOS } from '../data/constants';
import { useResponsive } from '../hooks/useResponsive';

export const Legenda: React.FC = () => {
  const { isMobile } = useResponsive();

  return (
    <div style={{
      display: 'flex', gap: isMobile ? 10 : 20, marginBottom: isMobile ? 10 : 16,
      fontSize: isMobile ? 10 : 12, color: '#666', alignItems: 'center', flexWrap: 'wrap',
    }}>
      {!isMobile && <span style={{ fontWeight: 700, color: '#333' }}>Legenda:</span>}
      {MOTIVOS.map((m) => (
        <span key={m.valor} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: isMobile ? 14 : 20, height: isMobile ? 10 : 12, background: m.cor, borderRadius: 2, display: 'inline-block' }} />
          {m.rotulo}
        </span>
      ))}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: isMobile ? 14 : 20, height: isMobile ? 10 : 12, borderRadius: 2, display: 'inline-block',
          background: 'repeating-linear-gradient(135deg, #ef6c00, #ef6c00 3px, #F44336 3px, #F44336 6px)',
        }} />
        Conflito
      </span>
    </div>
  );
};
