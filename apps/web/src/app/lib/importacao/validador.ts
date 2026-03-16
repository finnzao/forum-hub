// ============================================================
// lib/importacao/validador.ts
// Validação de registros importados
// Responsabilidade: detectar duplicatas, incompletos, erros
// ============================================================

import type {
  RegistroImportado,
  ResultadoValidacao,
  StatusRegistro,
  MapeamentoColuna,
  CAMPOS_SISTEMA,
} from '../../types/importacao';
import { CAMPOS_SISTEMA as CAMPOS } from '../../types/importacao';

/** Regex simplificado para número de processo CNJ */
const REGEX_PROCESSO_CNJ = /^\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}$/;

/** Regex mais flexível: aceita com ou sem pontuação */
const REGEX_PROCESSO_FLEXIVEL = /^\d{7,20}[-.]?\d{0,2}[.]?\d{0,4}[.]?\d{0,2}[.]?\d{0,2}[.]?\d{0,4}$/;

/**
 * Verifica se uma string representa uma data válida.
 * Aceita os formatos mais comuns em planilhas brasileiras:
 *   - DD/MM/AAAA (padrão BR)
 *   - DD-MM-AAAA
 *   - AAAA-MM-DD (ISO)
 *   - DD/MM/AA
 *   - Número serial do Excel (ex: 46052)
 *   - Qualquer string que Date.parse() consiga interpretar
 */
function ehDataValida(valor: string): boolean {
  // 1) Formato BR: DD/MM/AAAA ou DD-MM-AAAA ou DD.MM.AAAA
  const regexBR = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;
  const matchBR = valor.match(regexBR);
  if (matchBR) {
    const dia = parseInt(matchBR[1], 10);
    const mes = parseInt(matchBR[2], 10);
    const ano = parseInt(matchBR[3], 10);
    // Validação básica de ranges
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 && ano >= 1) {
      return true;
    }
  }

  // 2) Formato ISO: AAAA-MM-DD
  const regexISO = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/;
  if (regexISO.test(valor)) {
    return true;
  }

  // 3) Número serial do Excel (inteiro positivo entre 1 e 99999)
  const serial = Number(valor);
  if (!isNaN(serial) && serial > 0 && serial < 100000 && Number.isInteger(serial)) {
    return true;
  }

  // 4) Fallback: Date.parse consegue interpretar
  if (!isNaN(Date.parse(valor))) {
    return true;
  }

  return false;
}

/**
 * Valida um único registro e retorna status + erros encontrados.
 */
function validarRegistro(
  dados: Record<string, string>,
  mapeamento: MapeamentoColuna[],
): { status: StatusRegistro; erros: string[] } {
  const erros: string[] = [];

  // Verificar campos obrigatórios
  const camposObrigatorios = CAMPOS.filter((c) => c.obrigatorio);

  for (const config of camposObrigatorios) {
    const mapeado = mapeamento.some((m) => m.campoSistema === config.campo);
    if (!mapeado) continue; // campo não mapeado, não exigir

    const valor = dados[config.campo];
    if (!valor || valor.trim().length === 0) {
      erros.push(`${config.rotulo} está vazio`);
    }
  }

  // Validar formato do número do processo (se mapeado)
  const numProcesso = dados['numero_processo'];
  if (numProcesso && numProcesso.trim().length > 0) {
    if (!REGEX_PROCESSO_FLEXIVEL.test(numProcesso.replace(/\s/g, ''))) {
      erros.push('Formato do nº do processo pode estar incorreto');
    }
  }

  // Validar data (se mapeada)
  const dataStr = dados['data_movimentacao'];
  if (dataStr && dataStr.trim().length > 0) {
    const dataValida = ehDataValida(dataStr.trim());
    if (!dataValida) {
      erros.push('Formato de data não reconhecido');
    }
  }

  // Determinar status
  let status: StatusRegistro = 'valido';
  if (erros.length > 0) {
    const temObrigatorioVazio = erros.some((e) => e.includes('está vazio'));
    status = temObrigatorioVazio ? 'incompleto' : 'erro';
  }

  return { status, erros };
}

/**
 * Detecta registros duplicados pelo número do processo.
 * Marca o segundo (e subsequentes) como duplicados.
 */
function marcarDuplicatas(registros: RegistroImportado[]): void {
  const vistos = new Map<string, number>(); // processo → indice do primeiro

  for (const reg of registros) {
    const processo = reg.dados['numero_processo']?.trim().toLowerCase();
    if (!processo) continue;

    if (vistos.has(processo)) {
      reg.status = 'duplicado';
      reg.erros.push(`Processo duplicado (mesmo que linha ${vistos.get(processo)! + 1})`);
    } else {
      vistos.set(processo, reg.indice);
    }
  }
}

/**
 * Função principal de validação.
 * Recebe dados mapeados e retorna registros validados com resumo.
 */
export function validarRegistros(
  dadosMapeados: Record<string, string>[],
  mapeamento: MapeamentoColuna[],
): ResultadoValidacao {
  const registros: RegistroImportado[] = dadosMapeados.map((dados, idx) => {
    const { status, erros } = validarRegistro(dados, mapeamento);

    return {
      id: `reg-${idx}-${Date.now()}`,
      indice: idx,
      dados,
      status,
      erros,
      selecionado: status === 'valido', // pré-seleciona apenas válidos
    };
  });

  // Marcar duplicatas (sobrescreve status se necessário)
  marcarDuplicatas(registros);

  // Calcular resumo
  const resumo = {
    total: registros.length,
    validos: registros.filter((r) => r.status === 'valido').length,
    incompletos: registros.filter((r) => r.status === 'incompleto').length,
    duplicados: registros.filter((r) => r.status === 'duplicado').length,
    erros: registros.filter((r) => r.status === 'erro').length,
  };

  return { registros, resumo };
}
