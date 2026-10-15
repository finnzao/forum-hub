// ============================================================
// lib/cnj.ts
// Número CNJ e filtro de dígito — funções puras, sem React
// Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
//
// Destino final: packages/shared (ARQUITETURA.md, seção 6).
// A configuração de dígito vive no perfil do usuário e a
// filtragem é feita no cliente — por isso nada aqui toca banco.
// ============================================================

// ── Parse ───────────────────────────────────────────────

export interface CNJParseado {
  /** 20 dígitos, sem máscara */
  digitos: string;
  /** NNNNNNN */
  sequencial: string;
  /** DD */
  dv: string;
  /** 1º dígito verificador */
  dv1: number;
  /** 2º dígito verificador */
  dv2: number;
  /** AAAA */
  ano: number;
  /** J */
  justica: string;
  /** TR */
  tribunal: string;
  /** OOOO */
  origem: string;
  /** Último número da sequência (antes do hífen). É o "dígito de distribuição" do painel do PJE. */
  ultimoSequencial: number;
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarCNJ(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 20);
  if (d.length !== 20) return valor;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

export function parsearCNJ(valor: string): CNJParseado | null {
  const d = somenteDigitos(valor);
  if (d.length !== 20) return null;
  const sequencial = d.slice(0, 7);
  const dv = d.slice(7, 9);
  return {
    digitos: d,
    sequencial,
    dv,
    dv1: Number(dv[0]),
    dv2: Number(dv[1]),
    ano: Number(d.slice(9, 13)),
    justica: d.slice(13, 14),
    tribunal: d.slice(14, 16),
    origem: d.slice(16, 20),
    ultimoSequencial: Number(sequencial[6]),
  };
}

// ── Filtro de dígito ────────────────────────────────────

export type EixoDigito = 'dv1' | 'dv2' | 'ano' | 'ultimo_seq';

/**
 * Configuração do servidor. Eixo ausente ou vazio = sem restrição naquele eixo.
 * Dentro do eixo: OU. Entre eixos: E.
 */
export type FiltroDigito = Partial<Record<EixoDigito, number[]>>;

export const EIXOS_DIGITO: { eixo: EixoDigito; rotulo: string; descricao: string }[] = [
  { eixo: 'dv1',        rotulo: '1º dígito verificador',                 descricao: 'Primeiro algarismo depois do hífen' },
  { eixo: 'dv2',        rotulo: '2º dígito verificador',                 descricao: 'Segundo algarismo depois do hífen' },
  { eixo: 'ano',        rotulo: 'Ano',                                   descricao: 'Ano de autuação do processo' },
  { eixo: 'ultimo_seq', rotulo: 'Último nº da sequência (antes do hífen)', descricao: 'Dígito de distribuição usado pelo painel do PJE' },
];

export const ROTULO_EIXO: Record<EixoDigito, string> = Object.fromEntries(
  EIXOS_DIGITO.map((e) => [e.eixo, e.rotulo]),
) as Record<EixoDigito, string>;

export const PARES = [0, 2, 4, 6, 8];
export const IMPARES = [1, 3, 5, 7, 9];
export const ANOS_DISPONIVEIS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function valorDoEixo(cnj: CNJParseado, eixo: EixoDigito): number {
  switch (eixo) {
    case 'dv1':        return cnj.dv1;
    case 'dv2':        return cnj.dv2;
    case 'ano':        return cnj.ano;
    case 'ultimo_seq': return cnj.ultimoSequencial;
  }
}

export function filtroVazio(filtro: FiltroDigito | undefined | null): boolean {
  if (!filtro) return true;
  return EIXOS_DIGITO.every(({ eixo }) => !filtro[eixo] || filtro[eixo]!.length === 0);
}

/** Processo casa com o filtro? Filtro vazio casa com tudo. */
export function casaFiltroDigito(numero: string, filtro: FiltroDigito | undefined | null): boolean {
  if (filtroVazio(filtro)) return true;
  const cnj = parsearCNJ(numero);
  if (!cnj) return false;
  for (const { eixo } of EIXOS_DIGITO) {
    const valores = filtro![eixo];
    if (!valores || valores.length === 0) continue;
    if (!valores.includes(valorDoEixo(cnj, eixo))) return false;
  }
  return true;
}

/** Texto curto para exibir a configuração: "Último nº: 0, 1 · Ano: 2024" */
export function descreverFiltro(filtro: FiltroDigito | undefined | null): string {
  if (filtroVazio(filtro)) return 'Sem filtro de dígito (vê todo o acervo)';
  const partes: string[] = [];
  for (const { eixo, rotulo } of EIXOS_DIGITO) {
    const v = filtro![eixo];
    if (!v || v.length === 0) continue;
    const curto = eixo === 'ultimo_seq' ? 'Último nº' : eixo === 'dv1' ? '1º DV' : eixo === 'dv2' ? '2º DV' : rotulo;
    partes.push(`${curto}: ${[...v].sort((a, b) => a - b).join(', ')}`);
  }
  return partes.join(' · ');
}

export function alternarValor(filtro: FiltroDigito, eixo: EixoDigito, valor: number): FiltroDigito {
  const atual = filtro[eixo] ?? [];
  const novo = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
  return { ...filtro, [eixo]: novo };
}

export function definirValores(filtro: FiltroDigito, eixo: EixoDigito, valores: number[]): FiltroDigito {
  return { ...filtro, [eixo]: [...valores] };
}

// ── Cobertura (tela do chefe) ───────────────────────────

export interface CoberturaValor {
  valor: number;
  responsaveis: string[];
}

/**
 * Para um eixo, quem cobre cada valor possível.
 * Usuário sem restrição no eixo não conta como responsável daquele eixo
 * (ele cobre "tudo", o que não é uma atribuição).
 */
export function calcularCobertura(
  usuarios: { nome: string; filtro: FiltroDigito | undefined }[],
  eixo: EixoDigito,
): CoberturaValor[] {
  const valores = eixo === 'ano' ? ANOS_DISPONIVEIS : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return valores.map((valor) => ({
    valor,
    responsaveis: usuarios
      .filter((u) => u.filtro?.[eixo]?.includes(valor))
      .map((u) => u.nome),
  }));
}
