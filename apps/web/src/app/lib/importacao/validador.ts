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
    const dataValida = !isNaN(Date.parse(dataStr)) || /^\d{2}\/\d{2}\/\d{4}$/.test(dataStr);
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
