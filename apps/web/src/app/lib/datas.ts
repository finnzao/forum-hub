// ============================================================
// lib/datas.ts
// Formatação de datas em pt-BR a partir de ISO. Sem fuso implícito:
// trabalha com os componentes locais da data.
// ============================================================

export function formatarDataBR(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

export function formatarDataHoraBR(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatarDataBR(iso)} ${hh}:${mm}`;
}

export function diasEntre(deIso: string, ateIso: string): number {
  const de = new Date(deIso);
  const ate = new Date(ateIso);
  return Math.max(0, Math.round((ate.getTime() - de.getTime()) / 86_400_000));
}

/** "há 3 h", "há 2 dias" */
export function idadeRelativa(iso: string, agoraIso: string): string {
  const ms = new Date(agoraIso).getTime() - new Date(iso).getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return 'há menos de 1 h';
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}
