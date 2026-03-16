// ============================================================
// hooks/useImportacao.ts
// Hook de estado para o wizard de importação XLSX/CSV
// Reutilizável por: chefe-cartorio, magistrado, administrador
// Orquestra: parser → mapeamento → validação → revisão
// ============================================================

'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  EtapaImportacao,
  MapeamentoColuna,
  ResultadoParsing,
  ResultadoValidacao,
  RegistroImportado,
  CampoSistema,
  EstadoImportacao,
} from '../types/importacao';
import {
  parsearArquivo,
  validarArquivo,
  sugerirMapeamento,
  aplicarMapeamento,
  validarRegistros,
} from '../lib/importacao';

interface UseImportacaoReturn {
  /** Estado completo */
  estado: EstadoImportacao;

  /** Ações do wizard */
  iniciarUpload: (arquivo: File) => Promise<void>;
  atualizarMapeamento: (indice: number, campo: CampoSistema) => void;
  confirmarMapeamento: () => void;
  avancarEtapa: () => void;
  voltarEtapa: () => void;

  /** Ações da revisão */
  toggleRegistro: (id: string) => void;
  selecionarTodos: () => void;
  deselecionarTodos: () => void;
  descartarRegistro: (id: string) => void;
  editarCampo: (id: string, campo: string, valor: string) => void;
  revalidar: () => void;
  confirmarImportacao: () => RegistroImportado[];

  /** Utilitários */
  resetar: () => void;
  registrosSelecionados: RegistroImportado[];
  podeProsseguir: boolean;
}

const ESTADO_INICIAL: EstadoImportacao = {
  etapa: 'upload',
  arquivo: null,
  parsing: null,
  mapeamento: [],
  validacao: null,
  carregando: false,
  erro: null,
};

export function useImportacao(): UseImportacaoReturn {
  const [estado, setEstado] = useState<EstadoImportacao>(ESTADO_INICIAL);

  // ── Upload ────────────────────────────────────────────

  const iniciarUpload = useCallback(async (arquivo: File) => {
    // Validar arquivo
    const validacao = validarArquivo(arquivo);
    if (!validacao.valido) {
      setEstado((prev) => ({ ...prev, erro: validacao.erro || 'Arquivo inválido' }));
      return;
    }

    setEstado((prev) => ({ ...prev, carregando: true, erro: null, arquivo }));

    try {
      const parsing = await parsearArquivo(arquivo);

      if (parsing.totalLinhas === 0) {
        setEstado((prev) => ({
          ...prev,
          carregando: false,
          erro: 'O arquivo não contém dados (apenas cabeçalho ou vazio)',
        }));
        return;
      }

      // Sugerir mapeamento automático
      const mapeamento = sugerirMapeamento(parsing);

      setEstado((prev) => ({
        ...prev,
        etapa: 'mapeamento',
        parsing,
        mapeamento,
        carregando: false,
        erro: null,
      }));
    } catch (err) {
      setEstado((prev) => ({
        ...prev,
        carregando: false,
        erro: err instanceof Error ? err.message : 'Erro ao processar arquivo',
      }));
    }
  }, []);

  // ── Mapeamento ────────────────────────────────────────

  const atualizarMapeamento = useCallback((indice: number, campo: CampoSistema) => {
    setEstado((prev) => {
      const novoMapeamento = [...prev.mapeamento];
      novoMapeamento[indice] = { ...novoMapeamento[indice], campoSistema: campo };
      return { ...prev, mapeamento: novoMapeamento, erro: null };
    });
  }, []);

  const confirmarMapeamento = useCallback(() => {
    setEstado((prev) => {
      if (!prev.parsing) return prev;

      // Verificar se pelo menos numero_processo foi mapeado
      const temProcesso = prev.mapeamento.some((m) => m.campoSistema === 'numero_processo');
      if (!temProcesso) {
        return { ...prev, erro: 'É obrigatório mapear a coluna "Nº do Processo"' };
      }

      // Aplicar mapeamento e validar
      const dadosMapeados = aplicarMapeamento(prev.parsing, prev.mapeamento);
      const validacao = validarRegistros(dadosMapeados, prev.mapeamento);

      return {
        ...prev,
        etapa: 'validacao',
        validacao,
        erro: null,
      };
    });
  }, []);

  // ── Navegação ─────────────────────────────────────────

  const avancarEtapa = useCallback(() => {
    setEstado((prev) => {
      const ordemEtapas: EtapaImportacao[] = ['upload', 'mapeamento', 'validacao', 'revisao', 'concluido'];
      const idxAtual = ordemEtapas.indexOf(prev.etapa);
      if (idxAtual >= ordemEtapas.length - 1) return prev;

      return {
        ...prev,
        etapa: ordemEtapas[idxAtual + 1],
        erro: null,
      };
    });
  }, []);

  const voltarEtapa = useCallback(() => {
    setEstado((prev) => {
      const ordemEtapas: EtapaImportacao[] = ['upload', 'mapeamento', 'validacao', 'revisao', 'concluido'];
      const idxAtual = ordemEtapas.indexOf(prev.etapa);
      if (idxAtual <= 0) return prev;

      return {
        ...prev,
        etapa: ordemEtapas[idxAtual - 1],
        erro: null,
      };
    });
  }, []);

  // ── Revisão ───────────────────────────────────────────

  const toggleRegistro = useCallback((id: string) => {
    setEstado((prev) => {
      if (!prev.validacao) return prev;
      const registros = prev.validacao.registros.map((r) =>
        r.id === id ? { ...r, selecionado: !r.selecionado } : r
      );
      return { ...prev, validacao: { ...prev.validacao, registros } };
    });
  }, []);

  const selecionarTodos = useCallback(() => {
    setEstado((prev) => {
      if (!prev.validacao) return prev;
      const registros = prev.validacao.registros.map((r) => ({ ...r, selecionado: true }));
      return { ...prev, validacao: { ...prev.validacao, registros } };
    });
  }, []);

  const deselecionarTodos = useCallback(() => {
    setEstado((prev) => {
      if (!prev.validacao) return prev;
      const registros = prev.validacao.registros.map((r) => ({ ...r, selecionado: false }));
      return { ...prev, validacao: { ...prev.validacao, registros } };
    });
  }, []);

  const descartarRegistro = useCallback((id: string) => {
    setEstado((prev) => {
      if (!prev.validacao) return prev;
      const registros = prev.validacao.registros.filter((r) => r.id !== id);
      const resumo = {
        total: registros.length,
        validos: registros.filter((r) => r.status === 'valido').length,
        incompletos: registros.filter((r) => r.status === 'incompleto').length,
        duplicados: registros.filter((r) => r.status === 'duplicado').length,
        erros: registros.filter((r) => r.status === 'erro').length,
      };
      return { ...prev, validacao: { registros, resumo } };
    });
  }, []);

  const editarCampo = useCallback((id: string, campo: string, valor: string) => {
    setEstado((prev) => {
      if (!prev.validacao) return prev;
      const registros = prev.validacao.registros.map((r) => {
        if (r.id !== id) return r;
        return { ...r, dados: { ...r.dados, [campo]: valor } };
      });
      return { ...prev, validacao: { ...prev.validacao, registros } };
    });
  }, []);

  const revalidar = useCallback(() => {
    setEstado((prev) => {
      if (!prev.validacao || !prev.parsing) return prev;

      const dadosAtuais = prev.validacao.registros.map((r) => r.dados);
      const novaValidacao = validarRegistros(dadosAtuais, prev.mapeamento);

      return { ...prev, validacao: novaValidacao };
    });
  }, []);

  const confirmarImportacao = useCallback((): RegistroImportado[] => {
    const selecionados = estado.validacao?.registros.filter((r) => r.selecionado) || [];

    setEstado((prev) => ({ ...prev, etapa: 'concluido' }));

    return selecionados;
  }, [estado.validacao]);

  // ── Utilitários ───────────────────────────────────────

  const resetar = useCallback(() => {
    setEstado(ESTADO_INICIAL);
  }, []);

  const registrosSelecionados = useMemo(() => {
    return estado.validacao?.registros.filter((r) => r.selecionado) || [];
  }, [estado.validacao]);

  const podeProsseguir = useMemo(() => {
    switch (estado.etapa) {
      case 'upload':
        return false; // precisa selecionar arquivo
      case 'mapeamento':
        return estado.mapeamento.some((m) => m.campoSistema === 'numero_processo');
      case 'validacao':
      case 'revisao':
        return registrosSelecionados.length > 0;
      default:
        return false;
    }
  }, [estado.etapa, estado.mapeamento, registrosSelecionados]);

  return {
    estado,
    iniciarUpload,
    atualizarMapeamento,
    confirmarMapeamento,
    avancarEtapa,
    voltarEtapa,
    toggleRegistro,
    selecionarTodos,
    deselecionarTodos,
    descartarRegistro,
    editarCampo,
    revalidar,
    confirmarImportacao,
    resetar,
    registrosSelecionados,
    podeProsseguir,
  };
}
