// ============================================================
// lib/importacao/validador.ts
// Validação de registros importados
// Responsabilidade: detectar duplicatas, incompletos, erros
// CORREÇÃO: mensagens de erro agora indicam o nome da coluna
// ============================================================

import type {
  RegistroImportado,
  ResultadoValidacao,
  StatusRegistro,
  MapeamentoColuna,
} from '../../types/importacao';
import { CAMPOS_SISTEMA } from '../../types/importacao';

/** Regex mais flexível: aceita com ou sem pontuação */
const REGEX_PROCESSO_FLEXIVEL = /^\d{7,20}[-.]?\d{0,2}[.]?\d{0,4}[.]?\d{0,2}[.]?\d{0,2}[.]?\d{0,4}$/;

/**
 * Verifica se uma string representa uma data válida.
 */
function ehDataValida(valor: string): boolean {
  const regexBR = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;
  const matchBR = valor.match(regexBR);
  if (matchBR) {
    const dia = parseInt(matchBR[1], 10);
    const mes = parseInt(matchBR[2], 10);
    const ano = parseInt(matchBR[3], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 && ano >= 1) {
      return true;
    }
  }

  const regexISO = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/;
  if (regexISO.test(valor)) return true;

  const serial = Number(valor);
  if (!isNaN(serial) && serial > 0 && serial < 100000 && Number.isInteger(serial)) {
    return true;
  }

  if (!isNaN(Date.parse(valor))) return true;

  return false;
}

/**
 * Obtém o rótulo legível de um campo do sistema.
 */
function obterRotuloCampo(campo: string): string {
  const config = CAMPOS_SISTEMA.find((c) => c.campo === campo);
  return config?.rotulo || campo;
}

/**
 * Valida um único registro e retorna status + erros com nome da coluna.
 */
function validarRegistro(
  dados: Record<string, string>,
  mapeamento: MapeamentoColuna[],
): { status: StatusRegistro; erros: string[] } {
  const erros: string[] = [];

  // Verificar campos obrigatórios
  const camposObrigatorios = CAMPOS_SISTEMA.filter((c) => c.obrigatorio);

  for (const config of camposObrigatorios) {
    const mapeado = mapeamento.some((m) => m.campoSistema === config.campo);
    if (!mapeado) continue;

    const valor = dados[config.campo];
    if (!valor || valor.trim().length === 0) {
      erros.push(`"${config.rotulo}" está vazio`);
    }
  }

  // Validar formato do número do processo (se mapeado)
  const numProcesso = dados['numero_processo'];
  if (numProcesso && numProcesso.trim().length > 0) {
    if (!REGEX_PROCESSO_FLEXIVEL.test(numProcesso.replace(/\s/g, ''))) {
      erros.push(`"${obterRotuloCampo('numero_processo')}": formato pode estar incorreto (valor: "${numProcesso.slice(0, 30)}")`);
    }
  }

  // Validar campos de data (todos os que forem mapeados como data)
  const camposData = ['data_movimentacao'];
  for (const campoData of camposData) {
    const dataStr = dados[campoData];
    if (dataStr && dataStr.trim().length > 0) {
      if (!ehDataValida(dataStr.trim())) {
        erros.push(`"${obterRotuloCampo(campoData)}": formato de data não reconhecido (valor: "${dataStr.trim().slice(0, 20)}")`);
      }
    }
  }

  // Validar campo numérico dias_sem_mov
  const diasStr = dados['dias_sem_mov'];
  if (diasStr && diasStr.trim().length > 0) {
    const num = Number(diasStr.trim());
    if (isNaN(num)) {
      erros.push(`"${obterRotuloCampo('dias_sem_mov')}": valor não é numérico (valor: "${diasStr.trim().slice(0, 20)}")`);
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
 */
function marcarDuplicatas(registros: RegistroImportado[]): void {
  const vistos = new Map<string, number>();

  for (const reg of registros) {
    const processo = reg.dados['numero_processo']?.trim().toLowerCase();
    if (!processo) continue;

    if (vistos.has(processo)) {
      reg.status = 'duplicado';
      reg.erros.push(`"${obterRotuloCampo('numero_processo')}": processo duplicado (mesmo que linha ${vistos.get(processo)! + 2})`);
    } else {
      vistos.set(processo, reg.indice);
    }
  }
}

/**
 * Função principal de validação.
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
      selecionado: status === 'valido',
    };
  });

  marcarDuplicatas(registros);

  const resumo = {
    total: registros.length,
    validos: registros.filter((r) => r.status === 'valido').length,
    incompletos: registros.filter((r) => r.status === 'incompleto').length,
    duplicados: registros.filter((r) => r.status === 'duplicado').length,
    erros: registros.filter((r) => r.status === 'erro').length,
  };

  return { registros, resumo };
}
