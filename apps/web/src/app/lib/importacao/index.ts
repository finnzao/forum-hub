// ============================================================
// lib/importacao/index.ts
// Barrel export — ponto de entrada único para a lib
// ============================================================

export { parsearArquivo, validarArquivo, detectarFormato } from './parser';
export { sugerirMapeamento, aplicarMapeamento } from './mapeador';
export { validarRegistros } from './validador';
export {
  listarPadroes,
  obterPadrao,
  criarPadrao,
  atualizarPadrao,
  removerPadrao,
  aplicarPadrao,
} from './padroes';
