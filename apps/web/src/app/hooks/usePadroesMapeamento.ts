// ============================================================
// hooks/usePadroesMapeamento.ts
// Hook para CRUD de padrões de mapeamento por perfil
// Persiste em localStorage, isolado por perfil
// ============================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  PadraoMapeamento,
  MapeamentoColuna,
  CampoSistema,
} from '../types/importacao';
import {
  listarPadroes,
  criarPadrao,
  atualizarPadrao,
  removerPadrao,
  aplicarPadrao,
} from '../lib/importacao';

interface UsePadroesMapeamentoReturn {
  /** Lista de padrões do perfil */
  padroes: PadraoMapeamento[];

  /** CRUD */
  salvarComoPadrao: (
    nome: string,
    descricao: string,
    mapeamento: MapeamentoColuna[],
    colunasVisiveis?: CampoSistema[],
  ) => PadraoMapeamento;
  editarPadrao: (
    id: string,
    dados: {
      nome?: string;
      descricao?: string;
      mapeamento?: MapeamentoColuna[];
      colunasVisiveis?: CampoSistema[];
    },
  ) => void;
  excluirPadrao: (id: string) => void;

  /** Aplicar padrão salvo ao mapeamento atual */
  aplicarPadraoSalvo: (
    id: string,
    mapeamentoAtual: MapeamentoColuna[],
  ) => MapeamentoColuna[] | null;

  /** Recarregar lista */
  recarregar: () => void;
}

export function usePadroesMapeamento(
  perfil: string,
  nomeUsuario: string,
): UsePadroesMapeamentoReturn {
  const [padroes, setPadroes] = useState<PadraoMapeamento[]>([]);

  const recarregar = useCallback(() => {
    setPadroes(listarPadroes(perfil));
  }, [perfil]);

  // Carregar ao montar
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const salvarComoPadrao = useCallback(
    (
      nome: string,
      descricao: string,
      mapeamento: MapeamentoColuna[],
      colunasVisiveis?: CampoSistema[],
    ) => {
      const novo = criarPadrao(nome, descricao, perfil, nomeUsuario, mapeamento, colunasVisiveis);
      setPadroes((prev) => [...prev, novo]);
      return novo;
    },
    [perfil, nomeUsuario],
  );

  const editarPadraoFn = useCallback(
    (
      id: string,
      dados: {
        nome?: string;
        descricao?: string;
        mapeamento?: MapeamentoColuna[];
        colunasVisiveis?: CampoSistema[];
      },
    ) => {
      atualizarPadrao(id, dados);
      recarregar();
    },
    [recarregar],
  );

  const excluirPadrao = useCallback(
    (id: string) => {
      removerPadrao(id);
      setPadroes((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  const aplicarPadraoSalvo = useCallback(
    (id: string, mapeamentoAtual: MapeamentoColuna[]): MapeamentoColuna[] | null => {
      const padrao = padroes.find((p) => p.id === id);
      if (!padrao) return null;
      return aplicarPadrao(padrao, mapeamentoAtual);
    },
    [padroes],
  );

  return {
    padroes,
    salvarComoPadrao,
    editarPadrao: editarPadraoFn,
    excluirPadrao,
    aplicarPadraoSalvo,
    recarregar,
  };
}
