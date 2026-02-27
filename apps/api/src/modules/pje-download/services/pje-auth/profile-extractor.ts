import type { PJEProfile, ProfileMapping } from './types';
import { cleanText, decodeHtmlEntities, stripHtml } from './html-parser';

export function extractProfilesFromHtml(html: string): PJEProfile[] {
  const profiles: PJEProfile[] = [];

  const activeProfile = extractActiveProfileFromThead(html);

  const tbodyHtml = extractTbodyHtml(html);
  const sortedTbodyIndices = extractTbodyIndices(tbodyHtml);

  console.log(`[PJE-AUTH] Perfis tbody indices: [${sortedTbodyIndices.join(', ')}]`);

  if (activeProfile) {
    console.log(`[PJE-AUTH] Perfil ativo (thead): "${activeProfile}"`);

    const maxTbodyIndex = sortedTbodyIndices.length > 0 ? Math.max(...sortedTbodyIndices) : -1;
    const activeIndex = maxTbodyIndex + 1;
    const parts = activeProfile.split(' / ');

    profiles.push({
      indice: activeIndex,
      nome: activeProfile,
      orgao: parts.length >= 2 ? parts[0].trim() : '',
      favorito: true,
    });
  }

  for (const idx of sortedTbodyIndices) {
    const profile = extractTbodyProfileRow(tbodyHtml, html, idx);
    if (!profile) continue;

    if (activeProfile && profile.nome.toLowerCase().trim() === activeProfile.toLowerCase().trim()) {
      continue;
    }

    profiles.push(profile);
  }

  profiles.sort((a, b) => {
    if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
    return a.indice - b.indice;
  });

  console.log(`[PJE-AUTH] Perfis: ${profiles.length}`);
  for (const p of profiles) {
    console.log(`  [${p.indice}] ${p.favorito ? '⭐ ' : '   '}${p.nome}`);
  }

  return profiles;
}

export function isActiveProfileIndex(html: string, profileIndex: number): boolean {
  const mapping = buildProfileMapping(html);
  return mapping.some((p) => p.virtualIndex === profileIndex && p.isActive);
}

export function resolveProfileIndex(html: string, profileIndex: number): number {
  const mapping = buildProfileMapping(html);
  const found = mapping.find((p) => p.virtualIndex === profileIndex);
  return found ? found.tbodyIndex : profileIndex;
}

function extractActiveProfileFromThead(html: string): string {
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (!theadMatch) return '';

  const theadHtml = theadMatch[1];
  const headerCellMatch = theadHtml.match(/id="papeisUsuarioForm:dtPerfil:j_id65"[^>]*>([\s\S]*?)<\/th>/i);
  const searchScope = headerCellMatch ? headerCellMatch[1] : theadHtml;

  const links: string[] = [];
  const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  let lm;
  while ((lm = linkRegex.exec(searchScope)) !== null) {
    const text = cleanText(lm[1]);
    if (text.length > 3 && !text.includes('favorite')) {
      links.push(text);
    }
  }

  return links.length > 0 ? links.sort((a, b) => b.length - a.length)[0] : '';
}

function extractTbodyHtml(html: string): string {
  const tbodyMatch = html.match(/<tbody[^>]*id="papeisUsuarioForm:dtPerfil:tb"[^>]*>([\s\S]*?)<\/tbody>/i);
  return tbodyMatch ? tbodyMatch[1] : '';
}

function extractTbodyIndices(tbodyHtml: string): number[] {
  const indices = new Set<number>();
  const regex = /papeisUsuarioForm:dtPerfil:(\d+):(?:perfilInicial|colPerfil|j_id68|j_id70)/g;
  let m;
  while ((m = regex.exec(tbodyHtml)) !== null) {
    indices.add(parseInt(m[1], 10));
  }
  return [...indices].sort((a, b) => a - b);
}

function extractTbodyProfileRow(
  tbodyHtml: string,
  fullHtml: string,
  idx: number,
): PJEProfile | null {
  const cellId = `papeisUsuarioForm:dtPerfil:${idx}:perfilInicial`;
  let searchHtml = tbodyHtml;
  let pos = tbodyHtml.indexOf(cellId);

  if (pos < 0) {
    searchHtml = fullHtml;
    pos = fullHtml.indexOf(cellId);
    if (pos < 0) {
      pos = searchHtml.indexOf(`papeisUsuarioForm:dtPerfil:${idx}:j_id70`);
      if (pos < 0) return null;
    }
  }

  const before = searchHtml.slice(0, pos);
  const trStart = before.lastIndexOf('<tr');
  if (trStart < 0) return null;

  const after = searchHtml.slice(trStart);
  const trClose = after.match(/<\/tr>/i);
  if (!trClose?.index) return null;

  const row = after.slice(0, trClose.index + 5);

  const imgMatch = row.match(/src="[^"]*?(favorite-16x16)(-disabled)?\.png"/i);
  const favorito = imgMatch ? !imgMatch[2] : false;

  const nome = extractProfileName(row, idx);
  const parts = nome.split(' / ');

  return {
    indice: idx,
    nome,
    orgao: parts.length >= 2 ? parts[0].trim() : '',
    favorito,
  };
}

function extractProfileName(row: string, idx: number): string {
  const specificPattern = new RegExp(
    `papeisUsuarioForm:dtPerfil:${idx}:j_id70[\\s\\S]{0,300}?<a[^>]*>([\\s\\S]*?)<\\/a>`, 'i'
  );
  const specific = row.match(specificPattern);
  if (specific?.[1]) {
    const t = cleanText(specific[1]);
    if (t.length > 3) return t;
  }

  const links: string[] = [];
  for (const lm of row.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = cleanText(lm[1]);
    if (t.length > 3 && !/^selecionar$/i.test(t)) links.push(t);
  }
  if (links.length > 0) return links.sort((a, b) => b.length - a.length)[0];

  const tds: string[] = [];
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let td;
  while ((td = tdRe.exec(row)) !== null) {
    const t = decodeHtmlEntities(stripHtml(td[1]).trim());
    if (t.length > 3 && !/^selecionar$/i.test(t)) tds.push(t);
  }
  if (tds.length > 0) return tds.sort((a, b) => b.length - a.length)[0];

  return `Perfil ${idx}`;
}

function buildProfileMapping(html: string): ProfileMapping[] {
  const result: ProfileMapping[] = [];
  const activeProfile = extractActiveProfileFromThead(html);
  const tbodyHtml = extractTbodyHtml(html);
  const sortedTbodyIndices = extractTbodyIndices(tbodyHtml);
  const maxTbodyIndex = sortedTbodyIndices.length > 0 ? Math.max(...sortedTbodyIndices) : -1;

  if (activeProfile) {
    result.push({
      virtualIndex: maxTbodyIndex + 1,
      tbodyIndex: -1,
      nome: activeProfile,
      isActive: true,
    });
  }

  for (const idx of sortedTbodyIndices) {
    const profile = extractTbodyProfileRow(tbodyHtml, html, idx);
    if (!profile) continue;
    if (activeProfile && profile.nome.toLowerCase().trim() === activeProfile.toLowerCase().trim()) continue;

    result.push({
      virtualIndex: idx,
      tbodyIndex: idx,
      nome: profile.nome,
      isActive: false,
    });
  }

  return result;
}
