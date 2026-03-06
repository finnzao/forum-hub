export interface AdvogadoInfo {
    nome: string;
    oab?: string;
    cpf?: string;
    tipoParte: 'ATIVO' | 'PASSIVO';
}
export interface ProcessoAdvogados {
    numeroProcesso: string;
    idProcesso: number;
    poloAtivo: string;
    poloPassivo: string;
    classeJudicial?: string;
    assuntoPrincipal?: string;
    orgaoJulgador?: string;
    advogadosPoloAtivo: AdvogadoInfo[];
    advogadosPoloPassivo: AdvogadoInfo[];
    erro?: string;
}
export interface GerarPlanilhaAdvogadosDTO {
    credentials: {
        cpf: string;
        password: string;
    };
    fonte: 'by_task' | 'by_tag';
    taskName?: string;
    isFavorite?: boolean;
    tagId?: number;
    tagName?: string;
    pjeProfileIndex?: number;
    pjeSessionId?: string;
    filtro?: FiltroAdvogado;
}
export interface FiltroAdvogado {
    tipo: 'nome' | 'oab';
    valor: string;
}
export interface PlanilhaAdvogadosProgress {
    jobId: string;
    status: 'listing' | 'extracting' | 'generating' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    totalProcesses: number;
    processedCount: number;
    currentProcess?: string;
    message: string;
    timestamp: number;
}
export interface PlanilhaAdvogadosResult {
    jobId: string;
    totalProcesses: number;
    processedCount: number;
    filteredCount: number;
    fileName?: string;
    filePath?: string;
    errors: Array<{
        processo: string;
        message: string;
    }>;
}
