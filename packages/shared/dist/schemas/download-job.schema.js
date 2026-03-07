"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GerarPlanilhaAdvogadosSchema = exports.SelectProfileSchema = exports.LoginSchema = exports.Submit2FASchema = exports.CreateDownloadJobSchema = void 0;
const zod_1 = require("zod");
exports.CreateDownloadJobSchema = zod_1.z.object({
    mode: zod_1.z.enum(['by_number', 'by_task', 'by_tag']),
    credentials: zod_1.z.object({
        cpf: zod_1.z.string().regex(/^\d{11}$/, 'CPF deve ter exatamente 11 dígitos'),
        password: zod_1.z.string().min(1, 'Senha é obrigatória'),
    }),
    taskName: zod_1.z.string().optional(),
    isFavorite: zod_1.z.boolean().default(false),
    tagId: zod_1.z.number().optional(),
    tagName: zod_1.z.string().optional(),
    processNumbers: zod_1.z.array(zod_1.z.string()).max(500).optional(),
    documentType: zod_1.z.number().optional(),
    pjeProfileIndex: zod_1.z.number().optional(),
    pjeSessionId: zod_1.z.string().optional(),
}).refine((data) => {
    if (data.mode === 'by_task')
        return !!data.taskName?.trim();
    if (data.mode === 'by_tag')
        return !!data.tagId || !!data.tagName?.trim();
    if (data.mode === 'by_number')
        return (data.processNumbers?.length ?? 0) > 0;
    return false;
}, { message: 'Parâmetros insuficientes para o modo selecionado' });
exports.Submit2FASchema = zod_1.z.object({
    code: zod_1.z.string().regex(/^\d{6}$/, 'Código 2FA deve ter 6 dígitos'),
});
exports.LoginSchema = zod_1.z.object({
    cpf: zod_1.z.string().min(1, 'CPF é obrigatório'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória'),
});
exports.SelectProfileSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1, 'sessionId obrigatório'),
    profileIndex: zod_1.z.number(),
});
exports.GerarPlanilhaAdvogadosSchema = zod_1.z.object({
    credentials: zod_1.z.object({
        cpf: zod_1.z.string().min(1),
        password: zod_1.z.string().min(1),
    }),
    fonte: zod_1.z.enum(['by_task', 'by_tag']),
    taskName: zod_1.z.string().optional(),
    isFavorite: zod_1.z.boolean().optional(),
    tagId: zod_1.z.number().optional(),
    tagName: zod_1.z.string().optional(),
    pjeProfileIndex: zod_1.z.number().optional(),
    pjeSessionId: zod_1.z.string().optional(),
    filtro: zod_1.z.object({
        tipo: zod_1.z.enum(['nome', 'oab']),
        valor: zod_1.z.string(),
    }).optional(),
}).refine((data) => {
    if (data.fonte === 'by_task')
        return !!data.taskName?.trim();
    if (data.fonte === 'by_tag')
        return !!data.tagId;
    return false;
}, { message: 'Parâmetros insuficientes para a fonte selecionada' });
//# sourceMappingURL=download-job.schema.js.map