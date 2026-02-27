import { CookieJar } from './cookie-jar';
import { PJE_REST_BASE, PJE_FRONTEND_ORIGIN, PJE_LEGACY_APP, MAX_REDIRECTS } from './constants';
import { resolveUrl } from './html-parser';
import type { FollowRedirectsResult } from './types';

export class PJEHttpClient {
  constructor(private cookieJar: CookieJar) {}

  async followRedirects(
    method: 'GET' | 'POST',
    url: string,
    body?: URLSearchParams,
  ): Promise<FollowRedirectsResult> {
    let currentUrl = url;
    let currentMethod = method;
    let currentBody: URLSearchParams | undefined = body;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const cookieStr = this.cookieJar.serializeForUrl(currentUrl);

      if (i <= 6) {
        const domain = safeDomain(currentUrl);
        const cookieNames = cookieStr ? cookieStr.split('; ').map(c => c.split('=')[0]) : [];
        console.log(`[PJE-AUTH]     → ${currentMethod} ${domain}${safePath(currentUrl)} cookies: [${cookieNames.join(', ')}]`);
      }

      const headers: Record<string, string> = {
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      };
      if (currentMethod === 'POST' && currentBody) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const res = await fetch(currentUrl, {
        method: currentMethod,
        headers,
        body: currentMethod === 'POST' && currentBody ? currentBody.toString() : undefined,
        redirect: 'manual',
      });

      this.cookieJar.extractFromResponse(res, currentUrl);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.text().catch(() => {});
        if (!location) break;

        let nextUrl = resolveUrl(location, currentUrl);

        const jsessionMatch = nextUrl.match(/;jsessionid=([^?&#]+)/);
        if (jsessionMatch) {
          const domain = safeDomain(nextUrl);
          console.log(`[PJE-AUTH]     (URL rewrite) jsessionid found for ${domain}`);
          this.cookieJar.setCookie(domain, 'JSESSIONID', jsessionMatch[1]);
        }

        console.log(`[PJE-AUTH]   redirect #${i + 1}: ${res.status} ${truncUrl(currentUrl)} → ${truncUrl(nextUrl)}`);
        currentUrl = nextUrl;
        currentMethod = 'GET';
        currentBody = undefined;
        continue;
      }

      return { body: await res.text(), finalUrl: currentUrl, status: res.status };
    }
    throw new Error(`Excedido limite de ${MAX_REDIRECTS} redirects`);
  }

  async apiGet<T = any>(endpoint: string, idUsuarioLocalizacao: string): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildRestHeaders(idUsuarioLocalizacao),
      redirect: 'follow',
    });
    this.cookieJar.extractFromResponse(res, url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  async apiPost<T = any>(endpoint: string, body: Record<string, unknown>, idUsuarioLocalizacao: string): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildRestHeaders(idUsuarioLocalizacao),
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    this.cookieJar.extractFromResponse(res, url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private buildRestHeaders(idUsuarioLocalizacao: string): Record<string, string> {
    const cookieStr = this.cookieJar.serializeForUrl(PJE_REST_BASE);
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': PJE_LEGACY_APP,
      'Origin': PJE_FRONTEND_ORIGIN,
      'Referer': `${PJE_FRONTEND_ORIGIN}/`,
      'X-pje-cookies': cookieStr,
      'X-pje-usuario-localizacao': idUsuarioLocalizacao,
      'Cookie': cookieStr,
    };
  }
}

function safeDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return '?'; }
}

function safePath(url: string): string {
  try { return new URL(url).pathname.substring(0, 50); } catch { return ''; }
}

function truncUrl(url: string): string {
  try {
    const u = new URL(url);
    const search = u.search.length > 40 ? u.search.substring(0, 40) + '...' : u.search;
    return `${u.hostname}${u.pathname}${search}`;
  } catch { return url.substring(0, 100); }
}
