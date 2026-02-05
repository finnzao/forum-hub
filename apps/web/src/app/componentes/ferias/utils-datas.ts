/**
 * Utilitários para manipulação de datas e cálculos do sistema de férias
 */

/**
 * Verifica se uma data é final de semana
 */
export function ehFinalDeSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === 0 || dia === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Retorna array com todas as datas entre início e fim (inclusive)
 */
export function obterDatasEntre(dataInicio: Date, dataFim: Date): Date[] {
  const datas: Date[] = [];
  const atual = new Date(dataInicio);
  
  while (atual <= dataFim) {
    datas.push(new Date(atual));
    atual.setDate(atual.getDate() + 1);
  }
  
  return datas;
}

/**
 * Conta dias corridos entre duas datas (inclusive)
 */
export function contarDiasCorridos(dataInicio: Date, dataFim: Date): number {
  const diffTime = dataFim.getTime() - dataInicio.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Conta dias úteis entre duas datas (excluindo finais de semana)
 */
export function contarDiasUteis(dataInicio: Date, dataFim: Date): number {
  const datas = obterDatasEntre(dataInicio, dataFim);
  return datas.filter(data => !ehFinalDeSemana(data)).length;
}

/**
 * Formata data para o padrão brasileiro (DD/MM/YYYY)
 */
export function formatarData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data para ISO string (YYYY-MM-DD)
 */
export function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte string ISO para Date
 */
export function parseDataISO(dataISO: string): Date {
  return new Date(dataISO + 'T00:00:00');
}

/**
 * Calcula dias restantes até uma data
 */
export function calcularDiasRestantes(dataAlvo: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataAlvo.setHours(0, 0, 0, 0);
  
  const diffTime = dataAlvo.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se duas datas se sobrepõem
 */
export function periodosSesobrepõem(
  inicio1: Date,
  fim1: Date,
  inicio2: Date,
  fim2: Date
): boolean {
  return inicio1 <= fim2 && inicio2 <= fim1;
}

/**
 * Retorna nome do dia da semana
 */
export function obterNomeDiaSemana(data: Date): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[data.getDay()];
}

/**
 * Retorna nome do mês
 */
export function obterNomeMes(data: Date): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[data.getMonth()];
}

/**
 * Adiciona dias a uma data
 */
export function adicionarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/**
 * Normaliza data para meia-noite
 */
export function normalizarData(data: Date): Date {
  const normalizada = new Date(data);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}
