'use client';

import React, { useState, useMemo } from 'react';
import { MOTIVOS, CORES_SETOR } from '../data/constants';
import { formatarData, getMotivoConfig, calcularDias, somarDias } from '../data/utils';
import { Setor, Funcionario, Ausencia, MotivoAusencia } from '../types/ferias';
import { SkeletonLoading } from './SkeletonLoading';
import { useResponsive } from '../hooks/useResponsive';

interface PainelAusenciasProps {
  ausencias: Ausencia[];
  funcionarios: Funcionario[];
  setores: Setor[];
  loading?: boolean;
  onAdd: (funcId: string, dataInicio: string, dataFim: string, motivo: MotivoAusencia) => void;
  onUpdate: (id: string, dataInicio: string, dataFim: string, motivo: MotivoAusencia) => void;
  onRemove: (id: string) => void;
}

type ModoFim = 'data' | 'dias';

export const PainelAusencias: React.FC<PainelAusenciasProps> = ({
  ausencias, funcionarios, setores, loading = false, onAdd, onUpdate, onRemove,
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formFuncId, setFormFuncId] = useState('');
  const [formMotivo, setFormMotivo] = useState<MotivoAusencia>('ferias');
  const [formInicio, setFormInicio] = useState('');
  const [formModoFim, setFormModoFim] = useState<ModoFim>('data');
  const [formFim, setFormFim] = useState('');
  const [formDias, setFormDias] = useState<number>(30);

  const formDataFimCalculada = formModoFim === 'data'
    ? formFim
    : (formInicio && formDias > 0 ? somarDias(formInicio, formDias) : '');
  const formDiasCalculados = formInicio && formDataFimCalculada && formDataFimCalculada >= formInicio
    ? calcularDias(formInicio, formDataFimCalculada) : 0;

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInicio, setEditInicio] = useState('');
  const [editModoFim, setEditModoFim] = useState<ModoFim>('data');
  const [editFim, setEditFim] = useState('');
  const [editDias, setEditDias] = useState<number>(30);
  const [editMotivo, setEditMotivo] = useState<MotivoAusencia>('ferias');

  const editDataFimCalculada = editModoFim === 'data'
    ? editFim
    : (editInicio && editDias > 0 ? somarDias(editInicio, editDias) : '');

  // Filters
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroFunc, setFiltroFunc] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');

  const ausenciasFiltradas = useMemo(() => {
    return ausencias.filter((a) => {
      if (filtroFunc && a.funcionarioId !== filtroFunc) return false;
      if (filtroMotivo && a.motivo !== filtroMotivo) return false;
      if (filtroSetor) {
        const func = funcionarios.find((f) => f.id === a.funcionarioId);
        if (!func || func.setorId !== filtroSetor) return false;
      }
      return true;
    }).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }, [ausencias, funcionarios, filtroSetor, filtroFunc, filtroMotivo]);

  const funcsFiltradosPorSetor = useMemo(() => {
    if (!filtroSetor) return funcionarios;
    return funcionarios.filter((f) => f.setorId === filtroSetor);
  }, [funcionarios, filtroSetor]);

  const handleAdd = () => {
    if (!formFuncId || !formInicio || !formDataFimCalculada || formDataFimCalculada < formInicio) return;
    onAdd(formFuncId, formInicio, formDataFimCalculada, formMotivo);
    setFormFuncId(''); setFormInicio(''); setFormFim(''); setFormDias(30); setFormMotivo('ferias');
    setShowForm(false);
  };

  const startEdit = (a: Ausencia) => {
    setEditingId(a.id); setEditInicio(a.dataInicio); setEditFim(a.dataFim);
    setEditModoFim('data'); setEditDias(calcularDias(a.dataInicio, a.dataFim)); setEditMotivo(a.motivo);
  };

  const saveEdit = (id: string) => {
    const finalFim = editDataFimCalculada;
    if (!editInicio || !finalFim || finalFim < editInicio) return;
    onUpdate(id, editInicio, finalFim, editMotivo);
    setEditingId(null);
  };

  const handleEditFimChange = (val: string) => {
    setEditFim(val);
    if (editInicio && val >= editInicio) setEditDias(calcularDias(editInicio, val));
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: '2px solid #e8e6e1', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? '4px 10px' : '6px 14px', border: '2px solid #e8e6e1', borderRadius: 4,
    fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#ef6c00' : '#fff', color: active ? '#fff' : '#666',
    borderColor: active ? '#ef6c00' : '#e8e6e1', transition: 'all 0.2s',
  });

  return (
    <div style={{
      gridColumn: '1 / -1', background: '#fff', border: '2px solid #e8e6e1',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px', borderBottom: '2px solid #e8e6e1',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f4f0',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15 }}>📅 Ausências Registradas</div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: '#ef6c00', color: '#fff', border: 'none', borderRadius: 4,
          padding: isMobile ? '7px 14px' : '8px 18px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>{showForm ? '✕ Fechar' : '+ Nova Ausência'}</button>
      </div>

      {/* ===== ADD FORM ===== */}
      {showForm && (
        <div style={{ padding: isMobile ? 14 : 20, borderBottom: '2px solid #e8e6e1', background: '#faf9f6' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#333' }}>
            Registrar Nova Ausência
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 10 : 14, marginBottom: 14,
          }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                Funcionário *
              </label>
              <select value={formFuncId} onChange={(e) => setFormFuncId(e.target.value)} style={inputStyle}>
                <option value="">Selecione o funcionário</option>
                {setores.map((s) => {
                  const funcs = funcionarios.filter((f) => f.setorId === s.id);
                  if (funcs.length === 0) return null;
                  return (
                    <optgroup key={s.id} label={s.nome}>
                      {funcs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                Motivo *
              </label>
              <select value={formMotivo} onChange={(e) => setFormMotivo(e.target.value as MotivoAusencia)} style={inputStyle}>
                {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                Data Início *
              </label>
              <input type="date" value={formInicio} onChange={(e) => setFormInicio(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>Término *</label>
                <div style={{ display: 'flex', gap: 3 }}>
                  <button type="button" onClick={() => setFormModoFim('data')} style={toggleStyle(formModoFim === 'data')}>
                    Data Fim
                  </button>
                  <button type="button" onClick={() => setFormModoFim('dias')} style={toggleStyle(formModoFim === 'dias')}>
                    Qtd. Dias
                  </button>
                </div>
              </div>
              {formModoFim === 'data' ? (
                <input type="date" value={formFim} onChange={(e) => setFormFim(e.target.value)}
                  min={formInicio || undefined} style={inputStyle} />
              ) : (
                <input type="number" value={formDias} onChange={(e) => setFormDias(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1} placeholder="Quantidade de dias" style={inputStyle} />
              )}
            </div>
          </div>

          {formInicio && formDataFimCalculada && formDataFimCalculada >= formInicio && (
            <div style={{
              padding: '10px 14px', background: '#e8f5e9', borderRadius: 6, fontSize: 13,
              color: '#2E7D32', marginBottom: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontWeight: 700 }}>✓</span>
              <span>{formatarData(formInicio)} até {formatarData(formDataFimCalculada)}</span>
              <span style={{
                background: '#2E7D32', color: '#fff', padding: '2px 10px', borderRadius: 4,
                fontWeight: 700, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
              }}>{formDiasCalculados} dia(s)</span>
            </div>
          )}

          {formInicio && formDataFimCalculada && formDataFimCalculada < formInicio && (
            <div style={{
              padding: '10px 14px', background: '#ffebee', borderRadius: 6, fontSize: 13,
              color: '#c62828', marginBottom: 14, fontWeight: 500,
            }}>⚠️ Data fim deve ser posterior à data início</div>
          )}

          <button onClick={handleAdd}
            disabled={!formFuncId || !formInicio || !formDataFimCalculada || formDataFimCalculada < formInicio}
            style={{
              background: (!formFuncId || !formInicio || !formDataFimCalculada || formDataFimCalculada < formInicio) ? '#ccc' : '#ef6c00',
              color: '#fff', border: 'none', borderRadius: 4, width: isMobile ? '100%' : 'auto',
              padding: '10px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Registrar Ausência</button>
        </div>
      )}

      {/* ===== FILTERS ===== */}
      <div style={{
        padding: isMobile ? '10px 12px' : '12px 20px', borderBottom: '1px solid #e8e6e1', background: '#fdfcfa',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#888', width: isMobile ? '100%' : 'auto' }}>Filtros:</span>
        <select value={filtroSetor} onChange={(e) => { setFiltroSetor(e.target.value); setFiltroFunc(''); }}
          style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', fontSize: 12, padding: '5px 8px' }}>
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select value={filtroFunc} onChange={(e) => setFiltroFunc(e.target.value)}
          style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', fontSize: 12, padding: '5px 8px' }}>
          <option value="">Todos os funcionários</option>
          {funcsFiltradosPorSetor.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
          style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', fontSize: 12, padding: '5px 8px' }}>
          <option value="">Todos os motivos</option>
          {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
        </select>
        {(filtroSetor || filtroFunc || filtroMotivo) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
            <button onClick={() => { setFiltroSetor(''); setFiltroFunc(''); setFiltroMotivo(''); }}
              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>
              ✕ Limpar
            </button>
            <span style={{ fontSize: 11, color: '#999' }}>{ausenciasFiltradas.length} de {ausencias.length}</span>
          </div>
        )}
      </div>

      {/* ===== TABLE HEADER (desktop/tablet only) ===== */}
      {!isMobile && (
        <div style={{
          display: 'grid', gridTemplateColumns: isTablet ? '1fr 0.8fr 1fr 0.6fr 90px' : '1.2fr 0.8fr 1fr 0.7fr 0.5fr 90px',
          padding: '8px 20px', background: '#f5f4f0', borderBottom: '1px solid #e8e6e1',
          fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <span>Funcionário</span>
          {!isTablet && <span>Setor</span>}
          <span>Período</span>
          <span>Motivo</span>
          <span>{isTablet ? '' : 'Dias'}</span>
          {!isTablet && <span style={{ textAlign: 'right' }}>Ações</span>}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <div style={{ maxHeight: 450, minHeight: isMobile ? undefined : 300, overflowY: 'auto' }}>
        {loading ? (
          <SkeletonLoading linhas={6} tipo="tabela" />
        ) : ausenciasFiltradas.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: '#999', fontSize: 13 }}>
            Nenhuma ausência encontrada.
          </div>
        ) : (
          ausenciasFiltradas.map((a) => {
            const func = funcionarios.find((f) => f.id === a.funcionarioId);
            const setor = func ? setores.find((s) => s.id === func.setorId) : null;
            const mc = getMotivoConfig(a.motivo);
            const dias = calcularDias(a.dataInicio, a.dataFim);
            const isEditing = editingId === a.id;

            if (!func) return null;

            /* ---- EDIT MODE ---- */
            if (isEditing) {
              const editFimFinal = editDataFimCalculada;
              const editDiasCalc = editInicio && editFimFinal && editFimFinal >= editInicio
                ? calcularDias(editInicio, editFimFinal) : 0;
              return (
                <div key={a.id} style={{ padding: isMobile ? 12 : '14px 20px', borderBottom: '1px solid #f0eeea', background: '#fffde7' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 10 }}>
                    Editando: {func.nome}
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                    gap: 10, marginBottom: 10,
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 3 }}>Data Início</label>
                      <input type="date" value={editInicio} onChange={(e) => setEditInicio(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>Término</label>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button type="button" onClick={() => setEditModoFim('data')}
                            style={{ ...toggleStyle(editModoFim === 'data'), padding: '2px 8px', fontSize: 10 }}>Data</button>
                          <button type="button" onClick={() => setEditModoFim('dias')}
                            style={{ ...toggleStyle(editModoFim === 'dias'), padding: '2px 8px', fontSize: 10 }}>Dias</button>
                        </div>
                      </div>
                      {editModoFim === 'data' ? (
                        <input type="date" value={editFim} onChange={(e) => handleEditFimChange(e.target.value)}
                          min={editInicio || undefined} style={{ ...inputStyle, fontSize: 12 }} />
                      ) : (
                        <input type="number" value={editDias} onChange={(e) => setEditDias(Math.max(1, parseInt(e.target.value) || 1))}
                          min={1} style={{ ...inputStyle, fontSize: 12 }} />
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 3 }}>Motivo</label>
                      <select value={editMotivo} onChange={(e) => setEditMotivo(e.target.value as MotivoAusencia)} style={{ ...inputStyle, fontSize: 12 }}>
                        {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
                      </select>
                    </div>
                  </div>
                  {editInicio && editFimFinal && editFimFinal >= editInicio && (
                    <div style={{
                      padding: '6px 10px', background: '#e8f5e9', borderRadius: 4, fontSize: 12,
                      color: '#2E7D32', marginBottom: 10, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                    }}>
                      <span>{formatarData(editInicio)} até {formatarData(editFimFinal)}</span>
                      <span style={{
                        background: '#2E7D32', color: '#fff', padding: '1px 8px', borderRadius: 3,
                        fontWeight: 700, fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      }}>{editDiasCalc}d</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} style={{
                      padding: '7px 16px', border: '2px solid #e8e6e1', borderRadius: 4, background: '#fff',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666',
                    }}>Cancelar</button>
                    <button onClick={() => saveEdit(a.id)} style={{
                      padding: '7px 16px', border: 'none', borderRadius: 4, background: '#4CAF50',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
                    }}>Salvar</button>
                  </div>
                </div>
              );
            }

            /* ---- MOBILE CARD ---- */
            if (isMobile) {
              return (
                <div key={a.id} style={{
                  padding: '12px 14px', borderBottom: '1px solid #f0eeea',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{func.nome}</div>
                      {setor && (
                        <span style={{
                          fontSize: 10, background: CORES_SETOR[setor.cor % CORES_SETOR.length].light,
                          color: CORES_SETOR[setor.cor % CORES_SETOR.length].text,
                          padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                        }}>{setor.nome}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => startEdit(a)} title="Editar"
                        style={{ background: '#E3F2FD', border: 'none', borderRadius: 4, color: '#1565C0', fontSize: 14, padding: '4px 8px', cursor: 'pointer' }}>✎</button>
                      <button onClick={() => onRemove(a.id)} title="Apagar"
                        style={{ background: '#FFEBEE', border: 'none', borderRadius: 4, color: '#c62828', fontSize: 14, padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, background: mc.cor, color: mc.corTexto,
                      padding: '2px 8px', borderRadius: 3, fontWeight: 600,
                    }}>{mc.rotulo}</span>
                    <span style={{ fontSize: 11, color: '#555' }}>
                      {formatarData(a.dataInicio)} → {formatarData(a.dataFim)}
                    </span>
                    <span style={{
                      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                      color: '#333', background: '#f0eeea', padding: '1px 6px', borderRadius: 3,
                    }}>{dias}d</span>
                  </div>
                </div>
              );
            }

            /* ---- DESKTOP/TABLET ROW ---- */
            return (
              <div key={a.id} style={{
                display: 'grid',
                gridTemplateColumns: isTablet ? '1fr 0.8fr 1fr 0.6fr 90px' : '1.2fr 0.8fr 1fr 0.7fr 0.5fr 90px',
                padding: '10px 20px', borderBottom: '1px solid #f5f4f0', fontSize: 13, alignItems: 'center',
              }}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{func.nome}</span>
                {!isTablet && (
                  <span>
                    {setor && (
                      <span style={{
                        fontSize: 11, background: CORES_SETOR[setor.cor % CORES_SETOR.length].light,
                        color: CORES_SETOR[setor.cor % CORES_SETOR.length].text,
                        padding: '2px 8px', borderRadius: 3, fontWeight: 600,
                      }}>{setor.nome}</span>
                    )}
                  </span>
                )}
                <span style={{ color: '#555', fontSize: 12 }}>
                  {formatarData(a.dataInicio)} → {formatarData(a.dataFim)}
                </span>
                <span>
                  <span style={{
                    fontSize: 11, background: mc.cor, color: mc.corTexto,
                    padding: '3px 10px', borderRadius: 3, fontWeight: 600,
                  }}>{mc.rotulo}</span>
                </span>
                {!isTablet && (
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#333' }}>{dias}</span>
                )}
                <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => startEdit(a)} title="Editar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, color: '#1565C0', fontSize: 18, fontWeight: 700 }}>✎</button>
                  <button onClick={() => onRemove(a.id)} title="Apagar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, color: '#c62828', fontSize: 18 }}>✕</button>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
