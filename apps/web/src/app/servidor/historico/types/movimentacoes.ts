// Tipos de movimentação processual — fonte única (importável em qualquer módulo)

export type TipoMovimentacao =
  | 'despacho' | 'decisao' | 'decisao_interlocutoria' | 'sentenca'
  | 'sentenca_homologatoria' | 'acordao' | 'voto'
  | 'certidao' | 'certidao_transito' | 'certidao_objeto_pe'
  | 'intimacao' | 'citacao' | 'notificacao'
  | 'juntada' | 'juntada_peticao' | 'juntada_documento'
  | 'oficio' | 'publicacao' | 'remessa' | 'recebimento'
  | 'distribuicao' | 'redistribuicao' | 'autuacao' | 'conclusao' | 'vista'
  | 'audiencia' | 'audiencia_conciliacao' | 'audiencia_instrucao' | 'sessao_julgamento'
  | 'calculo' | 'cumprimento' | 'penhora' | 'avaliacao'
  | 'arrematacao' | 'adjudicacao' | 'hasta_publica'
  | 'mandado' | 'carta_precatoria' | 'carta_rogatoria' | 'carta_ordem' | 'deprecata'
  | 'peticao' | 'contestacao' | 'replica' | 'recurso' | 'apelacao'
  | 'agravo' | 'embargos' | 'contrarrazoes' | 'parecer'
  | 'laudo' | 'laudo_pericial' | 'ata' | 'termo'
  | 'alvara' | 'guia_deposito' | 'guia_levantamento' | 'edital'
  | 'baixa' | 'arquivamento' | 'desarquivamento'
  | 'sobrestamento' | 'dessobrestamento' | 'suspensao'
  | 'retificacao' | 'emenda' | 'desistencia' | 'renuncio' | 'outro';

export const TIPOS_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  despacho: 'Despacho',
  decisao: 'Decisão',
  decisao_interlocutoria: 'Decisão Interlocutória',
  sentenca: 'Sentença',
  sentenca_homologatoria: 'Sent. Homologatória',
  acordao: 'Acórdão',
  voto: 'Voto',
  certidao: 'Certidão',
  certidao_transito: 'Cert. Trânsito em Julgado',
  certidao_objeto_pe: 'Cert. Objeto e Pé',
  intimacao: 'Intimação',
  citacao: 'Citação',
  notificacao: 'Notificação',
  juntada: 'Juntada',
  juntada_peticao: 'Juntada de Petição',
  juntada_documento: 'Juntada de Documento',
  oficio: 'Ofício',
  publicacao: 'Publicação',
  remessa: 'Remessa',
  recebimento: 'Recebimento',
  distribuicao: 'Distribuição',
  redistribuicao: 'Redistribuição',
  autuacao: 'Autuação',
  conclusao: 'Conclusão',
  vista: 'Vista',
  audiencia: 'Audiência',
  audiencia_conciliacao: 'Aud. Conciliação',
  audiencia_instrucao: 'Aud. Instrução',
  sessao_julgamento: 'Sessão de Julgamento',
  calculo: 'Cálculo',
  cumprimento: 'Cumprimento',
  penhora: 'Penhora',
  avaliacao: 'Avaliação',
  arrematacao: 'Arrematação',
  adjudicacao: 'Adjudicação',
  hasta_publica: 'Hasta Pública',
  mandado: 'Mandado',
  carta_precatoria: 'Carta Precatória',
  carta_rogatoria: 'Carta Rogatória',
  carta_ordem: 'Carta de Ordem',
  deprecata: 'Deprecata',
  peticao: 'Petição',
  contestacao: 'Contestação',
  replica: 'Réplica',
  recurso: 'Recurso',
  apelacao: 'Apelação',
  agravo: 'Agravo',
  embargos: 'Embargos',
  contrarrazoes: 'Contrarrazões',
  parecer: 'Parecer',
  laudo: 'Laudo',
  laudo_pericial: 'Laudo Pericial',
  ata: 'Ata',
  termo: 'Termo',
  alvara: 'Alvará',
  guia_deposito: 'Guia de Depósito',
  guia_levantamento: 'Guia de Levantamento',
  edital: 'Edital',
  baixa: 'Baixa',
  arquivamento: 'Arquivamento',
  desarquivamento: 'Desarquivamento',
  sobrestamento: 'Sobrestamento',
  dessobrestamento: 'Dessobrestamento',
  suspensao: 'Suspensão',
  retificacao: 'Retificação',
  emenda: 'Emenda',
  desistencia: 'Desistência',
  renuncio: 'Renúncia',
  outro: 'Outro',
};

export const CATEGORIAS_MOVIMENTACAO: Record<string, TipoMovimentacao[]> = {
  'Atos do Juiz': ['despacho', 'decisao', 'decisao_interlocutoria', 'sentenca', 'sentenca_homologatoria', 'acordao', 'voto'],
  'Secretaria / Cartório': ['certidao', 'certidao_transito', 'certidao_objeto_pe', 'intimacao', 'citacao', 'notificacao', 'juntada', 'juntada_peticao', 'juntada_documento', 'oficio', 'publicacao', 'remessa', 'recebimento', 'distribuicao', 'redistribuicao', 'autuacao', 'conclusao', 'vista'],
  'Audiências': ['audiencia', 'audiencia_conciliacao', 'audiencia_instrucao', 'sessao_julgamento'],
  'Cumprimento / Execução': ['calculo', 'cumprimento', 'penhora', 'avaliacao', 'arrematacao', 'adjudicacao', 'hasta_publica'],
  'Comunicações': ['mandado', 'carta_precatoria', 'carta_rogatoria', 'carta_ordem', 'deprecata'],
  'Manifestações / Peças': ['peticao', 'contestacao', 'replica', 'recurso', 'apelacao', 'agravo', 'embargos', 'contrarrazoes', 'parecer', 'laudo', 'laudo_pericial', 'ata', 'termo'],
  'Documentos / Ordens': ['alvara', 'guia_deposito', 'guia_levantamento', 'edital'],
  'Arquivo': ['baixa', 'arquivamento', 'desarquivamento', 'sobrestamento', 'dessobrestamento', 'suspensao'],
  'Outros': ['retificacao', 'emenda', 'desistencia', 'renuncio', 'outro'],
};
