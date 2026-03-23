// ============================================================
// lib/distribuicao/dados.ts
// Persistência e dados mock para Listas de Trabalho
// Storage: localStorage (futuro: API)
// Sem dependência de React — puro JS
// ============================================================

import type {
  ListaTrabalho,
  ServidorDistribuicao,
  ProcessoDistribuivel,
  ProcessoNaLista,
  StatusProcessoLista,
  StatusLista,
  EstatisticasDistribuicao,
  FiltrosListaTrabalho,
} from '../../types/distribuicao';
import { calcularProgresso } from './motor';

const STORAGE_KEY_LISTAS = 'forum-hub:listas-trabalho';
const STORAGE_KEY_PROCESSOS = 'forum-hub:processos-importados';

// ── Servidores Mock ─────────────────────────────────────

export const SERVIDORES_MOCK: ServidorDistribuicao[] = [
  { id: 'srv-1', nome: 'Maria Silva',      setor: '1ª Vara Cível', cota: 70,  ativo: true, processosAtribuidos: 0, ordemRecebimento: 1 },
  { id: 'srv-2', nome: 'João Santos',      setor: '1ª Vara Cível', cota: 50,  ativo: true, processosAtribuidos: 0, ordemRecebimento: 2 },
  { id: 'srv-3', nome: 'Ana Costa',        setor: '1ª Vara Cível', cota: 70,  ativo: true, processosAtribuidos: 0, ordemRecebimento: 3 },
  { id: 'srv-4', nome: 'Pedro Oliveira',   setor: '1ª Vara Cível', cota: 100, ativo: true, processosAtribuidos: 0, ordemRecebimento: 4 },
  { id: 'srv-5', nome: 'Carla Mendes',     setor: '1ª Vara Cível', cota: 50,  ativo: true, processosAtribuidos: 0, ordemRecebimento: 5 },
];

// ── Processos Mock (simula importação concluída) ────────

export function gerarProcessosMock(quantidade: number = 200): ProcessoDistribuivel[] {
  const tipos = [
    'Ação de Indenização', 'Ação de Cobrança', 'Execução de Título',
    'Mandado de Segurança', 'Ação Declaratória', 'Cumprimento de Sentença',
    'Monitória', 'Embargos à Execução', 'Ação Revisional',
  ];

  const situacoes = [
    'Aguardando despacho', 'Em andamento', 'Concluso para despacho',
    'Aguardando manifestação', 'Pendente de citação', 'Aguardando perícia',
  ];

  const prioridades = ['alta', 'media', 'baixa'];

  return Array.from({ length: quantidade }, (_, i) => {
    const diasSemMov = Math.floor(Math.random() * 365) + 1;
    const dataBase = new Date();
    dataBase.setDate(dataBase.getDate() - diasSemMov);

    const dia = String(dataBase.getDate()).padStart(2, '0');
    const mes = String(dataBase.getMonth() + 1).padStart(2, '0');
    const ano = dataBase.getFullYear();

    return {
      id: `proc-${i + 1}`,
      numeroProcesso: gerarNumeroCNJ(i),
      dados: {
        numero_processo: gerarNumeroCNJ(i),
        tipo_acao: tipos[i % tipos.length],
        situacao_atual: situacoes[i % situacoes.length],
        dias_sem_mov: String(diasSemMov),
        data_movimentacao: `${dia}/${mes}/${ano}`,
        prioridade: prioridades[i % prioridades.length],
        classe_judicial: `Classe ${(i % 5) + 1}`,
        parte_autora: `Autor ${i + 1}`,
        parte_re: `Réu ${i + 1}`,
      },
      fontId: 'importacao-mock',
      atribuido: false,
    };
  });
}

function gerarNumeroCNJ(indice: number): string {
  const seq = String(indice + 1000).padStart(7, '0');
  const dig = String((indice * 7 + 3) % 100).padStart(2, '0');
  const ano = '2024';
  return `${seq}-${dig}.${ano}.8.05.0001`;
}

// ── Leitura / Escrita de Listas ─────────────────────────

export function lerListas(): ListaTrabalho[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function salvarListas(listas: ListaTrabalho[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LISTAS, JSON.stringify(listas));
}

// ── CRUD de Listas ──────────────────────────────────────

export function criarLista(
  titulo: string,
  servidorId: string,
  servidorNome: string,
  periodo: ListaTrabalho['periodo'],
  dataInicio: string,
  dataFim: string,
  processos: ProcessoDistribuivel[],
  criadoPor: string,
  fonte: ListaTrabalho['fonte'],
): ListaTrabalho {
  const agora = new Date().toISOString();

  const processosNaLista: ProcessoNaLista[] = processos.map((p) => ({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processoId: p.id,
    numeroProcesso: p.numeroProcesso,
    dados: p.dados,
    status: 'pendente' as StatusProcessoLista,
    atualizadoEm: agora,
  }));

  const lista: ListaTrabalho = {
    id: `lista-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    titulo,
    periodo,
    dataInicio,
    dataFim,
    servidorId,
    servidorNome,
    cota: processosNaLista.length,
    status: 'ativa',
    fonte,
    processos: processosNaLista,
    criadoPor,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const listas = lerListas();
  listas.push(lista);
  salvarListas(listas);

  return lista;
}

export function atualizarStatusProcesso(
  listaId: string,
  processoItemId: string,
  novoStatus: StatusProcessoLista,
  observacao?: string,
): ListaTrabalho | null {
  const listas = lerListas();
  const idx = listas.findIndex((l) => l.id === listaId);
  if (idx === -1) return null;

  const lista = { ...listas[idx] };
  const processos = lista.processos.map((p) => {
    if (p.id !== processoItemId) return p;
    return {
      ...p,
      status: novoStatus,
      observacao: observacao || p.observacao,
      atualizadoEm: new Date().toISOString(),
      concluidoEm: novoStatus === 'concluido' ? new Date().toISOString() : p.concluidoEm,
    };
  });

  lista.processos = processos;
  lista.atualizadoEm = new Date().toISOString();

  // Auto-concluir lista se todos os processos concluídos
  const progresso = calcularProgresso(processos);
  if (progresso.percentual === 100) {
    lista.status = 'concluida';
    lista.concluidaEm = new Date().toISOString();
  }

  listas[idx] = lista;
  salvarListas(listas);

  return lista;
}

export function cancelarLista(listaId: string): boolean {
  const listas = lerListas();
  const idx = listas.findIndex((l) => l.id === listaId);
  if (idx === -1) return false;

  listas[idx] = {
    ...listas[idx],
    status: 'cancelada',
    atualizadoEm: new Date().toISOString(),
  };
  salvarListas(listas);
  return true;
}

// ── Consultas ───────────────────────────────────────────

export function obterListaPorId(id: string): ListaTrabalho | null {
  return lerListas().find((l) => l.id === id) || null;
}

export function obterListasDoServidor(servidorId: string): ListaTrabalho[] {
  return lerListas().filter((l) => l.servidorId === servidorId && l.status === 'ativa');
}

export function filtrarListas(filtros: FiltrosListaTrabalho): ListaTrabalho[] {
  return lerListas().filter((lista) => {
    if (filtros.servidorId !== 'todos' && lista.servidorId !== filtros.servidorId) return false;
    if (filtros.status !== 'todos' && lista.status !== filtros.status) return false;
    if (filtros.periodo !== 'todos' && lista.periodo !== filtros.periodo) return false;
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      const match =
        lista.titulo.toLowerCase().includes(termo) ||
        lista.servidorNome.toLowerCase().includes(termo) ||
        lista.processos.some((p) => p.numeroProcesso.includes(termo));
      if (!match) return false;
    }
    return true;
  });
}

export function calcularEstatisticas(): EstatisticasDistribuicao {
  const listas = lerListas();
  const ativas = listas.filter((l) => l.status === 'ativa');
  const concluidas = listas.filter((l) => l.status === 'concluida');

  const totalProcessos = listas.reduce((sum, l) => sum + l.processos.length, 0);
  const totalConcluidos = listas.reduce(
    (sum, l) => sum + l.processos.filter((p) => p.status === 'concluido').length,
    0,
  );

  const percentuais = ativas.map((l) => calcularProgresso(l.processos).percentual);
  const mediaPercentual = percentuais.length > 0
    ? Math.round(percentuais.reduce((sum, p) => sum + p, 0) / percentuais.length)
    : 0;

  return {
    totalListas: listas.length,
    listasAtivas: ativas.length,
    listasConcluidas: concluidas.length,
    totalProcessosDistribuidos: totalProcessos,
    totalProcessosConcluidos: totalConcluidos,
    mediaPercentualConclusao: mediaPercentual,
    servidoresComAtraso: 0, // TODO: calcular baseado em datas
  };
}
