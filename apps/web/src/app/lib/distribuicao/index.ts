// ============================================================
// lib/distribuicao/index.ts
// Barrel export — ponto de entrada único para a lib
// ============================================================

export {
  ordenarProcessos,
  distribuirPorOrdem,
  gerarSugestaoDistribuicao,
  calcularProgresso,
  CRITERIOS_PADRAO,
  CRITERIOS_DISPONIVEIS,
} from './motor';

export {
  SERVIDORES_MOCK,
  gerarProcessosMock,
  lerListas,
  salvarListas,
  criarLista,
  atualizarStatusProcesso,
  cancelarLista,
  obterListaPorId,
  obterListasDoServidor,
  filtrarListas,
  calcularEstatisticas,
} from './dados';
