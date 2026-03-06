import type { ProcessoAdvogados, FiltroAdvogado } from 'shared';
import * as path from 'node:path';
import * as fs from 'node:fs';

const OUTPUT_DIR = path.join(process.cwd(), 'downloads', 'planilhas');

export async function gerarXlsx(
  processos: ProcessoAdvogados[],
  filtro?: FiltroAdvogado,
): Promise<{ fileName: string; filePath: string }> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const suffix = filtro?.valor ? `_${filtro.tipo}_${sanitize(filtro.valor)}` : '';
  const fileName = `advogados_pje_${timestamp}${suffix}.csv`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const SEPARATOR = '\t';
  const headers = [
    'Nº Processo',
    'Polo Ativo (Parte)',
    'Advogado(s) Polo Ativo',
    'OAB Polo Ativo',
    'Polo Passivo (Parte)',
    'Advogado(s) Polo Passivo',
    'OAB Polo Passivo',
    'Classe Judicial',
    'Assunto Principal',
    'Órgão Julgador',
    'Status',
  ];

  const rows: string[][] = [headers];

  for (const p of processos) {
    const nomesAtivo = p.advogadosPoloAtivo.map((a) => a.nome).join('; ');
    const oabsAtivo = p.advogadosPoloAtivo.map((a) => a.oab || '').filter(Boolean).join('; ');
    const nomesPassivo = p.advogadosPoloPassivo.map((a) => a.nome).join('; ');
    const oabsPassivo = p.advogadosPoloPassivo.map((a) => a.oab || '').filter(Boolean).join('; ');

    rows.push([
      p.numeroProcesso,
      p.poloAtivo,
      nomesAtivo,
      oabsAtivo,
      p.poloPassivo,
      nomesPassivo,
      oabsPassivo,
      p.classeJudicial || '',
      p.assuntoPrincipal || '',
      p.orgaoJulgador || '',
      p.erro || 'OK',
    ]);
  }

  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeField).join(SEPARATOR)).join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf-8');

  return { fileName, filePath };
}

function escapeField(value: string): string {
  if (value.includes('"') || value.includes('\t') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
}
