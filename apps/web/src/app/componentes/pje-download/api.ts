// ============================================================
// apps/web/src/app/componentes/pje-download/api.ts
// Cliente HTTP para a API PJE Download
//
// Todas as funções retornam o conteúdo de `data` já extraído
// do envelope { success, data, timestamp } via unwrapResponse.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PJE_PREFIX = `${API_BASE}/api/pje/downloads`;
const AUTH_PREFIX = `${PJE_PREFIX}/auth`;

// ── Erro tipado ──────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── unwrapResponse: extrai `data` do envelope padronizado ────

async function unwrapResponse<T = unknown>(res: Response): Promise<T> {
  let body: any;

  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, `Resposta inválida do servidor (status ${res.status}).`);
  }

  if (!res.ok || body?.success === false) {
    const errMsg =
      body?.error?.message ||
      body?.message ||
      `Erro ${res.status}: ${res.statusText}`;
    throw new ApiError(res.status, errMsg, body);
  }

  // Extrair data do envelope { success: true, data: T }
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}

// ── Header de autenticação ───────────────────────────────────

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user': JSON.stringify({ id: 1, name: 'Magistrado', role: 'magistrado' }),
  };
}

// ══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO PJE (chamadas reais via proxy no backend)
// ══════════════════════════════════════════════════════════════

export interface LoginResponse {
  needs2FA: boolean;
  /** ID da sessão no backend — necessário para 2FA e perfil */
  sessionId?: string;
  user?: {
    idUsuario: number;
    nomeUsuario: string;
    login: string;
    perfil: string;
    nomePerfil: string;
    idUsuarioLocalizacaoMagistradoServidor: number;
  };
  profiles?: Array<{
    indice: number;
    nome: string;
    orgao: string;
    favorito: boolean;
  }>;
}

export interface ProfileResponse {
  tasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  favoriteTasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  tags: Array<{ id: number; nomeTag: string; nomeTagCompleto: string; favorita: boolean }>;
}

/** POST /auth/login */
export async function loginPJE(credentials: {
  cpf: string;
  password: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_PREFIX}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return unwrapResponse<LoginResponse>(res);
}

/** POST /auth/2fa */
export async function enviar2FA(
  sessionId: string,
  code: string,
): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_PREFIX}/2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code }),
  });
  return unwrapResponse<LoginResponse>(res);
}

/** POST /auth/profile — agora envia sessionId */
export async function selecionarPerfil(
  sessionId: string,
  profileIndex: number,
): Promise<ProfileResponse> {
  const res = await fetch(`${AUTH_PREFIX}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, profileIndex }),
  });
  return unwrapResponse<ProfileResponse>(res);
}

// ══════════════════════════════════════════════════════════════
// JOBS DE DOWNLOAD
// ══════════════════════════════════════════════════════════════

import type {
  CreateDownloadJobDTO,
  DownloadJobResponse,
  PJEDownloadProgress,
} from 'shared';

export async function criarJob(dto: CreateDownloadJobDTO): Promise<DownloadJobResponse> {
  const res = await fetch(PJE_PREFIX, { method: 'POST', headers: authHeaders(), body: JSON.stringify(dto) });
  return unwrapResponse<DownloadJobResponse>(res);
}

export async function listarJobs(limit = 20, offset = 0): Promise<{ jobs: DownloadJobResponse[]; total: number }> {
  const res = await fetch(`${PJE_PREFIX}?limit=${limit}&offset=${offset}`, { headers: authHeaders() });
  return unwrapResponse<{ jobs: DownloadJobResponse[]; total: number }>(res);
}

export async function obterJob(jobId: string): Promise<DownloadJobResponse> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}`, { headers: authHeaders() });
  return unwrapResponse<DownloadJobResponse>(res);
}

export async function obterProgresso(jobId: string): Promise<PJEDownloadProgress | null> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}/progress`, { headers: authHeaders() });
  return unwrapResponse<PJEDownloadProgress | null>(res);
}

export async function enviar2FAJob(jobId: string, code: string): Promise<{ message: string }> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}/2fa`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ code }) });
  return unwrapResponse<{ message: string }>(res);
}

export async function cancelarJob(jobId: string): Promise<{ message: string }> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}`, { method: 'DELETE', headers: authHeaders() });
  return unwrapResponse<{ message: string }>(res);
}

export async function obterArquivos(jobId: string): Promise<unknown[]> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}/files`, { headers: authHeaders() });
  return unwrapResponse<unknown[]>(res);
}

export async function obterAuditoria(jobId: string): Promise<unknown[]> {
  const res = await fetch(`${PJE_PREFIX}/${jobId}/audit`, { headers: authHeaders() });
  return unwrapResponse<unknown[]>(res);
}
