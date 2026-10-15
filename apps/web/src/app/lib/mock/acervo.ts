// ============================================================
// lib/mock/acervo.ts
// Acervo fictício de uma unidade, gerado de forma DETERMINÍSTICA
// (PRNG com semente + data de referência fixa) para que servidor e
// cliente do Next produzam exatamente os mesmos dados — sem erro de
// hidratação. Substituído pela API na fase 1 (ARQUITETURA.md).
// ============================================================

import { formatarCNJ, casaFiltroDigito, type FiltroDigito } from '../cnj';
import type {
  ProcessoObservado,
  ProcessoFila,
  AnaliseAnterior,
  RegistroProcesso,
  UsuarioUnidade,
  ListaManual,
  CapturaInfo,
  PerfilPje,
  PrioridadeTrabalho,
  FaixaPeso,
  SituacaoAnalise,
  StatusItem,
} from '../../types/processo';

// ── Referência temporal fixa ────────────────────────────

/** "Agora" do mock. Fixo para o mock ser estável entre renderizações. */
export const AGORA_MOCK = '2026-10-15T09:10:00';
/** Última captura da unidade */
export const CAPTURA_ATUAL: CapturaInfo = {
  id: 'cap-20261015-0742',
  fonte: 'adaptador',
  perfilPje: 'Vara Criminal de Rio Real / Direção de Secretaria / Diretor de Secretaria',
  concluidaEm: '2026-10-15T07:42:00',
  totalLidos: 318,
  novos: 14,
  alterados: 57,
  ausentes: 9,
};

// ── PRNG determinístico (mulberry32) ────────────────────

function criarRng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Perfis, usuários e listas ───────────────────────────

export const PERFIS_PJE_MOCK: PerfilPje[] = [
  { id: 'perfil-1', unidadeNome: 'Vara Criminal de Rio Real', papel: 'Direção de Secretaria', cargo: 'Diretor de Secretaria' },
  { id: 'perfil-2', unidadeNome: 'Vara Cível de Rio Real', papel: 'Secretaria', cargo: 'Analista Judiciário' },
];

export const USUARIOS_UNIDADE: UsuarioUnidade[] = [
  { id: 'srv-1', nome: 'Maria Silva',    perfilSistema: 'servidor', ativo: true,  filtroDigito: { ultimo_seq: [0, 1] } },
  { id: 'srv-2', nome: 'João Santos',    perfilSistema: 'servidor', ativo: true,  filtroDigito: { ultimo_seq: [2, 3] } },
  { id: 'srv-3', nome: 'Ana Costa',      perfilSistema: 'servidor', ativo: true,  filtroDigito: { ultimo_seq: [4, 5, 6] } },
  { id: 'srv-4', nome: 'Pedro Oliveira', perfilSistema: 'servidor', ativo: true,  filtroDigito: { ultimo_seq: [7] } },
  { id: 'srv-5', nome: 'Carla Mendes',   perfilSistema: 'servidor', ativo: false, filtroDigito: { ultimo_seq: [9, 0] } },
  { id: 'chefe-1', nome: 'Carlos Ferreira', perfilSistema: 'chefe', ativo: true, filtroDigito: {} },
];

export const USUARIO_ATUAL_ID = 'srv-1';

// ── Catálogos ───────────────────────────────────────────

const TAREFAS = [
  'Aguardando análise de secretaria',
  'Preparar ato de comunicação',
  'Cumprir determinação judicial',
  'Análise de petição',
  'Minutar despacho',
  'Concluso para decisão',
  'Arquivar',
  'Aguardando prazo',
  'Aguardando audiência',
  'Aguardando retorno de mandado',
  'Certificar trânsito em julgado',
  'Expedir alvará',
];

/** Tarefas em que o processo espera por terceiro (fator F = 0,3 no digito-core) */
const TAREFAS_FILA_ESPERA = new Set(['Aguardando prazo', 'Aguardando audiência', 'Aguardando retorno de mandado']);

const CLASSES: { classe: string; assuntos: string[]; grupoB: number; penal?: boolean }[] = [
  { classe: 'Ação Penal - Procedimento Ordinário', assuntos: ['Tráfico de Drogas', 'Roubo Majorado', 'Furto Qualificado', 'Lesão Corporal'], grupoB: 14, penal: true },
  { classe: 'Ação Penal - Procedimento Sumário',   assuntos: ['Ameaça', 'Desacato', 'Receptação'], grupoB: 12, penal: true },
  { classe: 'Procedimento Comum Cível',            assuntos: ['Indenização por Dano Moral', 'Cobrança', 'Contratos Bancários', 'Rescisão Contratual'], grupoB: 8 },
  { classe: 'Procedimento Comum Cível',            assuntos: ['Fornecimento de Medicamentos', 'Tratamento Médico-Hospitalar'], grupoB: 20 },
  { classe: 'Cumprimento de Sentença',             assuntos: ['Obrigação de Fazer', 'Pagamento de Quantia'], grupoB: 8 },
  { classe: 'Execução de Título Extrajudicial',    assuntos: ['Cédula de Crédito Bancário', 'Nota Promissória'], grupoB: 6 },
  { classe: 'Execução Fiscal',                     assuntos: ['Dívida Ativa', 'IPTU'], grupoB: 4 },
  { classe: 'Alimentos - Lei Especial',            assuntos: ['Fixação de Alimentos', 'Revisão de Alimentos'], grupoB: 12 },
  { classe: 'Divórcio Litigioso',                  assuntos: ['Dissolução', 'Partilha de Bens'], grupoB: 10 },
  { classe: 'Ação Civil Pública',                  assuntos: ['Improbidade Administrativa', 'Dano Ambiental'], grupoB: 16 },
  { classe: 'Inventário',                          assuntos: ['Inventário e Partilha'], grupoB: 8 },
  { classe: 'Busca e Apreensão em Alienação Fiduciária', assuntos: ['Alienação Fiduciária'], grupoB: 6 },
];

const NOMES = [
  'Antônio Carlos de Souza', 'Maria das Graças Oliveira', 'José Raimundo Ferreira', 'Ana Paula Santana',
  'Francisco das Chagas Lima', 'Joselita Bispo dos Santos', 'Edvaldo Pereira Nascimento', 'Luciana Rocha Almeida',
  'Gilberto Matos Cardoso', 'Adriana Batista Correia', 'Manoel Messias Araújo', 'Rosângela Conceição Silva',
  'Jailton Barbosa Ribeiro', 'Cristiane Freitas Moura', 'Everaldo Santos Cruz', 'Patrícia Guimarães Lopes',
  'Reginaldo Teixeira Pinto', 'Vanessa Carvalho Dias', 'Osvaldo Macedo Neri', 'Simone Andrade Góes',
];

const EMPRESAS = [
  'Banco do Brasil S.A.', 'Banco Bradesco S.A.', 'Coelba - Cia. de Eletricidade da Bahia', 'Embasa',
  'Município de Rio Real', 'Estado da Bahia', 'Telefônica Brasil S.A.', 'Aymoré Crédito e Financiamento',
  'Claro S.A.', 'Energisa Sergipe', 'Losango Promoções de Vendas', 'Crefisa S.A.',
];

const MOVIMENTOS = [
  'Juntada de Petição', 'Expedição de Mandado', 'Decisão Interlocutória', 'Despacho de mero expediente',
  'Juntada de Certidão', 'Publicado no DJe', 'Audiência Designada', 'Conclusos para Despacho',
  'Juntada de AR', 'Remetidos os autos ao Ministério Público', 'Juntada de Laudo', 'Sentença publicada',
  'Recebidos os autos', 'Intimação eletrônica expedida',
];

const OBSERVACOES = [
  'Citação pendente — AR devolvido, expedido mandado.',
  'Aguardando manifestação do MP. Prazo em curso.',
  'Petição de acordo juntada; minutar homologação.',
  'Processo apto para sentença, conclusos.',
  'Parte sem CPF no cadastro — saneamento pendente.',
  'Alvará expedido, aguardando cumprimento.',
  'Audiência designada para o mês que vem.',
  'Analisado: nada a fazer, aguardar prazo.',
  'Mandado devolvido sem cumprimento — endereço inexistente.',
  'Intimação publicada; aguardando prazo recursal.',
];

const TIPOS_MOV_LABEL = [
  'Despacho', 'Certidão', 'Intimação', 'Juntada', 'Ofício', 'Mandado',
  'Publicação', 'Conclusão', 'Alvará', 'Remessa',
];

// ── Geração do acervo ───────────────────────────────────

const TOTAL = 320;

function gerarAcervo(): { processos: ProcessoObservado[]; analises: Map<string, AnaliseAnterior>; registros: RegistroProcesso[] } {
  const rng = criarRng(20261015);
  const agora = new Date(AGORA_MOCK);
  const processos: ProcessoObservado[] = [];
  const analises = new Map<string, AnaliseAnterior>();
  const registros: RegistroProcesso[] = [];
  const servidores = USUARIOS_UNIDADE.filter((u) => u.perfilSistema === 'servidor');
  const usados = new Set<string>();

  const escolher = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const entre = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  for (let i = 0; i < TOTAL; i++) {
    // Ano com viés para recente; sequencial e DV aleatórios
    const r = rng();
    const ano = r < 0.08 ? entre(2018, 2019) : r < 0.25 ? entre(2020, 2021) : r < 0.5 ? entre(2022, 2023) : r < 0.8 ? entre(2024, 2025) : 2026;
    let digitos = '';
    do {
      const seq = String(entre(1, 9999999)).padStart(7, '0');
      const dv = String(entre(0, 99)).padStart(2, '0');
      // J=8 (Justiça Estadual), TR=05 (TJBA), origem 0210 (Rio Real) ou 0211
      digitos = `${seq}${dv}${ano}805${rng() < 0.85 ? '0210' : '0211'}`;
    } while (usados.has(digitos));
    usados.add(digitos);

    const classeInfo = escolher(CLASSES);
    const assunto = escolher(classeInfo.assuntos);
    const tarefaAtual = escolher(TAREFAS);
    const outrasTarefas = rng() < 0.15 ? [escolher(TAREFAS.filter((t) => t !== tarefaAtual))] : [];

    // Dias parados: distribuição assimétrica (muitos recentes, cauda longa)
    const d = rng();
    const diasParados = d < 0.35 ? entre(0, 30) : d < 0.6 ? entre(31, 99) : d < 0.8 ? entre(100, 180) : entre(181, 420);
    const ultimoMov = new Date(agora);
    ultimoMov.setDate(ultimoMov.getDate() - diasParados);
    ultimoMov.setHours(entre(8, 18), entre(0, 59), 0, 0);
    const chegada = new Date(ultimoMov);
    chegada.setDate(chegada.getDate() - entre(0, 20));

    // Etiquetas
    const etiquetas: string[] = [];
    if (classeInfo.grupoB === 20) etiquetas.push('SAÚDE');
    if (assunto === 'Improbidade Administrativa') etiquetas.push('IMPROBIDADE');
    if (classeInfo.penal && rng() < 0.2) etiquetas.push('JÚRI');
    if (ano <= 2021 && rng() < 0.6) etiquetas.push('META 2');
    if (ano <= 2023 && rng() < 0.25) etiquetas.push('META 1');
    if (rng() < 0.12) etiquetas.push('SANEAMENTO');
    if (rng() < 0.06) etiquetas.push('GAB_nao trabalhar');
    if (rng() < 0.35) {
      const dono = escolher(servidores);
      etiquetas.push(dono.nome.split(' ')[0].toUpperCase());
    }

    const pessoaFisicaAtiva = rng() < 0.7;
    const poloAtivo = classeInfo.penal ? 'Ministério Público do Estado da Bahia' : pessoaFisicaAtiva ? escolher(NOMES) : escolher(EMPRESAS);
    const poloPassivo = classeInfo.penal ? escolher(NOMES) : rng() < 0.55 ? escolher(EMPRESAS) : escolher(NOMES);

    const processo: ProcessoObservado = {
      id: `proc-${i + 1}`,
      numeroCnj: digitos,
      numeroFormatado: formatarCNJ(digitos),
      tarefaAtual,
      outrasTarefas,
      dataChegadaTarefa: chegada.toISOString(),
      ultimoMovimentoEm: ultimoMov.toISOString(),
      ultimoMovimentoDesc: escolher(MOVIMENTOS),
      etiquetas,
      classe: classeInfo.classe,
      assunto,
      poloAtivo,
      poloPassivo,
      prioridadeLegal: rng() < 0.12,
      sigiloso: classeInfo.penal ? rng() < 0.3 : rng() < 0.05,
      diasParados,
      capturadoEm: CAPTURA_ATUAL.concluidaEm,
    };
    processos.push(processo);

    // Análise anterior em ~45% dos processos
    if (rng() < 0.45) {
      const quem = escolher(servidores);
      const haDias = entre(1, 90);
      const analisadoEm = new Date(agora);
      analisadoEm.setDate(analisadoEm.getDate() - haDias);
      analisadoEm.setHours(entre(8, 17), entre(0, 59), 0, 0);

      // Sem novidade quando a análise é posterior ao último movimento
      const semNovidade = analisadoEm.getTime() >= ultimoMov.getTime() ? rng() < 0.85 : false;
      const ultimoNaAnalise = semNovidade
        ? ultimoMov
        : new Date(Math.min(analisadoEm.getTime(), ultimoMov.getTime() - 86_400_000 * entre(1, 40)));

      const tipo = escolher(TIPOS_MOV_LABEL);
      analises.set(processo.id, {
        usuarioNome: quem.nome,
        analisadoEm: analisadoEm.toISOString(),
        ultimoMovimentoNaAnalise: ultimoNaAnalise.toISOString(),
        tipoMovimentacao: tipo,
        observacao: rng() < 0.75 ? escolher(OBSERVACOES) : undefined,
      });

      const qtd = entre(1, 2);
      for (let k = 0; k < qtd; k++) {
        const dataReg = new Date(analisadoEm);
        dataReg.setDate(dataReg.getDate() - k * entre(3, 30));
        registros.push({
          id: `reg-${processo.id}-${k}`,
          processoId: processo.id,
          usuarioNome: k === 0 ? quem.nome : escolher(servidores).nome,
          data: dataReg.toISOString(),
          tipoMovimentacao: k === 0 ? tipo : escolher(TIPOS_MOV_LABEL),
          qtdAtos: entre(1, 3),
          nota: rng() < 0.5 ? escolher(OBSERVACOES) : '',
        });
      }
    }
  }

  return { processos, analises, registros };
}

const ACERVO = gerarAcervo();

export function obterAcervo(): ProcessoObservado[] {
  return ACERVO.processos;
}

export function obterAnalise(processoId: string): AnaliseAnterior | undefined {
  return ACERVO.analises.get(processoId);
}

export function registrosDoProcesso(processoId: string): RegistroProcesso[] {
  return ACERVO.registros
    .filter((r) => r.processoId === processoId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

// ── Listas manuais (exceção à distribuição por dígito) ──

export const LISTAS_MANUAIS: ListaManual[] = (() => {
  const maria = USUARIOS_UNIDADE[0];
  const foraDoDigito = ACERVO.processos
    .filter((p) => p.etiquetas.includes('META 2') && !casaFiltroDigito(p.numeroCnj, maria.filtroDigito))
    .slice(0, 12)
    .map((p) => p.id);
  const joao = USUARIOS_UNIDADE[1];
  const saude = ACERVO.processos
    .filter((p) => p.etiquetas.includes('SAÚDE') && !casaFiltroDigito(p.numeroCnj, joao.filtroDigito))
    .slice(0, 6)
    .map((p) => p.id);
  return [
    {
      id: 'lista-1',
      titulo: 'Mutirão META 2 — outubro/2026',
      motivo: 'Mutirão de metas do CNJ',
      servidorId: maria.id,
      dataInicio: '2026-10-13',
      dataFim: '2026-10-24',
      processoIds: foraDoDigito,
      criadoPor: 'Carlos Ferreira',
    },
    {
      id: 'lista-2',
      titulo: 'Saúde — reforço semana 42',
      motivo: 'Cobertura de férias (Ana Costa)',
      servidorId: joao.id,
      dataInicio: '2026-10-13',
      dataFim: '2026-10-17',
      processoIds: saude,
      criadoPor: 'Carlos Ferreira',
    },
  ];
})();

// ── Priorização (aproximação do digito-core) ────────────

function calcularPeso(p: ProcessoObservado): { peso: number; faixa: FaixaPeso; filaEspera: boolean; bloqueado: boolean } {
  const bloqueado = p.etiquetas.includes('GAB_nao trabalhar');
  const filaEspera = TAREFAS_FILA_ESPERA.has(p.tarefaAtual);

  // A — meta / etiqueta estratégica (máx. 40)
  let a = 0;
  if (p.etiquetas.includes('SAÚDE')) a = Math.max(a, 36);
  if (p.etiquetas.includes('JÚRI')) a = Math.max(a, 32);
  if (p.etiquetas.includes('IMPROBIDADE')) a = Math.max(a, 30);
  if (p.etiquetas.includes('META 2') || p.etiquetas.includes('META 1')) a = Math.max(a, 26);
  if (p.etiquetas.includes('SANEAMENTO')) a = Math.max(a, 22);
  const metas = p.etiquetas.filter((e) => ['SAÚDE', 'JÚRI', 'IMPROBIDADE', 'META 2', 'META 1', 'SANEAMENTO'].includes(e)).length;
  if (metas >= 2) a += 5;
  a = Math.min(a, 40);

  // B — assunto/classe (máx. 20)
  const classeInfo = CLASSES.find((c) => c.classe === p.classe && c.assuntos.includes(p.assunto));
  const b = Math.min(classeInfo?.grupoB ?? 8, 20);

  // C — tempo (máx. 25)
  const ano = Number(p.numeroCnj.slice(9, 13));
  let c = p.diasParados < 30 ? 0 : p.diasParados < 60 ? 4 : p.diasParados < 100 ? 9 : p.diasParados < 120 ? 16 : 20;
  c += ano <= 2019 ? 5 : ano <= 2022 ? 3 : ano <= 2024 ? 1 : 0;
  c = Math.min(c, 25);

  // D — rastro/validação (máx. 15): aproximado
  let d = 0;
  if (p.diasParados > 100 && metas > 0) d += 10;
  if (!p.assunto) d += 8;
  d = Math.min(d, 15);

  // E — proximidade da baixa
  const e = p.tarefaAtual === 'Arquivar' ? 10 : p.tarefaAtual === 'Certificar trânsito em julgado' ? 6 : p.tarefaAtual === 'Concluso para decisão' ? 3 : 0;

  // F — situação
  const f = bloqueado ? 0 : filaEspera ? 0.3 : 1;

  const peso = Math.round(Math.min(a + b + c + d + e, 100) * f);
  const faixa: FaixaPeso = peso >= 70 ? 'critico' : peso >= 50 ? 'alto' : peso >= 30 ? 'medio' : 'normal';
  return { peso, faixa, filaEspera, bloqueado };
}

function calcularPrioridade(p: ProcessoObservado): PrioridadeTrabalho {
  if (p.diasParados > 30) return 'P1';
  if (p.etiquetas.some((e) => ['META 1', 'META 2', 'SAÚDE', 'JÚRI', 'IMPROBIDADE', 'SANEAMENTO'].includes(e) || e.startsWith('GAB_'))) return 'P2';
  return 'P3';
}

function situacaoDe(p: ProcessoObservado, analise?: AnaliseAnterior): SituacaoAnalise {
  if (!analise) return 'novo';
  return analise.ultimoMovimentoNaAnalise === p.ultimoMovimentoEm ? 'sem_novidade' : 'movimentou';
}

/** Ordem de trabalho do digito-core: dias parados desc → meta primeiro → peso desc → ano asc */
export function compararPrioridade(a: ProcessoFila, b: ProcessoFila): number {
  if (a.prioridade !== b.prioridade) return a.prioridade.localeCompare(b.prioridade);
  if (b.diasParados !== a.diasParados) return b.diasParados - a.diasParados;
  if (b.peso !== a.peso) return b.peso - a.peso;
  return a.numeroCnj.slice(9, 13).localeCompare(b.numeroCnj.slice(9, 13));
}

function paraFila(p: ProcessoObservado, origem: ProcessoFila['origem'], rng: () => number): ProcessoFila {
  const analise = obterAnalise(p.id);
  const situacao = situacaoDe(p, analise);
  const { peso, faixa, filaEspera } = calcularPeso(p);

  let statusItem: StatusItem = 'pendente';
  if (situacao === 'sem_novidade') statusItem = 'concluido';
  else if (rng() < 0.12) statusItem = 'em_andamento';

  return {
    ...p,
    prioridade: calcularPrioridade(p),
    peso,
    faixa,
    filaEspera,
    situacaoAnalise: situacao,
    analise,
    origem,
    statusItem,
    observacaoItem: statusItem === 'em_andamento' && rng() < 0.5 ? 'Em contato com o oficial de justiça.' : undefined,
  };
}

/**
 * Fila do usuário = processos que casam com o filtro de dígito ∪ processos das listas manuais dele.
 * Quando `filtro` é informado, substitui o filtro salvo do usuário (pré-visualização da configuração).
 */
export function montarFila(usuarioId: string, filtro?: FiltroDigito): ProcessoFila[] {
  const usuario = USUARIOS_UNIDADE.find((u) => u.id === usuarioId);
  if (!usuario) return [];
  const filtroEfetivo = filtro ?? usuario.filtroDigito;
  const rng = criarRng(7 + usuarioId.length);
  const vistos = new Set<string>();
  const fila: ProcessoFila[] = [];

  for (const p of ACERVO.processos) {
    if (casaFiltroDigito(p.numeroCnj, filtroEfetivo)) {
      vistos.add(p.id);
      fila.push(paraFila(p, { tipo: 'digito' }, rng));
    }
  }

  for (const lista of LISTAS_MANUAIS.filter((l) => l.servidorId === usuarioId)) {
    for (const id of lista.processoIds) {
      if (vistos.has(id)) continue;
      const p = ACERVO.processos.find((x) => x.id === id);
      if (!p) continue;
      vistos.add(id);
      fila.push(paraFila(p, { tipo: 'lista', listaId: lista.id, listaTitulo: lista.titulo }, rng));
    }
  }

  return fila.sort(compararPrioridade);
}

/** Acervo inteiro já como fila (para o chefe) */
export function montarAcervoCompleto(): ProcessoFila[] {
  const rng = criarRng(99);
  return ACERVO.processos.map((p) => paraFila(p, { tipo: 'digito' }, rng)).sort(compararPrioridade);
}

export function contarPorFiltro(filtro: FiltroDigito): number {
  return ACERVO.processos.filter((p) => casaFiltroDigito(p.numeroCnj, filtro)).length;
}
