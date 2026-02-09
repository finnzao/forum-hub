'use client';

import React, { useState } from 'react';
import { MESES, CORES_SETOR } from '../data/constants';
import { Setor, Funcionario, PeriodoFerias } from '../types/ferias';

interface PainelFeriasProps {
  ferias: PeriodoFerias[];
  funcionarios: Funcionario[];
  setores: Setor[];
  onAddFerias: (
    funcionarioId: string,
    mesInicio: number,
    quinzenaInicio: 1 | 2,
    mesFim: number,
    quinzenaFim: 1 | 2
  ) => void;
  onRemoveFerias: (id: string) => void;
}

export const PainelFerias: React.FC<PainelFeriasProps> = ({
  ferias,
  funcionarios,
  setores,
  onAddFerias,
  onRemoveFerias,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [funcId, setFuncId] = useState('');
  const [mesInicio, setMesInicio] = useState(0);
  const [qInicio, setQInicio] = useState<1 | 2>(1);
  const [mesFim, setMesFim] = useState(0);
  const [qFim, setQFim] = useState<1 | 2>(2);

  const handleAdd = () => {
    if (!funcId) return;
    onAddFerias(funcId, mesInicio, qInicio, mesFim, qFim);
    setShowAdd(false);
  };

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: '#fff',
        border: '2px solid #e8e6e1',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '2px solid #e8e6e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f5f4f0',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>📅 Férias Agendadas</div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: '#ef6c00',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Agendar Férias
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            padding: 16,
            borderBottom: '2px solid #e8e6e1',
            background: '#faf9f6',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#666',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Funcionário
              </label>
              <select
                value={funcId}
                onChange={(e) => setFuncId(e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #e8e6e1',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  minWidth: 200,
                }}
              >
                <option value="">Selecione</option>
                {funcionarios.map((f) => {
                  const s = setores.find((s) => s.id === f.setorId);
                  return (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({s?.nome})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#666',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Início - Mês
              </label>
              <select
                value={mesInicio}
                onChange={(e) => setMesInicio(parseInt(e.target.value))}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #e8e6e1',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#666',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Quinzena
              </label>
              <select
                value={qInicio}
                onChange={(e) => setQInicio(parseInt(e.target.value) as 1 | 2)}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #e8e6e1',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value={1}>1ª quinzena</option>
                <option value={2}>2ª quinzena</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#666',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Fim - Mês
              </label>
              <select
                value={mesFim}
                onChange={(e) => setMesFim(parseInt(e.target.value))}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #e8e6e1',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#666',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Quinzena
              </label>
              <select
                value={qFim}
                onChange={(e) => setQFim(parseInt(e.target.value) as 1 | 2)}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #e8e6e1',
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value={1}>1ª quinzena</option>
                <option value={2}>2ª quinzena</option>
              </select>
            </div>
            <button
              onClick={handleAdd}
              style={{
                background: '#ef6c00',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 20px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Agendar
            </button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 40px',
            gap: 0,
            padding: '8px 20px',
            background: '#f5f4f0',
            fontSize: 11,
            fontWeight: 700,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            borderBottom: '1px solid #e8e6e1',
          }}
        >
          <span>Funcionário</span>
          <span>Período</span>
          <span>Setor</span>
          <span></span>
        </div>
        {ferias.map((f) => {
          const func = funcionarios.find((fn) => fn.id === f.funcionarioId);
          const setor = func ? setores.find((s) => s.id === func.setorId) : null;
          if (!func) return null;
          return (
            <div
              key={f.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 40px',
                gap: 0,
                padding: '10px 20px',
                borderBottom: '1px solid #f5f4f0',
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 500 }}>{func.nome}</span>
              <span style={{ color: '#666', fontSize: 12 }}>
                {MESES[f.mesInicio].slice(0, 3)} {f.quinzenaInicio}ª qz →{' '}
                {MESES[f.mesFim].slice(0, 3)} {f.quinzenaFim}ª qz
              </span>
              <span>
                {setor && (
                  <span
                    style={{
                      fontSize: 11,
                      background:
                        CORES_SETOR[setor.cor % CORES_SETOR.length].light,
                      color: CORES_SETOR[setor.cor % CORES_SETOR.length].text,
                      padding: '2px 8px',
                      borderRadius: 3,
                      fontWeight: 600,
                    }}
                  >
                    {setor.nome}
                  </span>
                )}
              </span>
              <button
                onClick={() => onRemoveFerias(f.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
                title="Remover"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
