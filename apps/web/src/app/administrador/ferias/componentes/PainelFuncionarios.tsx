'use client';

import React, { useState, useMemo } from 'react';
import { CORES_SETOR } from '../data/constants';
import { Setor, SetorComFuncionarios, Ausencia } from '../types/ferias';
import { SkeletonLoading } from './SkeletonLoading';
import { useResponsive } from '../hooks/useResponsive';

interface PainelFuncionariosProps {
  grouped: SetorComFuncionarios[];
  setores: Setor[];
  ausencias: Ausencia[];
  loading?: boolean;
  onAddFunc: (nome: string, setorId: string) => void;
  onRemoveFunc: (id: string) => void;
}

export const PainelFuncionarios: React.FC<PainelFuncionariosProps> = ({
  grouped, setores, ausencias, loading = false, onAddFunc, onRemoveFunc,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState('');
  const [setorId, setSetorId] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const { isMobile } = useResponsive();

  const groupedFiltrado = useMemo(() => {
    return grouped
      .filter((setor) => !filtroSetor || setor.id === filtroSetor)
      .map((setor) => ({
        ...setor,
        funcs: setor.funcs.filter((f) =>
          !busca || f.nome.toLowerCase().includes(busca.toLowerCase())
        ),
      }))
      .filter((setor) => setor.funcs.length > 0 || (!busca && !filtroSetor));
  }, [grouped, busca, filtroSetor]);

  const totalFiltrado = groupedFiltrado.reduce((acc, s) => acc + s.funcs.length, 0);
  const totalGeral = grouped.reduce((acc, s) => acc + s.funcs.length, 0);

  const handleAdd = () => {
    if (!nome.trim() || !setorId) return;
    onAddFunc(nome, setorId);
    setNome(''); setSetorId(''); setShowAdd(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', border: '2px solid #e8e6e1', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ background: '#fff', border: '2px solid #e8e6e1', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '2px solid #e8e6e1',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f4f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>👥 Funcionários</span>
          <span style={{
            fontSize: 11, color: '#888', background: '#e8e6e1',
            padding: '2px 8px', borderRadius: 10, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{totalGeral}</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4,
          padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Novo</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: isMobile ? 12 : 16, borderBottom: '2px solid #e8e6e1', background: '#faf9f6' }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do funcionário"
            style={{ ...inputStyle, width: '100%', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={setorId} onChange={(e) => setSetorId(e.target.value)}
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}>
              <option value="">Selecione o setor</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <button onClick={handleAdd} style={{
              background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4,
              padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Salvar</button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        padding: isMobile ? '8px 12px' : '10px 20px', borderBottom: '1px solid #e8e6e1', background: '#fdfcfa',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 140 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: '#bbb', pointerEvents: 'none',
          }}>🔍</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            style={{ ...inputStyle, width: '100%', paddingLeft: 32, fontSize: 12 }} />
        </div>
        <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}
          style={{ ...inputStyle, fontSize: 12, width: isMobile ? '100%' : 'auto' }}>
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        {(busca || filtroSetor) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
            <button onClick={() => { setBusca(''); setFiltroSetor(''); }} style={{
              background: 'none', border: 'none', color: '#999', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, padding: '4px 8px',
            }}>✕ Limpar</button>
            <span style={{ fontSize: 11, color: '#999' }}>{totalFiltrado} de {totalGeral}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ maxHeight: 400, minHeight: isMobile ? undefined : 280, overflowY: 'auto' }}>
        {loading ? (
          <SkeletonLoading linhas={6} tipo="tabela" />
        ) : groupedFiltrado.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: '#999', fontSize: 13 }}>
            {busca || filtroSetor
              ? 'Nenhum funcionário encontrado.'
              : 'Nenhum funcionário cadastrado.'}
          </div>
        ) : (
          groupedFiltrado.map((setor) => (
            <div key={setor.id}>
              <div style={{
                padding: isMobile ? '6px 14px' : '8px 20px',
                background: CORES_SETOR[setor.cor % CORES_SETOR.length].light,
                fontSize: 11, fontWeight: 700, color: CORES_SETOR[setor.cor % CORES_SETOR.length].text,
                textTransform: 'uppercase', letterSpacing: 0.5,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{setor.nome}</span>
                <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                  {setor.funcs.length}
                </span>
              </div>
              {setor.funcs.map((f) => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: isMobile ? '7px 14px 7px 24px' : '8px 20px 8px 36px',
                  borderBottom: '1px solid #f5f4f0', gap: 8,
                }}>
                  <span style={{ fontSize: isMobile ? 12 : 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.nome}
                  </span>
                  {!isMobile && (
                    <span style={{ fontSize: 10, color: '#999', background: '#f5f4f0', padding: '2px 8px', borderRadius: 3, flexShrink: 0 }}>
                      {ausencias.filter((a) => a.funcionarioId === f.id).length} ausência(s)
                    </span>
                  )}
                  <button onClick={() => onRemoveFunc(f.id)} style={{
                    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 14, padding: 2, flexShrink: 0,
                  }} title="Remover">✕</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
