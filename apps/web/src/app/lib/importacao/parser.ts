// ============================================================
// lib/importacao/parser.ts
// Motor de parsing para XLSX e CSV
// Responsabilidade única: arquivo → dados estruturados
// Sem dependência de React ou UI
// ============================================================

import type { FormatoArquivo, ResultadoParsing } from '../../types/importacao';

/** Detecta formato pelo nome/extensão do arquivo */
export function detectarFormato(nomeArquivo: string): FormatoArquivo | null {
  const ext = nomeArquivo.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  return null;
}

/** Valida se o arquivo tem formato e tamanho aceitáveis */
export function validarArquivo(arquivo: File): { valido: boolean; erro?: string } {
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

  const formato = detectarFormato(arquivo.name);
  if (!formato) {
    return { valido: false, erro: 'Formato não suportado. Use arquivos .xlsx ou .csv' };
  }

  if (arquivo.size > MAX_SIZE) {
    return { valido: false, erro: `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). Máximo: 20 MB` };
  }

  if (arquivo.size === 0) {
    return { valido: false, erro: 'Arquivo está vazio' };
  }

  return { valido: true };
}

/** Lê e parseia arquivo CSV a partir de texto */
function parsearCSV(texto: string): { cabecalho: string[]; linhas: string[][] } {
  const linhasBrutas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (linhasBrutas.length === 0) {
    return { cabecalho: [], linhas: [] };
  }

  // Detectar separador: ; é mais comum em CSVs brasileiros
  const primeiraLinha = linhasBrutas[0];
  const countVirgula = (primeiraLinha.match(/,/g) || []).length;
  const countPontoVirgula = (primeiraLinha.match(/;/g) || []).length;
  const countTab = (primeiraLinha.match(/\t/g) || []).length;

  let separador = ',';
  if (countPontoVirgula > countVirgula && countPontoVirgula > countTab) separador = ';';
  else if (countTab > countVirgula && countTab > countPontoVirgula) separador = '\t';

  const parsearLinha = (linha: string): string[] => {
    const campos: string[] = [];
    let atual = '';
    let dentroAspas = false;

    for (let i = 0; i < linha.length; i++) {
      const ch = linha[i];
      if (ch === '"') {
        if (dentroAspas && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else {
          dentroAspas = !dentroAspas;
        }
      } else if (ch === separador && !dentroAspas) {
        campos.push(atual.trim());
        atual = '';
      } else {
        atual += ch;
      }
    }
    campos.push(atual.trim());
    return campos;
  };

  const cabecalho = parsearLinha(linhasBrutas[0]);
  const linhas = linhasBrutas.slice(1).map(parsearLinha);

  return { cabecalho, linhas };
}

/** Lê e parseia arquivo XLSX usando SheetJS (pacote 'xlsx' no npm) */
async function parsearXLSX(buffer: ArrayBuffer): Promise<{ cabecalho: string[]; linhas: string[][] }> {
  // Import dinâmico — só carrega quando necessário (code-splitting)
  const mod = await import('xlsx').catch(() => null);
  const XLSX = mod?.default ?? mod;

  if (!XLSX || !XLSX.read) {
    throw new Error(
      'Biblioteca xlsx (SheetJS) não encontrada. Execute: pnpm add xlsx'
    );
  }

  const workbook = XLSX.read(buffer, { type: 'array' });
  const primeiraAba = workbook.SheetNames[0];

  if (!primeiraAba) {
    throw new Error('Planilha está vazia — nenhuma aba encontrada');
  }

  const sheet = workbook.Sheets[primeiraAba];
  const dadosJson: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    rawNumbers: false,
  });

  if (dadosJson.length === 0) {
    return { cabecalho: [], linhas: [] };
  }

  const cabecalho = dadosJson[0].map((c: unknown) => String(c).trim());
  const linhas = dadosJson.slice(1).map((row: unknown[]) =>
    row.map((cell) => String(cell ?? '').trim())
  );

  return { cabecalho, linhas };
}

/**
 * Função principal de parsing — aceita File e retorna dados estruturados.
 * Detecta formato automaticamente e delega ao parser correto.
 */
export async function parsearArquivo(arquivo: File): Promise<ResultadoParsing> {
  const formato = detectarFormato(arquivo.name);

  if (!formato) {
    throw new Error('Formato de arquivo não suportado');
  }

  let cabecalho: string[];
  let linhas: string[][];

  if (formato === 'csv') {
    const texto = await arquivo.text();
    const resultado = parsearCSV(texto);
    cabecalho = resultado.cabecalho;
    linhas = resultado.linhas;
  } else {
    const buffer = await arquivo.arrayBuffer();
    const resultado = await parsearXLSX(buffer);
    cabecalho = resultado.cabecalho;
    linhas = resultado.linhas;
  }

  // Remover linhas completamente vazias
  const linhasFiltradas = linhas.filter((row) => row.some((cell) => cell.length > 0));

  return {
    nomeArquivo: arquivo.name,
    formato,
    totalLinhas: linhasFiltradas.length,
    colunasOriginais: cabecalho,
    dadosBrutos: linhasFiltradas,
    cabecalho,
  };
}
