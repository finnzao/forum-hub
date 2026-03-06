import type { AdvogadoInfo } from 'shared';

const ADVOGADO_PATTERN = /<a\s+href="[^"]*%28ADVOGADO%29[^"]*"[^>]*>\s*<span[^>]*>(.*?)<\/span>\s*<\/a>/gis;
const DEFENSOR_PATTERN = /<a\s+href="[^"]*%28DEFENSOR[^"]*"[^>]*>\s*<span[^>]*>(.*?)<\/span>\s*<\/a>/gis;
const SPAN_ADVOGADO_PATTERN = /<span[^>]*>[^<]*\(ADVOGADO\)[^<]*<\/span>/gi;

const NOME_PATTERN = /^(.+?)(?:\s*-\s*OAB|\s*-\s*CPF|\s*\(ADVOGADO\)|\s*\(DEFENSOR)/i;
const OAB_PATTERN = /OAB\s*([A-Z]{2})\s*(\d+[A-Z]?)/i;
const CPF_PATTERN = /CPF:\s*([\d.\-/]+)/i;

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAdvogadoSpan(raw: string): Omit<AdvogadoInfo, 'tipoParte'> | null {
  const text = decodeHtml(raw);
  if (!text || text.length < 3) return null;

  const nomeMatch = text.match(NOME_PATTERN);
  const nome = nomeMatch ? nomeMatch[1].trim() : text.replace(/\s*\(ADVOGADO\)\s*$/, '').trim();
  if (!nome || nome.length < 2) return null;

  const oabMatch = text.match(OAB_PATTERN);
  const oab = oabMatch ? `OAB ${oabMatch[1]}${oabMatch[2]}` : undefined;

  const cpfMatch = text.match(CPF_PATTERN);
  const cpf = cpfMatch ? cpfMatch[1] : undefined;

  return { nome, oab, cpf };
}

function extractPoloSection(html: string, poloId: string): string {
  const regex = new RegExp(`<div[^>]+id="${poloId}"[^>]*>([\\s\\S]*?)(?=<div[^>]+id="polo|<div[^>]+class="col-sm-4[^"]*panel)`, 'i');
  const match = html.match(regex);
  if (match) return match[1];

  const simpleRegex = new RegExp(`id="${poloId}"[\\s\\S]{0,50000}?(?=id="polo(?:Ativo|Passivo)"|$)`, 'i');
  const simpleMatch = html.match(simpleRegex);
  return simpleMatch ? simpleMatch[0] : '';
}

function extractAdvogadosFromSection(sectionHtml: string, tipoParte: 'ATIVO' | 'PASSIVO'): AdvogadoInfo[] {
  const advogados: AdvogadoInfo[] = [];
  const seen = new Set<string>();

  const patterns = [ADVOGADO_PATTERN, DEFENSOR_PATTERN, SPAN_ADVOGADO_PATTERN];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(sectionHtml)) !== null) {
      const spanText = match[1] || match[0];
      const parsed = parseAdvogadoSpan(spanText);
      if (!parsed) continue;

      const key = parsed.nome.toUpperCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      advogados.push({ ...parsed, tipoParte });
    }
  }

  return advogados;
}

export function extractAdvogadosFromHtml(html: string): {
  advogadosPoloAtivo: AdvogadoInfo[];
  advogadosPoloPassivo: AdvogadoInfo[];
} {
  const ativoSection = extractPoloSection(html, 'poloAtivo');
  const passivoSection = extractPoloSection(html, 'poloPassivo');

  return {
    advogadosPoloAtivo: extractAdvogadosFromSection(ativoSection, 'ATIVO'),
    advogadosPoloPassivo: extractAdvogadosFromSection(passivoSection, 'PASSIVO'),
  };
}
