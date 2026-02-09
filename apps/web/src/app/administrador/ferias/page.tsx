'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  INITIAL_SETORES, INITIAL_FUNCIONARIOS, INITIAL_AUSENCIAS, CORES_SETOR,
} from './data/constants';
import { calcularConflitos } from './data/utils';
import {
  Setor, Funcionario, Ausencia, SetorComFuncionarios, ViewType, MotivoAusencia,
} from './types/ferias';
import { CabecalhoFerias } from './componentes/CabecalhoFerias';
import { BarraEstatisticas } from './componentes/BarraEstatisticas';
import { Legenda } from './componentes/Legenda';
import { CalendarioHeatmap } from './componentes/CalendarioHeatmap';
import { AlertaConflitos } from './componentes/AlertaConflitos';
import { PainelSetores } from './componentes/PainelSetores';
import { PainelFuncionarios } from './componentes/PainelFuncionarios';
import { PainelAusencias } from './componentes/PainelAusencias';
import { SkeletonLoading } from './componentes/SkeletonLoading';
import { useResponsive } from './hooks/useResponsive';

export default function PaginaFerias() {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [anoAtual, setAnoAtual] = useState(2026);
  const [view, setView] = useState<ViewType>('heatmap');

  // Teste carregamento
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setSetores(INITIAL_SETORES);
      setFuncionarios(INITIAL_FUNCIONARIOS);
      setAusencias(INITIAL_AUSENCIAS);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const grouped = useMemo<SetorComFuncionarios[]>(() => {
    return setores.map((s) => ({ ...s, funcs: funcionarios.filter((f) => f.setorId === s.id) }));
  }, [setores, funcionarios]);

  const conflitos = useMemo(() => {
    return calcularConflitos(setores, funcionarios, ausencias, anoAtual);
  }, [setores, funcionarios, ausencias, anoAtual]);

  const totalConflitos = Object.keys(conflitos).length;

  const estatisticas = [
    { label: 'Setores', value: setores.length, color: '#2196F3' },
    { label: 'Funcionários', value: funcionarios.length, color: '#4CAF50' },
  ];

  // Setores
  const handleAddSetor = (nome: string, limite: number) => {
    setSetores([...setores, { id: String(Date.now()), nome, limiteAusencias: limite, cor: setores.length % CORES_SETOR.length }]);
  };
  const handleRemoveSetor = (id: string) => {
    const funcIds = funcionarios.filter((f) => f.setorId === id).map((f) => f.id);
    setSetores(setores.filter((s) => s.id !== id));
    setFuncionarios(funcionarios.filter((f) => f.setorId !== id));
    setAusencias(ausencias.filter((a) => !funcIds.includes(a.funcionarioId)));
  };
  const handleUpdateLimite = (id: string, valor: number) => {
    setSetores(setores.map((s) => s.id === id ? { ...s, limiteAusencias: Math.max(1, valor) } : s));
  };

  // Funcionários
  const handleAddFunc = (nome: string, setorId: string) => {
    setFuncionarios([...funcionarios, { id: String(Date.now()), nome, setorId }]);
  };
  const handleRemoveFunc = (id: string) => {
    setFuncionarios(funcionarios.filter((f) => f.id !== id));
    setAusencias(ausencias.filter((a) => a.funcionarioId !== id));
  };

  // Ausências
  const handleAddAusencia = (funcId: string, dataInicio: string, dataFim: string, motivo: MotivoAusencia) => {
    setAusencias([...ausencias, { id: String(Date.now()), funcionarioId: funcId, dataInicio, dataFim, motivo }]);
  };
  const handleUpdateAusencia = (id: string, dataInicio: string, dataFim: string, motivo: MotivoAusencia) => {
    setAusencias(ausencias.map((a) => a.id === id ? { ...a, dataInicio, dataFim, motivo } : a));
  };
  const handleRemoveAusencia = (id: string) => {
    setAusencias(ausencias.filter((a) => a.id !== id));
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#1a1a1a',
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <CabecalhoFerias anoAtual={anoAtual} onAnoChange={setAnoAtual} view={view} onViewChange={setView} />

      <div style={{ padding: isMobile ? '16px 12px' : isTablet ? '20px 20px' : '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {view === 'heatmap' && (
          <div>
            {loading ? (
              <>
                <SkeletonLoading tipo="cards" />
                <SkeletonLoading tipo="heatmap" linhas={10} />
              </>
            ) : (
              <>
                <BarraEstatisticas itens={estatisticas} />
                <Legenda />
                <CalendarioHeatmap grouped={grouped} ausencias={ausencias} conflitos={conflitos} ano={anoAtual} />
                <AlertaConflitos totalConflitos={totalConflitos} />
              </>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 16 : 24,
          }}>
            <PainelSetores setores={setores} funcionarios={funcionarios} loading={loading}
              onAddSetor={handleAddSetor} onRemoveSetor={handleRemoveSetor} onUpdateLimite={handleUpdateLimite} />
            <PainelFuncionarios grouped={grouped} setores={setores} ausencias={ausencias} loading={loading}
              onAddFunc={handleAddFunc} onRemoveFunc={handleRemoveFunc} />
            <PainelAusencias ausencias={ausencias} funcionarios={funcionarios} setores={setores} loading={loading}
              onAdd={handleAddAusencia} onUpdate={handleUpdateAusencia} onRemove={handleRemoveAusencia} />
          </div>
        )}
      </div>
    </div>
  );
}
