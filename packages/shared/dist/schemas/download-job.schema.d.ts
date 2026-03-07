import { z } from 'zod';
export declare const CreateDownloadJobSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        by_number: "by_number";
        by_task: "by_task";
        by_tag: "by_tag";
    }>;
    credentials: z.ZodObject<{
        cpf: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
    taskName: z.ZodOptional<z.ZodString>;
    isFavorite: z.ZodDefault<z.ZodBoolean>;
    tagId: z.ZodOptional<z.ZodNumber>;
    tagName: z.ZodOptional<z.ZodString>;
    processNumbers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    documentType: z.ZodOptional<z.ZodNumber>;
    pjeProfileIndex: z.ZodOptional<z.ZodNumber>;
    pjeSessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const Submit2FASchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export declare const LoginSchema: z.ZodObject<{
    cpf: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const SelectProfileSchema: z.ZodObject<{
    sessionId: z.ZodString;
    profileIndex: z.ZodNumber;
}, z.core.$strip>;
export declare const GerarPlanilhaAdvogadosSchema: z.ZodObject<{
    credentials: z.ZodObject<{
        cpf: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
    fonte: z.ZodEnum<{
        by_task: "by_task";
        by_tag: "by_tag";
    }>;
    taskName: z.ZodOptional<z.ZodString>;
    isFavorite: z.ZodOptional<z.ZodBoolean>;
    tagId: z.ZodOptional<z.ZodNumber>;
    tagName: z.ZodOptional<z.ZodString>;
    pjeProfileIndex: z.ZodOptional<z.ZodNumber>;
    pjeSessionId: z.ZodOptional<z.ZodString>;
    filtro: z.ZodOptional<z.ZodObject<{
        tipo: z.ZodEnum<{
            nome: "nome";
            oab: "oab";
        }>;
        valor: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateDownloadJobInput = z.infer<typeof CreateDownloadJobSchema>;
export type Submit2FAInput = z.infer<typeof Submit2FASchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SelectProfileInput = z.infer<typeof SelectProfileSchema>;
export type GerarPlanilhaAdvogadosInput = z.infer<typeof GerarPlanilhaAdvogadosSchema>;
//# sourceMappingURL=download-job.schema.d.ts.map