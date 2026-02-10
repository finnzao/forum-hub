/** Nº do Processo CNJ: 0000000-00.0000.0.00.0000 */
export const REGEX_PROCESSO = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

/** Data BR: DD/MM/AAAA */
export const REGEX_DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;


/**
 * Aplica máscara de nº do processo CNJ
 * Entrada: dígitos puros → Saída: 0000000-00.0000.0.00.0000
 */
export function mascaraProcesso(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 20);
  let resultado = '';

  for (let i = 0; i < digitos.length; i++) {
    if (i === 7) resultado += '-';
    if (i === 9) resultado += '.';
    if (i === 13) resultado += '.';
    if (i === 14) resultado += '.';
    if (i === 16) resultado += '.';
    resultado += digitos[i];
  }

  return resultado;
}

/**
 * Aplica máscara de data DD/MM/AAAA
 */
export function mascaraData(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  let resultado = '';

  for (let i = 0; i < digitos.length; i++) {
    if (i === 2 || i === 4) resultado += '/';
    resultado += digitos[i];
  }

  return resultado;
}


/**
 * Valida se o nº do processo está no formato CNJ correto
 */
export function validarProcesso(valor: string): { valido: boolean; erro?: string } {
  if (!valor.trim()) {
    return { valido: false, erro: 'Nº do processo é obrigatório' };
  }
  if (!REGEX_PROCESSO.test(valor)) {
    return { valido: false, erro: 'Formato inválido. Use: 0000000-00.0000.0.00.0000' };
  }
  return { valido: true };
}

/**
 * Valida se a data está no formato DD/MM/AAAA e é uma data real válida
 */
export function validarData(valor: string): { valido: boolean; erro?: string } {
  if (!valor.trim()) {
    return { valido: false, erro: 'Data é obrigatória' };
  }
  if (!REGEX_DATA_BR.test(valor)) {
    return { valido: false, erro: 'Formato inválido. Use: DD/MM/AAAA' };
  }

  const [diaStr, mesStr, anoStr] = valor.split('/');
  const dia = parseInt(diaStr, 10);
  const mes = parseInt(mesStr, 10);
  const ano = parseInt(anoStr, 10);

  // Verificar ranges básicos
  if (mes < 1 || mes > 12) {
    return { valido: false, erro: 'Mês inválido (01-12)' };
  }
  if (ano < 2000 || ano > 2099) {
    return { valido: false, erro: 'Ano inválido (2000-2099)' };
  }

  // Verificar dia válido para o mês
  const dataObj = new Date(ano, mes - 1, dia);
  if (
    dataObj.getFullYear() !== ano ||
    dataObj.getMonth() !== mes - 1 ||
    dataObj.getDate() !== dia
  ) {
    return { valido: false, erro: 'Data inválida' };
  }

  return { valido: true };
}

/**
 * Valida se a data do lembrete é futura ou hoje
 */
export function validarDataLembrete(valor: string): { valido: boolean; erro?: string } {
  const validacao = validarData(valor);
  if (!validacao.valido) return validacao;

  const [diaStr, mesStr, anoStr] = valor.split('/');
  const dataLembrete = new Date(
    parseInt(anoStr, 10),
    parseInt(mesStr, 10) - 1,
    parseInt(diaStr, 10)
  );
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (dataLembrete < hoje) {
    return { valido: false, erro: 'Data do lembrete deve ser hoje ou futura' };
  }

  return { valido: true };
}
