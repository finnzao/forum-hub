// ============================================================
// hooks/useDistribuicao.ts
// Hook principal para gerenciar distribuição de processos
// Reutilizável por: chefe-cartorio, magistrado
// ============================================================

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  ListaTrabalho,
  ServidorDistribuicao,
  ProcessoDistribuivel,
  ConfiguracaoDistribuicao,
  SugestaoDistribuicao,
  CriterioOrdenacao,
  ModoDistribuicao,
  PeriodoLista,
  FiltrosListaTrabalho,
  EstatisticasDistribuicao,
  StatusProcessoLista,
} from '../types/distribuicao';
import {
  SERVIDORES_MOCK,
  gerarProcessosMock,
  gerarSugestaoDistribuicao,
  calcularProgresso,
  CRITERIOS_PADRAO,
  criarLista,
  lerListas,
  atualizarStatusProcesso,
  cancelarLista,
  filtrarListas,
  calcularEstatisticas,
} from '../lib/distribuicao';

export type EtapaDistribuicao = 'configuracao' | 'revisao' | 'concluido';

export function useDistribuicao() {
  const [etapa, setEtapa] = useState<EtapaDistribuicao>('configuracao');
  const [servidores] = useState<ServidorDistribuicao[]>(SERVIDORES_MOCK);
  const [processosDisponiveis] = useState<ProcessoDistribuivel[]>(() => gerarProcessosMock(200));
  const [sugestoes, setSugestoes] = useState<SugestaoDistribuicao[]>([]);
  const [listas, setListas] = useState<ListaTrabalho[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfiguracaoDistribuicao>({
    modo: 'igualitaria',
    periodo: 'semanal',
    dataInicio: '',
    dataFim: '',
    servidoresSelecionados: [],
    criteriosOrdenacao: CRITERIOS_PADRAO.slice(0, 2),
  });

  // Inicializar datas e listas apenas no client (evita hydration mismatch)
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      dataInicio: obterDataHojeISO(),
      dataFim: obterDataFimSemanaISO(),
    }));
    setListas(lerListas());
  }, []);

  const estatisticas = useMemo(() => calcularEstatisticas(), [listas]);

  // ── Configuração ──────────────────────────────────────

  const setModo = useCallback((modo: ModoDistribuicao) => {
    setConfig((prev) => ({ ...prev, modo }));
  }, []);

  const setPeriodo = useCallback((periodo: PeriodoLista) => {
    setConfig((prev) => {
      const novasFim = calcularDataFim(prev.dataInicio, periodo);
      return { ...prev, periodo, dataFim: novasFim };
    });
  }, []);

  const setDatas = useCallback((inicio: string, fim: string) => {
    setConfig((prev) => ({ ...prev, dataInicio: inicio, dataFim: fim }));
  }, []);

  /** Adiciona ou remove servidor. Ao adicionar, coloca no final da fila. */
  const toggleServidor = useCallback((servidor: ServidorDistribuicao) => {
    setConfig((prev) => {
      const existe = prev.servidoresSelecionados.find((s) => s.id === servidor.id);
      if (existe) {
        // Remover e recalcular ordens
        const filtrados = prev.servidoresSelecionados.filter((s) => s.id !== servidor.id);
        const reordenados = filtrados.map((s, i) => ({ ...s, ordemRecebimento: i + 1 }));
        return { ...prev, servidoresSelecionados: reordenados };
      }
      // Adicionar no final da fila
      const novoServidor = {
        ...servidor,
        ordemRecebimento: prev.servidoresSelecionados.length + 1,
      };
      return { ...prev, servidoresSelecionados: [...prev.servidoresSelecionados, novoServidor] };
    });
  }, []);

  /** Reordena servidor: troca posição com o vizinho */
  const reordenarServidor = useCallback((servidorId: string, direcao: 'cima' | 'baixo') => {
    setConfig((prev) => {
      const lista = [...prev.servidoresSelecionados];
      const idx = lista.findIndex((s) => s.id === servidorId);
      if (idx === -1) return prev;

      const trocarCom = direcao === 'cima' ? idx - 1 : idx + 1;
      if (trocarCom < 0 || trocarCom >= lista.length) return prev;

      // Trocar posições
      [lista[idx], lista[trocarCom]] = [lista[trocarCom], lista[idx]];

      // Recalcular ordens
      const reordenados = lista.map((s, i) => ({ ...s, ordemRecebimento: i + 1 }));
      return { ...prev, servidoresSelecionados: reordenados };
    });
  }, []);

  const setCotaServidor = useCallback((servidorId: string, cota: number) => {
    setConfig((prev) => ({
      ...prev,
      cotaPersonalizada: { ...prev.cotaPersonalizada, [servidorId]: cota },
    }));
  }, []);

  const setCriterios = useCallback((criterios: CriterioOrdenacao[]) => {
    setConfig((prev) => ({ ...prev, criteriosOrdenacao: criterios }));
  }, []);

  const adicionarCriterio = useCallback((criterio: CriterioOrdenacao) => {
    setConfig((prev) => ({
      ...prev,
      criteriosOrdenacao: [...prev.criteriosOrdenacao, criterio],
    }));
  }, []);

  const removerCriterio = useCallback((indice: number) => {
    setConfig((prev) => ({
      ...prev,
      criteriosOrdenacao: prev.criteriosOrdenacao.filter((_, i) => i !== indice),
    }));
  }, []);

  // ── Distribuição ──────────────────────────────────────

  const gerarSugestao = useCallback(() => {
    if (config.servidoresSelecionados.length === 0) {
      setErro('Selecione pelo menos um servidor');
      return;
    }
    setErro(null);
    const resultado = gerarSugestaoDistribuicao(processosDisponiveis, config);
    setSugestoes(resultado);
    setEtapa('revisao');
  }, [config, processosDisponiveis]);

  const moverProcesso = useCallback((processoId: string, deServidorId: string, paraServidorId: string) => {
    setSugestoes((prev) => {
      let processoMovido: ProcessoDistribuivel | null = null;

      const atualizado = prev.map((s) => {
        if (s.servidorId === deServidorId) {
          const processo = s.processos.find((p) => p.id === processoId);
          if (processo) processoMovido = processo;
          return { ...s, processos: s.processos.filter((p) => p.id !== processoId), cota: s.cota - 1 };
        }
        return s;
      });

      if (!processoMovido) return prev;

      return atualizado.map((s) =>
        s.servidorId === paraServidorId
          ? { ...s, processos: [...s.processos, processoMovido!], cota: s.cota + 1 }
          : s,
      );
    });
  }, []);

  const removerProcessoDaSugestao = useCallback((processoId: string, servidorId: string) => {
    setSugestoes((prev) =>
      prev.map((s) =>
        s.servidorId !== servidorId
          ? s
          : { ...s, processos: s.processos.filter((p) => p.id !== processoId), cota: s.cota - 1 },
      ),
    );
  }, []);

  const confirmarDistribuicao = useCallback((criadoPor: string): ListaTrabalho[] => {
    const listasNovas: ListaTrabalho[] = [];

    for (const sugestao of sugestoes) {
      if (sugestao.processos.length === 0) continue;

      const lista = criarLista(
        `${sugestao.servidorNome} — ${formatarDataBR(config.dataInicio)} a ${formatarDataBR(config.dataFim)}`,
        sugestao.servidorId,
        sugestao.servidorNome,
        config.periodo,
        config.dataInicio,
        config.dataFim,
        sugestao.processos,
        criadoPor,
        'importacao_exaudi',
      );

      listasNovas.push(lista);
    }

    setListas(lerListas());
    setEtapa('concluido');
    return listasNovas;
  }, [sugestoes, config]);

  const atualizarProcesso = useCallback((
    listaId: string, processoItemId: string, status: StatusProcessoLista, obs?: string,
  ) => {
    atualizarStatusProcesso(listaId, processoItemId, status, obs);
    setListas(lerListas());
  }, []);

  const cancelarFn = useCallback((listaId: string) => {
    cancelarLista(listaId);
    setListas(lerListas());
  }, []);

  // ── Navegação ─────────────────────────────────────────

  const voltarParaConfiguracao = useCallback(() => {
    setEtapa('configuracao');
    setErro(null);
  }, []);

  const resetar = useCallback(() => {
    setEtapa('configuracao');
    setSugestoes([]);
    setErro(null);
    setConfig({
      modo: 'igualitaria',
      periodo: 'semanal',
      dataInicio: obterDataHojeISO(),
      dataFim: obterDataFimSemanaISO(),
      servidoresSelecionados: [],
      criteriosOrdenacao: CRITERIOS_PADRAO.slice(0, 2),
    });
  }, []);

  const filtrarListasExistentes = useCallback((filtros: FiltrosListaTrabalho) => {
    return filtrarListas(filtros);
  }, []);

  const recarregarListas = useCallback(() => {
    setListas(lerListas());
  }, []);

  return {
    etapa, servidores, processosDisponiveis, config, sugestoes,
    listas, estatisticas, carregando, erro,
    setModo, setPeriodo, setDatas, toggleServidor, reordenarServidor,
    setCotaServidor, setCriterios, adicionarCriterio, removerCriterio,
    gerarSugestao, moverProcesso, removerProcessoDaSugestao,
    confirmarDistribuicao, atualizarProcesso, cancelar: cancelarFn,
    voltarParaConfiguracao, resetar, filtrarListasExistentes, recarregarListas,
  };
}

// ── Utilitários ─────────────────────────────────────────

function obterDataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function obterDataFimSemanaISO(): string {
  const d = new Date();
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? 0 : 7 - dia));
  return d.toISOString().slice(0, 10);
}

function calcularDataFim(inicio: string, periodo: PeriodoLista): string {
  const d = new Date(inicio + 'T00:00:00');
  switch (periodo) {
    case 'semanal':       d.setDate(d.getDate() + 6); break;
    case 'quinzenal':     d.setDate(d.getDate() + 13); break;
    case 'mensal':        d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1); break;
    case 'personalizado': break;
  }
  return d.toISOString().slice(0, 10);
}

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
