'use client';

import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface AlertaConflitosProps { totalConflitos: number; }

export const AlertaConflitos: React.FC<AlertaConflitosProps> = ({ totalConflitos }) => {
  const { isMobile } = useResponsive();
  if (totalConflitos === 0) return null;
  return (
    <div style={{
      marginTop: isMobile ? 10 : 16, padding: isMobile ? '10px 14px' : '14px 20px',
      background: '#FFF3E0', border: '2px solid #FFB74D', borderRadius: 6, borderLeft: '4px solid #F44336',
    }}>
      <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14, color: '#E65100', marginBottom: 4 }}>
        ⚠️ Conflitos Detectados
      </div>
      <div style={{ fontSize: isMobile ? 11 : 12, color: '#BF360C' }}>
        {totalConflitos} mês(es) com ausências acima do limite.
      </div>
    </div>
  );
};
