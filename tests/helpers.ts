import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(): void {
  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado em scripts/.env');
    console.error('   Copie .env.example para .env e preencha com suas credenciais');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

export const API_BASE = process.env.API_BASE || 'http://localhost:3001';
export const PJE_CPF = process.env.PJE_CPF || '';
export const PJE_PASSWORD = process.env.PJE_PASSWORD || '';
export const PJE_PROFILE_INDEX = parseInt(process.env.PJE_PROFILE_INDEX || '-1', 10);

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-user': JSON.stringify({ id: 1, name: 'Test User', role: 'magistrado' }),
};

export function validateCredentials(): void {
  if (!PJE_CPF || PJE_CPF === '00000000000') {
    console.error('❌ PJE_CPF não configurado no .env');
    process.exit(1);
  }
  if (!PJE_PASSWORD || PJE_PASSWORD === 'sua_senha_aqui') {
    console.error('❌ PJE_PASSWORD não configurado no .env');
    process.exit(1);
  }
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json() as any;
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`${res.status} ${msg}`);
  }
  return (json?.data ?? json) as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  const json = await res.json() as any;
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`${res.status} ${msg}`);
  }
  return (json?.data ?? json) as T;
}

export function log(emoji: string, msg: string, data?: unknown): void {
  console.log(`${emoji} ${msg}`);
  if (data !== undefined) {
    console.log(typeof data === 'string' ? `   ${data}` : JSON.stringify(data, null, 2));
  }
}

export function separator(title: string): void {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(50)}\n`);
}
