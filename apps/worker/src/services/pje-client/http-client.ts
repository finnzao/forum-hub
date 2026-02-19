// ============================================================
// apps/worker/src/services/pje-client/http-client.ts
// HTTP Client — gerencia cookies, sessão e requisições ao PJE
// ============================================================

import { config } from '../../config';

export interface PJESession {
  cookies: Record<string, string>;
  idUsuarioLocalizacao: string;
  idUsuario: number;
  nomeUsuario: string;
  perfil: string;
  createdAt: number;
}

export class PJEHttpClient {
  private cookies: Record<string, string> = {};
  private idUsuarioLocalizacao: string = '';
  private baseUrl: string;
  private restBase: string;

  constructor() {
    this.baseUrl = config.pje.baseUrl;
    this.restBase = `${this.baseUrl}${config.pje.restBase}`;
  }

  // ── Gestão de sessão ───────────────────────────────────

  setSession(session: PJESession): void {
    this.cookies = { ...session.cookies };
    this.idUsuarioLocalizacao = session.idUsuarioLocalizacao;
  }

  getSession(): PJESession | null {
    if (!this.idUsuarioLocalizacao) return null;
    return {
      cookies: { ...this.cookies },
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: 0,
      nomeUsuario: '',
      perfil: '',
      createdAt: Date.now(),
    };
  }

  // ── Requisições REST (API JSON do PJE) ─────────────────

  async apiGet<T = any>(endpoint: string): Promise<T> {
    const url = `${this.restBase}/${endpoint}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildRestHeaders(),
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new PJEHttpError(res.status, `GET ${endpoint} falhou: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  async apiPost<T = any>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.restBase}/${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildRestHeaders(),
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new PJEHttpError(res.status, `POST ${endpoint} falhou: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  // ── Requisições web (HTML/forms do PJE) ────────────────

  async webGet(path: string, params?: Record<string, string>): Promise<string> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: { Cookie: this.serializeCookies() },
      redirect: 'follow',
    });

    this.extractCookies(res);
    return res.text();
  }

  async webPost(
    url: string,
    body: string | URLSearchParams,
    contentType = 'application/x-www-form-urlencoded'
  ): Promise<{ html: string; status: number; headers: Headers; url: string }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Cookie: this.serializeCookies(),
      },
      body: body.toString(),
      redirect: 'follow',
    });

    this.extractCookies(res);

    return {
      html: await res.text(),
      status: res.status,
      headers: res.headers,
      url: res.url,
    };
  }

  async webPostAjax(path: string, body: URLSearchParams): Promise<string> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: this.serializeCookies(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
      redirect: 'follow',
    });

    this.extractCookies(res);
    return res.text();
  }

  // ── Download binário ───────────────────────────────────

  async downloadFile(url: string): Promise<Buffer> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Cookie: this.serializeCookies() },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new PJEHttpError(res.status, `Download falhou: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── SSO (login) ────────────────────────────────────────

  async ssoGet(url: string): Promise<{ html: string; finalUrl: string }> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Cookie: this.serializeCookies() },
      redirect: 'follow',
    });

    this.extractCookies(res);
    return { html: await res.text(), finalUrl: res.url };
  }

  async ssoPost(
    url: string,
    body: URLSearchParams
  ): Promise<{ html: string; status: number; finalUrl: string }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.serializeCookies(),
      },
      body: body.toString(),
      redirect: 'follow',
    });

    this.extractCookies(res);

    return {
      html: await res.text(),
      status: res.status,
      finalUrl: res.url,
    };
  }

  // ── Helpers privados ───────────────────────────────────

  private buildRestHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': config.pje.legacyApp,
      Origin: config.pje.frontendOrigin,
      Referer: `${config.pje.frontendOrigin}/`,
      'X-pje-cookies': this.serializeCookies(),
      'X-pje-usuario-localizacao': this.idUsuarioLocalizacao,
      Cookie: this.serializeCookies(),
    };
  }

  private serializeCookies(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private extractCookies(res: Response): void {
    const setCookie = res.headers.getSetCookie?.() || [];
    for (const cookie of setCookie) {
      const [pair] = cookie.split(';');
      const [name, ...valueParts] = pair.split('=');
      if (name && valueParts.length > 0) {
        this.cookies[name.trim()] = valueParts.join('=').trim();
      }
    }
  }

  setLocalizacao(id: string): void {
    this.idUsuarioLocalizacao = id;
  }

  setCookies(cookies: Record<string, string>): void {
    this.cookies = { ...this.cookies, ...cookies };
  }
}

export class PJEHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'PJEHttpError';
  }
}
