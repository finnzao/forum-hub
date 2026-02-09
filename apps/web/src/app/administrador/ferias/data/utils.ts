import { Ausencia, Setor, Funcionario, MotivoAusencia } from '../types/ferias';
import { MOTIVOS } from './constants';

/** Calcula dias entre duas datas (inclusive) */
export function calcularDias(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim = new Date(dataFim + 'T00:00:00');
  return Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000) + 1);
}

/** Soma N dias a uma data e retorna 'YYYY-MM-DD' */
export function somarDias(data: string, dias: number): string {
  const d = new Date(data + 'T00:00:00');
  d.setDate(d.getDate() + dias - 1);
  return d.toISOString().split('T')[0];
}

/** Verifica se funcionário tem ausência cobrindo determinado mês */
export function getAusenciaNoMes(
  ausencias: Ausencia[], funcId: string, ano: number, mes: number
): Ausencia | null {
  const primeiroDia = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const ultimoDiaN = new Date(ano, mes + 1, 0).getDate();
  const ultimoDia = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaN).padStart(2, '0')}`;
  return ausencias.find(
    (a) => a.funcionarioId === funcId && a.dataInicio <= ultimoDia && a.dataFim >= primeiroDia
  ) || null;
}

/** Calcula conflitos por mês/setor */
export function calcularConflitos(
  setores: Setor[], funcionarios: Funcionario[], ausencias: Ausencia[], ano: number
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  setores.forEach((s) => {
    const funcsDoSetor = funcionarios.filter((f) => f.setorId === s.id);
    for (let mes = 0; mes < 12; mes++) {
      const ultimoDiaN = new Date(ano, mes + 1, 0).getDate();
      for (let dia = 1; dia <= ultimoDiaN; dia++) {
        const dStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const ausentes = funcsDoSetor.filter((f) =>
          ausencias.some((a) => a.funcionarioId === f.id && dStr >= a.dataInicio && dStr <= a.dataFim)
        );
        if (ausentes.length > s.limiteAusencias) {
          map[`${s.id}-${mes}`] = true;
          break;
        }
      }
    }
  });
  return map;
}

export function getMotivoConfig(motivo: MotivoAusencia) {
  return MOTIVOS.find((m) => m.valor === motivo) || MOTIVOS[0];
}

export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
