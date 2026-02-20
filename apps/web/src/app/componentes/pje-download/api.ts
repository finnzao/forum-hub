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

async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/api/pje/downloads${path}`;

  logger.debug(MOD, `${options.method || 'GET'} ${path}`, {
    url,
    body: options.body ? JSON.parse(options.body as string) : undefined,
  });

  const headers = {
    ...getAuthHeaders(CURRENT_USER.id, CURRENT_USER.name, CURRENT_USER.role),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = data.error || `HTTP ${res.status}`;
    logger.error(MOD, `Resposta ${res.status} para ${path}`, data);
    throw new Error(errMsg);
  }

  const data = await res.json();
  logger.debug(MOD, `Resposta OK para ${path}`, data);
  return data as T;
}

// ── Autenticação PJE (proxy via API backend) ─────────────────

export interface LoginParams {
  cpf: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  needs2FA: boolean;
  user?: UsuarioPJE;
  profiles?: PerfilPJE[];
  error?: string;
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
  success: boolean;
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
