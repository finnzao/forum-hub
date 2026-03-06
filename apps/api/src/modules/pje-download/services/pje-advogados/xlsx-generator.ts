import type { ProcessoAdvogados, FiltroAdvogado } from 'shared';
import * as path from 'node:path';
import * as fs from 'node:fs';
import ExcelJS from 'exceljs';

const OUTPUT_DIR = path.join(process.cwd(), 'downloads', 'planilhas');

const COLUMNS: Array<{ header: string; width: number }> = [
  { header: 'Nº Processo',              width: 28 },
  { header: 'Polo Ativo (Parte)',       width: 30 },
  { header: 'Advogado(s) Polo Ativo',   width: 38 },
  { header: 'OAB Polo Ativo',           width: 20 },
  { header: 'Polo Passivo (Parte)',     width: 30 },
  { header: 'Advogado(s) Polo Passivo', width: 38 },
  { header: 'OAB Polo Passivo',         width: 20 },
  { header: 'Classe Judicial',          width: 22 },
  { header: 'Assunto Principal',        width: 30 },
  { header: 'Órgão Julgador',           width: 34 },
  { header: 'Status',                   width: 10 },
];

const COLORS = {
  headerBg: '1F3864',
  headerFg: 'FFFFFF',
  evenRow:  'D6E4F0',
  oddRow:   'FFFFFF',
  border:   'B4C6E7',
  text:     '1A1A1A',
  okGreen:  '548235',
  errRed:   'C00000',
} as const;

const STATUS_COL = COLUMNS.length;

function makeBorder(color: string): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: 'thin', color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

function makeFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function makeFont(overrides: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> {
  return { name: 'Arial', size: 9, color: { argb: COLORS.text }, ...overrides };
}

const CENTER_WRAP: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
  wrapText: true,
};

function processoToRow(p: ProcessoAdvogados): string[] {
  return [
    p.numeroProcesso,
    p.poloAtivo,
    p.advogadosPoloAtivo.map((a) => a.nome).join('\n'),
    p.advogadosPoloAtivo.map((a) => a.oab || '').filter(Boolean).join('\n'),
    p.poloPassivo,
    p.advogadosPoloPassivo.map((a) => a.nome).join('\n'),
    p.advogadosPoloPassivo.map((a) => a.oab || '').filter(Boolean).join('\n'),
    p.classeJudicial || '',
    p.assuntoPrincipal || '',
    p.orgaoJulgador || '',
    p.erro || 'OK',
  ];
}

function calcRowHeight(values: string[]): number {
  const maxLines = Math.max(1, ...values.map((v) => (v ? v.split('\n').length : 1)));
  return Math.max(22, maxLines * 15);
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
}

export async function gerarXlsx(
  processos: ProcessoAdvogados[],
  filtro?: FiltroAdvogado,
): Promise<{ fileName: string; filePath: string }> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const suffix = filtro?.valor ? `_${filtro.tipo}_${sanitize(filtro.valor)}` : '';
  const fileName = `advogados_pje_${timestamp}${suffix}.xlsx`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PJE Download — TJBA';
  wb.created = new Date();

  const ws = wb.addWorksheet('Advogados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = COLUMNS.map((col, i) => ({
    header: col.header,
    key: `col${i}`,
    width: col.width,
  }));

  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = makeFont({ size: 10, bold: true, color: { argb: COLORS.headerFg } });
    cell.fill = makeFill(COLORS.headerBg);
    cell.alignment = CENTER_WRAP;
    cell.border = makeBorder(COLORS.headerBg);
  });

  for (let i = 0; i < processos.length; i++) {
    const values = processoToRow(processos[i]);
    const row = ws.addRow(values);
    const bgColor = i % 2 === 0 ? COLORS.evenRow : COLORS.oddRow;
    const status = values[values.length - 1];

    row.height = calcRowHeight(values);

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = colNumber === STATUS_COL
        ? makeFont({ bold: true, color: { argb: status === 'OK' ? COLORS.okGreen : COLORS.errRed } })
        : makeFont();
      cell.fill = makeFill(bgColor);
      cell.alignment = CENTER_WRAP;
      cell.border = makeBorder(COLORS.border);
    });
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: processos.length + 1, column: COLUMNS.length },
  };

  await wb.xlsx.writeFile(filePath);

  return { fileName, filePath };
}
