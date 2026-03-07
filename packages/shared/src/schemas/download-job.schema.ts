import { z } from 'zod';

export const CreateDownloadJobSchema = z.object({
  mode: z.enum(['by_number', 'by_task', 'by_tag']),
  credentials: z.object({
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter exatamente 11 dígitos'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
  taskName: z.string().optional(),
  isFavorite: z.boolean().default(false),
  tagId: z.number().optional(),
  tagName: z.string().optional(),
  processNumbers: z.array(z.string()).max(500).optional(),
  documentType: z.number().optional(),
  pjeProfileIndex: z.number().optional(),
  pjeSessionId: z.string().optional(),
}).refine(
  (data) => {
    if (data.mode === 'by_task') return !!data.taskName?.trim();
    if (data.mode === 'by_tag') return !!data.tagId || !!data.tagName?.trim();
    if (data.mode === 'by_number') return (data.processNumbers?.length ?? 0) > 0;
    return false;
  },
  { message: 'Parâmetros insuficientes para o modo selecionado' }
);

export const Submit2FASchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Código 2FA deve ter 6 dígitos'),
});

export const LoginSchema = z.object({
  cpf: z.string().min(1, 'CPF é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const SelectProfileSchema = z.object({
  sessionId: z.string().min(1, 'sessionId obrigatório'),
  profileIndex: z.number(),
});

export const GerarPlanilhaAdvogadosSchema = z.object({
  credentials: z.object({
    cpf: z.string().min(1),
    password: z.string().min(1),
  }),
  fonte: z.enum(['by_task', 'by_tag']),
  taskName: z.string().optional(),
  isFavorite: z.boolean().optional(),
  tagId: z.number().optional(),
  tagName: z.string().optional(),
  pjeProfileIndex: z.number().optional(),
  pjeSessionId: z.string().optional(),
  filtro: z.object({
    tipo: z.enum(['nome', 'oab']),
    valor: z.string(),
  }).optional(),
}).refine(
  (data) => {
    if (data.fonte === 'by_task') return !!data.taskName?.trim();
    if (data.fonte === 'by_tag') return !!data.tagId;
    return false;
  },
  { message: 'Parâmetros insuficientes para a fonte selecionada' }
);

export type CreateDownloadJobInput = z.infer<typeof CreateDownloadJobSchema>;
export type Submit2FAInput = z.infer<typeof Submit2FASchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SelectProfileInput = z.infer<typeof SelectProfileSchema>;
export type GerarPlanilhaAdvogadosInput = z.infer<typeof GerarPlanilhaAdvogadosSchema>;
