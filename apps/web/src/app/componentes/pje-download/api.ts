// ============================================================
// app/componentes/pje-download/api.ts
// Camada de serviço para comunicação com a API PJE
// Todas as chamadas são logadas pelo logger em modo dev
// ============================================================

import type {
  DownloadJobResponse,
  PJEDownloadProgress,
  PJEDownloadMode,
  UsuarioPJE,
  PerfilPJE,
  TarefaPJE,
  EtiquetaPJE,
} from './tipos';
import { logger } from './logger';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MOD = 'API';

// ── Helpers internos ─────────────────────────────────────────

function getAuthHeaders(userId: number, name: string, role: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user': JSON.stringify({ id: userId, name, role }),
  };
}

// TODO: Em produção, obter do contexto de autenticação
const CURRENT_USER = { id: 1, name: 'Dr. João Magistrado', role: 'magistrado' };

/**
 * Formata detalhes do erro para exibição nos logs
 */
function formatErrorDetails(err: unknown): { message: string; details: Record<string, unknown> } {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return {
      message: `Servidor indisponível (${API_BASE}). Verifique se a API está em execução.`,
      details: {
        tipo: 'NETWORK_ERROR',
        causa: 'Failed to fetch — não foi possível conectar ao servidor',
        url: API_BASE,
        dica: 'Verifique se o servidor da API está rodando e acessível',
      },
    };
  }

  if (err instanceof DOMException && err.name === 'AbortError') {
    return {
      message: 'Requisição cancelada por timeout.',
      details: { tipo: 'TIMEOUT', causa: err.message },
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
      details: {
        tipo: err.name,
        causa: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join(' → '),
      },
    };
  }

  return {
    message: String(err),
    details: { tipo: 'UNKNOWN', valor: err },
  };
}

async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/api/pje/downloads${path}`;
  const method = options.method || 'GET';
  const inicio = performance.now();

  logger.debug(MOD, `→ ${method} ${path}`, {
    url,
    body: options.body ? JSON.parse(options.body as string) : undefined,
  });

  const headers = {
    ...getAuthHeaders(CURRENT_USER.id, CURRENT_USER.name, CURRENT_USER.role),
    ...(options.headers as Record<string, string>),
  };

  let res: Response;

  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const duracao = (performance.now() - inicio).toFixed(0);
    const { message, details } = formatErrorDetails(err);

    logger.error(MOD, `✗ ${method} ${path} — ${message} (${duracao}ms)`, details);

    throw new ApiError(message, 0, details);
  }

  const duracao = (performance.now() - inicio).toFixed(0);

  if (!res.ok) {
    let data: Record<string, unknown> = {};
    let bodyText = '';

    try {
      bodyText = await res.text();
      data = JSON.parse(bodyText);
    } catch {
      data = { rawBody: bodyText || '(corpo vazio)' };
    }

    const errMsg = (data.error as string) || `HTTP ${res.status} ${res.statusText}`;

    logger.error(MOD, `✗ ${method} ${path} → ${res.status} ${res.statusText} (${duracao}ms)`, {
      status: res.status,
      statusText: res.statusText,
      url,
      resposta: data,
      headers: Object.fromEntries(res.headers.entries()),
    });

    throw new ApiError(errMsg, res.status, data);
  }

  const data = await res.json();
  logger.debug(MOD, `✓ ${method} ${path} → ${res.status} (${duracao}ms)`, data);
  return data as T;
}

/**
 * Erro tipado da API com status HTTP e dados da resposta
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Autenticação PJE (proxy via API backend) ─────────────────

export interface LoginParams {
  cpf: string;
  password: string;
}

export interface LoginResult {
  needs2FA: boolean;
  user?: UsuarioPJE;
  profiles?: PerfilPJE[];
}

export async function loginPJE(params: LoginParams): Promise<LoginResult> {
  return logger.time(MOD, 'loginPJE', async () => {
    return apiRequest<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  });
}

export async function enviar2FA(jobIdOuSessionId: string, code: string): Promise<LoginResult> {
  return logger.time(MOD, 'enviar2FA', async () => {
    return apiRequest<LoginResult>('/auth/2fa', {
      method: 'POST',
      body: JSON.stringify({ sessionId: jobIdOuSessionId, code }),
    });
  });
}

export async function selecionarPerfil(indicePerfil: number): Promise<{
  tasks: TarefaPJE[];
  favoriteTasks: TarefaPJE[];
  tags: EtiquetaPJE[];
}> {
  return logger.time(MOD, `selecionarPerfil(${indicePerfil})`, async () => {
    return apiRequest('/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ profileIndex: indicePerfil }),
    });
  });
}

// ── Jobs de download ─────────────────────────────────────────

export interface CreateJobParams {
  mode: PJEDownloadMode;
  credentials: { cpf: string; password: string };
  processNumbers?: string[];
  taskName?: string;
  isFavorite?: boolean;
  tagId?: number;
  tagName?: string;
  documentType?: number;
  pjeProfileIndex?: number;
}

export async function criarJob(params: CreateJobParams): Promise<DownloadJobResponse> {
  return logger.time(MOD, `criarJob(${params.mode})`, async () => {
    return apiRequest<DownloadJobResponse>('/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  });
}

export async function listarJobs(
  limit = 20,
  offset = 0,
): Promise<{ jobs: DownloadJobResponse[]; total: number }> {
  return apiRequest(`/?limit=${limit}&offset=${offset}`);
}

export async function obterProgresso(jobId: string): Promise<PJEDownloadProgress | null> {
  return apiRequest(`/${jobId}/progress`);
}

export async function cancelarJob(jobId: string): Promise<void> {
  return logger.time(MOD, `cancelarJob(${jobId.slice(0, 8)})`, async () => {
    await apiRequest(`/${jobId}`, { method: 'DELETE' });
  });
}

export async function enviar2FAJob(jobId: string, code: string): Promise<void> {
  return logger.time(MOD, `enviar2FAJob(${jobId.slice(0, 8)})`, async () => {
    await apiRequest(`/${jobId}/2fa`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  });
}

// ── Dados do PJE (tarefas, etiquetas) ────────────────────────
// Nota: esses endpoints são expostos pela API do backend como
// proxy autenticado para o PJE REST. Usam a sessão armazenada.

export async function listarTarefas(): Promise<TarefaPJE[]> {
  return logger.time(MOD, 'listarTarefas', async () => {
    return apiRequest<TarefaPJE[]>('/pje/tasks');
  });
}

export async function listarTarefasFavoritas(): Promise<TarefaPJE[]> {
  return logger.time(MOD, 'listarTarefasFavoritas', async () => {
    return apiRequest<TarefaPJE[]>('/pje/tasks/favorites');
  });
}

export async function listarEtiquetas(busca = ''): Promise<EtiquetaPJE[]> {
  return logger.time(MOD, `listarEtiquetas("${busca}")`, async () => {
    const qs = busca ? `?search=${encodeURIComponent(busca)}` : '';
    return apiRequest<EtiquetaPJE[]>(`/pje/tags${qs}`);
  });
}