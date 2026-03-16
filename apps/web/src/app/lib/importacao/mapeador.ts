// ============================================================
// lib/importacao/mapeador.ts
// Lógica de mapeamento de colunas: arquivo → sistema
// Responsabilidade: sugerir mapeamento + aplicar mapeamento
// ============================================================

import type {
  CampoSistema,
  MapeamentoColuna,
  ResultadoParsing,
  CAMPOS_SISTEMA,
} from '../../types/importacao';

/**
 * Padrões de nomes de colunas do Exaudi e outras fontes.
 * Cada campo do sistema tem uma lista de variações conhecidas (lowercase).
 * Quanto mais variações cadastradas, melhor o automapeamento.
 */
const PADROES_COLUNA: Record<CampoSistema, string[]> = {
  numero_processo: [
    'processo', 'nº processo', 'num processo', 'numero processo', 'nº do processo',
    'numero do processo', 'num. processo', 'n processo', 'processo nº', 'npu',
    'número', 'numero', 'proc', 'nº proc', 'num_processo', 'numero_processo',
  ],
  data_movimentacao: [
    'data', 'data movimentação', 'data movimentacao', 'dt movimentação', 'dt mov',
    'data ultima movimentacao', 'última movimentação', 'data mov', 'dt_mov',
    'data_movimentacao', 'data último movimento', 'dt último mov',
  ],
  tipo_acao: [
    'tipo', 'tipo ação', 'tipo acao', 'tipo de ação', 'ação', 'acao',
    'tipo_acao', 'classe', 'tipo processo', 'natureza',
  ],
  situacao_atual: [
    'situação', 'situacao', 'situação atual', 'status', 'fase', 'etapa',
    'situacao_atual', 'situação processual', 'estado', 'andamento',
  ],
  classe_judicial: [
    'classe judicial', 'classe', 'classe processual', 'classe_judicial',
    'tipo classe', 'classe/competência',
  ],
  assunto: [
    'assunto', 'assunto principal', 'assunto processo', 'assunto_principal',
    'matéria', 'tema',
  ],
  comarca: [
    'comarca', 'foro', 'jurisdição', 'localidade', 'cidade',
  ],
  vara: [
    'vara', 'unidade', 'órgão julgador', 'orgao julgador', 'setor',
    'vara/gabinete', 'gabinete',
  ],
  parte_autora: [
    'autor', 'autora', 'parte autora', 'requerente', 'exequente',
    'polo ativo', 'parte_autora', 'impetrante', 'reclamante',
  ],
  parte_re: [
    'réu', 'reu', 'ré', 're', 'parte ré', 'requerido', 'executado',
    'polo passivo', 'parte_re', 'impetrado', 'reclamado',
  ],
  advogado: [
    'advogado', 'advogados', 'representante', 'procurador', 'defensor',
    'advogado(s)', 'adv',
  ],
  prioridade: [
    'prioridade', 'urgência', 'urgencia', 'grau prioridade', 'nivel',
  ],
  observacao: [
    'observação', 'observacao', 'obs', 'nota', 'notas', 'comentário',
    'comentario', 'anotação', 'anotacao',
  ],
  ignorar: [],
};

/**
 * Normaliza string para comparação: lowercase, sem acentos, sem espaços extras.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Calcula score de similaridade entre nome de coluna e padrões conhecidos.
 * Retorna valor de 0 (nenhuma semelhança) a 1 (match exato).
 */
function calcularSimilaridade(nomeColuna: string, padroes: string[]): number {
  const normalizado = normalizar(nomeColuna);

  for (const padrao of padroes) {
    const padraoNorm = normalizar(padrao);

    // Match exato
    if (normalizado === padraoNorm) return 1;

    // Coluna contém o padrão ou vice-versa
    if (normalizado.includes(padraoNorm) || padraoNorm.includes(normalizado)) {
      return 0.8;
    }
  }

  return 0;
}

/**
 * Sugere automaticamente o mapeamento de colunas baseado nos nomes.
 * Cada coluna recebe o campo do sistema com maior score, ou 'ignorar' se nenhum match.
 */
export function sugerirMapeamento(parsing: ResultadoParsing): MapeamentoColuna[] {
  const camposUsados = new Set<CampoSistema>();

  return parsing.cabecalho.map((coluna) => {
    let melhorCampo: CampoSistema = 'ignorar';
    let melhorScore = 0;

    for (const [campo, padroes] of Object.entries(PADROES_COLUNA)) {
      if (campo === 'ignorar') continue;
      if (camposUsados.has(campo as CampoSistema)) continue; // cada campo só pode ser usado uma vez

      const score = calcularSimilaridade(coluna, padroes);
      if (score > melhorScore) {
        melhorScore = score;
        melhorCampo = campo as CampoSistema;
      }
    }

    // Threshold mínimo de confiança
    if (melhorScore < 0.5) {
      melhorCampo = 'ignorar';
    } else {
      camposUsados.add(melhorCampo);
    }

    // Amostra: primeiras 3 linhas daquela coluna
    const idxColuna = parsing.cabecalho.indexOf(coluna);
    const amostra = parsing.dadosBrutos
      .slice(0, 3)
      .map((row) => row[idxColuna] || '')
      .filter((v) => v.length > 0);

    return {
      colunaOriginal: coluna,
      campoSistema: melhorCampo,
      amostra,
    };
  });
}

/**
 * Aplica o mapeamento aos dados brutos, transformando em registros com campos do sistema.
 * Retorna array de objetos { campo_sistema: valor }.
 */
export function aplicarMapeamento(
  parsing: ResultadoParsing,
  mapeamento: MapeamentoColuna[],
): Record<string, string>[] {
  const indicePorCampo = new Map<CampoSistema, number>();

  mapeamento.forEach((m) => {
    if (m.campoSistema !== 'ignorar') {
      const idx = parsing.cabecalho.indexOf(m.colunaOriginal);
      if (idx >= 0) {
        indicePorCampo.set(m.campoSistema, idx);
      }
    }
  });

  return parsing.dadosBrutos.map((row) => {
    const registro: Record<string, string> = {};

    for (const [campo, idx] of indicePorCampo) {
      registro[campo] = (row[idx] || '').trim();
    }

    return registro;
  });
}
