export class CookieJar {
  private jar = new Map<string, Record<string, string>>();

  private getDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return 'unknown'; }
  }

  extractFromResponse(res: Response, requestUrl: string): void {
    const domain = this.getDomain(requestUrl);
    const setCookieHeaders: string[] = (res.headers as any).getSetCookie?.() || [];

    if (setCookieHeaders.length === 0) {
      const raw = res.headers.get('set-cookie');
      if (raw) setCookieHeaders.push(...raw.split(/,(?=\s*\w+=)/));
    }

    if (setCookieHeaders.length === 0) return;

    if (!this.jar.has(domain)) this.jar.set(domain, {});
    const domainCookies = this.jar.get(domain)!;

    const newCookies: string[] = [];
    for (const raw of setCookieHeaders) {
      const [pair] = raw.split(';');
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (name && !name.startsWith('__')) {
          domainCookies[name] = value;
          newCookies.push(name);
        }
      }
    }

    if (newCookies.length > 0) {
      console.log(`[PJE-AUTH]     cookies set by ${domain}: ${newCookies.join(', ')}`);
    }
  }

  serializeForUrl(url: string): string {
    const requestDomain = this.getDomain(url);
    const allCookies: Record<string, string> = {};
    for (const [domain, cookies] of this.jar) {
      if (requestDomain === domain || requestDomain.endsWith('.' + domain)) {
        Object.assign(allCookies, cookies);
      }
    }
    return Object.entries(allCookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  getCookie(domain: string, name: string): string | undefined {
    return this.jar.get(domain)?.[name];
  }

  setCookie(domain: string, name: string, value: string): void {
    if (!this.jar.has(domain)) this.jar.set(domain, {});
    this.jar.get(domain)![name] = value;
  }

  exportAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [domain, cookies] of this.jar) {
      for (const [name, value] of Object.entries(cookies)) {
        result[`${domain}::${name}`] = value;
      }
    }
    return result;
  }

  importAll(flat: Record<string, string>): void {
    for (const [key, value] of Object.entries(flat)) {
      const sepIdx = key.indexOf('::');
      if (sepIdx > 0) {
        const domain = key.slice(0, sepIdx);
        const name = key.slice(sepIdx + 2);
        if (!this.jar.has(domain)) this.jar.set(domain, {});
        this.jar.get(domain)![name] = value;
      } else {
        if (!this.jar.has('pje.tjba.jus.br')) this.jar.set('pje.tjba.jus.br', {});
        this.jar.get('pje.tjba.jus.br')![key] = value;
      }
    }
  }

  debugDump(): string {
    const parts: string[] = [];
    for (const [domain, cookies] of this.jar) {
      const names = Object.keys(cookies);
      parts.push(`  ${domain}: [${names.join(', ')}]`);
    }
    return parts.join('\n');
  }

  get size(): number {
    let count = 0;
    for (const cookies of this.jar.values()) count += Object.keys(cookies).length;
    return count;
  }

  summary(): string {
    const parts: string[] = [];
    for (const [domain, cookies] of this.jar) parts.push(`${domain}(${Object.keys(cookies).length})`);
    return parts.join(', ');
  }

  clear(): void { this.jar.clear(); }
}
