'use client';

import React, { useState } from 'react';
import { CORES_SETOR } from '../data/constants';
import { Setor, Funcionario } from '../types/ferias';
import { SkeletonLoading } from './SkeletonLoading';
import { useResponsive } from '../hooks/useResponsive';

interface PainelSetoresProps {
  setores: Setor[];
  funcionarios: Funcionario[];
  loading?: boolean;
  onAddSetor: (nome: string, limite: number) => void;
  onRemoveSetor: (id: string) => void;
  onUpdateLimite: (id: string, valor: number) => void;
}

export const PainelSetores: React.FC<PainelSetoresProps> = ({
  setores, funcionarios, loading = false, onAddSetor, onRemoveSetor, onUpdateLimite,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState(1);
  const { isMobile } = useResponsive();

  const handleAdd = () => {
    if (!nome.trim()) return;
    onAddSetor(nome, limite);
    setNome(''); setLimite(1); setShowAdd(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: '2px solid #e8e6e1', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%',
  };

  return (
    <div style={{ background: '#fff', border: '2px solid #e8e6e1', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '2px solid #e8e6e1',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f4f0',
      }}>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>🏢 Setores</div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4,
          padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Novo</button>
      </div>
      {showAdd && (
        <div style={{ padding: isMobile ? 12 : 16, borderBottom: '2px solid #e8e6e1', background: '#faf9f6' }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do setor"
            style={{ ...inputStyle, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#666' }}>Limite:</label>
            <input type="number" min={1} max={10} value={limite}
              onChange={(e) => setLimite(parseInt(e.target.value) || 1)}
              style={{ ...inputStyle, width: 60 }} />
            <button onClick={handleAdd} style={{
              marginLeft: 'auto', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4,
              padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Salvar</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 400, minHeight: isMobile ? undefined : 280, overflowY: 'auto' }}>
        {loading ? (
          <SkeletonLoading linhas={5} tipo="tabela" />
        ) : (
          setores.map((s) => {
            const cor = CORES_SETOR[s.cor % CORES_SETOR.length];
            const funcCount = funcionarios.filter((f) => f.setorId === s.id).length;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center',
                padding: isMobile ? '10px 14px' : '12px 20px',
                borderBottom: '1px solid #f0eeea', gap: isMobile ? 8 : 10,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}>
                <div style={{ width: 4, height: 32, background: cor.bg, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{funcCount} funcionário(s)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <label style={{ fontSize: 11, color: '#888' }}>Limite:</label>
                  <input type="number" min={1} value={s.limiteAusencias}
                    onChange={(e) => onUpdateLimite(s.id, parseInt(e.target.value) || 1)}
                    style={{ width: 44, padding: '4px 6px', textAlign: 'center', border: '2px solid #e8e6e1', borderRadius: 4, fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
                </div>
                <button onClick={() => onRemoveSetor(s.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 }} title="Remover">✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
