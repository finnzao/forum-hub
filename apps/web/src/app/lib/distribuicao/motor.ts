// ============================================================
// lib/distribuicao/motor.ts
// Motor de distribuição de processos
// Lógica pura: ordenação por prioridade, divisão sequencial
// O servidor na posição 1 recebe os primeiros (mais prioritários)
// ============================================================

import type {
  ProcessoDistribuivel,
  ServidorDistribuicao,
  CriterioOrdenacao,
  SugestaoDistribuicao,
  ConfiguracaoDistribuicao,
} from '../../types/distribuicao';
import type { CampoSistema } from '../../types/importacao';

// ── Ordenação de Processos ──────────────────────────────

/**
 * Ordena processos com base em múltiplos critérios de prioridade.
 * O primeiro critério é o mais importante (tie-breaking pelos seguintes).
 */
export function ordenarProcessos(
  processos: ProcessoDistribuivel[],
  criterios: CriterioOrdenacao[],
): ProcessoDistribuivel[] {
  if (criterios.length === 0) return [...processos];

  return [...processos].sort((a, b) => {
    for (const criterio of criterios) {
      const valorA = a.dados[criterio.campo] || '';
      const valorB = b.dados[criterio.campo] || '';

      let comparacao = compararValores(valorA, valorB, criterio.campo);
      if (criterio.direcao === 'desc') comparacao = -comparacao;

      if (comparacao !== 0) return comparacao;
    }
    return 0;
  });
}

function compararValores(a: string, b: string, campo: CampoSistema): number {
  if (campo === 'dias_sem_mov') {
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  }

  if (campo === 'data_movimentacao') {
    return parsearDataBR(a) - parsearDataBR(b);
  }

  if (campo === 'prioridade') {
    const ordem: Record<string, number> = {
      alta: 3, urgente: 3, media: 2, média: 2, normal: 2, baixa: 1,
    };
    return (ordem[a.toLowerCase()] || 0) - (ordem[b.toLowerCase()] || 0);
  }

  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function parsearDataBR(dataStr: string): number {
  const match = dataStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const ano = parseInt(match[3], 10);
    return new Date(ano < 100 ? 2000 + ano : ano, parseInt(match[2], 10) - 1, parseInt(match[1], 10)).getTime();
  }
  const ts = Date.parse(dataStr);
  return isNaN(ts) ? 0 : ts;
}

// ── Distribuição ────────────────────────────────────────

/**
 * Distribui processos sequencialmente na ordem de prioridade dos servidores.
 *
 * Fluxo:
 * 1. Processos são ordenados por critérios (ex: mais dias sem mov primeiro)
 * 2. Servidores são ordenados por `ordemRecebimento`
 * 3. Servidor 1° na fila recebe os PRIMEIROS processos (mais prioritários)
 * 4. Servidor 2° recebe os seguintes, e assim por diante
 *
 * Modo igualitário: quantidade igual para todos
 * Modo por cota: cada servidor recebe sua cota específica
 */
export function distribuirPorOrdem(
  processos: ProcessoDistribuivel[],
  servidores: ServidorDistribuicao[],
  cotasPersonalizadas?: Record<string, number>,
  modoIgualitario: boolean = true,
): SugestaoDistribuicao[] {
  if (servidores.length === 0) return [];

  // Ordenar servidores pela ordem de recebimento
  const servidoresOrdenados = [...servidores].sort((a, b) => a.ordemRecebimento - b.ordemRecebimento);

  // Calcular quantidade por servidor
  let cotas: { servidor: ServidorDistribuicao; quantidade: number }[];

  if (modoIgualitario) {
    const qtdPorServidor = Math.floor(processos.length / servidoresOrdenados.length);
    const resto = processos.length % servidoresOrdenados.length;

    cotas = servidoresOrdenados.map((s, idx) => ({
      servidor: s,
      quantidade: qtdPorServidor + (idx < resto ? 1 : 0),
    }));
  } else {
    // Por cota individual
    const totalCotas = servidoresOrdenados.reduce(
      (sum, s) => sum + (cotasPersonalizadas?.[s.id] ?? s.cota),
      0,
    );

    cotas = servidoresOrdenados.map((s) => {
      const cotaOriginal = cotasPersonalizadas?.[s.id] ?? s.cota;
      // Se menos processos que cotas, ajustar proporcionalmente
      const cotaAjustada = processos.length < totalCotas
        ? Math.round((cotaOriginal / totalCotas) * processos.length)
        : cotaOriginal;
      return { servidor: s, quantidade: cotaAjustada };
    });
  }

  // Distribuir sequencialmente: servidor 1° pega os primeiros
  let cursor = 0;

  return cotas.map(({ servidor, quantidade }) => {
    const qtdFinal = Math.min(quantidade, processos.length - cursor);
    const processosDoServidor = processos.slice(cursor, cursor + qtdFinal);
    cursor += qtdFinal;

    return {
      servidorId: servidor.id,
      servidorNome: servidor.nome,
      ordemRecebimento: servidor.ordemRecebimento,
      cota: qtdFinal,
      processos: processosDoServidor,
    };
  });
}

/**
 * Função principal: gera sugestão completa de distribuição.
 * 1. Filtra não-atribuídos
 * 2. Ordena processos por critérios de prioridade
 * 3. Distribui na ordem dos servidores (1° recebe os mais prioritários)
 */
export function gerarSugestaoDistribuicao(
  processos: ProcessoDistribuivel[],
  config: ConfiguracaoDistribuicao,
): SugestaoDistribuicao[] {
  const disponiveis = processos.filter((p) => !p.atribuido);
  const ordenados = ordenarProcessos(disponiveis, config.criteriosOrdenacao);

  return distribuirPorOrdem(
    ordenados,
    config.servidoresSelecionados,
    config.cotaPersonalizada,
    config.modo === 'igualitaria',
  );
}

// ── Cálculos de Progresso ───────────────────────────────

export function calcularProgresso(processos: Array<{ status: string }>): {
  total: number;
  pendentes: number;
  emAndamento: number;
  concluidos: number;
  percentual: number;
} {
  const total = processos.length;
  const concluidos = processos.filter((p) => p.status === 'concluido').length;
  const emAndamento = processos.filter((p) => p.status === 'em_andamento').length;
  const pendentes = total - concluidos - emAndamento;

  return {
    total,
    pendentes,
    emAndamento,
    concluidos,
    percentual: total > 0 ? Math.round((concluidos / total) * 100) : 0,
  };
}

// ── Critérios Padrão ────────────────────────────────────

export const CRITERIOS_PADRAO: CriterioOrdenacao[] = [
  { campo: 'dias_sem_mov',      direcao: 'desc', rotulo: 'Mais dias sem movimentação primeiro' },
  { campo: 'data_movimentacao', direcao: 'asc',  rotulo: 'Mais antigos primeiro' },
  { campo: 'prioridade',        direcao: 'desc', rotulo: 'Maior prioridade primeiro' },
];

export const CRITERIOS_DISPONIVEIS: CriterioOrdenacao[] = [
  { campo: 'dias_sem_mov',      direcao: 'desc', rotulo: 'Dias sem movimentação (maior → menor)' },
  { campo: 'dias_sem_mov',      direcao: 'asc',  rotulo: 'Dias sem movimentação (menor → maior)' },
  { campo: 'data_movimentacao', direcao: 'asc',  rotulo: 'Data de movimentação (mais antigo)' },
  { campo: 'data_movimentacao', direcao: 'desc', rotulo: 'Data de movimentação (mais recente)' },
  { campo: 'prioridade',        direcao: 'desc', rotulo: 'Prioridade (alta → baixa)' },
  { campo: 'prioridade',        direcao: 'asc',  rotulo: 'Prioridade (baixa → alta)' },
  { campo: 'numero_processo',   direcao: 'asc',  rotulo: 'Nº do processo (A → Z)' },
  { campo: 'numero_processo',   direcao: 'desc', rotulo: 'Nº do processo (Z → A)' },
  { campo: 'tipo_acao',         direcao: 'asc',  rotulo: 'Tipo de ação (A → Z)' },
  { campo: 'classe_judicial',   direcao: 'asc',  rotulo: 'Classe judicial (A → Z)' },
  { campo: 'situacao_atual',    direcao: 'asc',  rotulo: 'Situação atual (A → Z)' },
];
