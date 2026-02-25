// ============================================================
// apps/api/src/modules/pje-download/services/pje-auth-proxy.service.ts
// Proxy de autenticação PJE — login real no SSO do TJBA
//
// Correções v11:
//  - BUG PRINCIPAL CORRIGIDO: o POST ao SSO enviava apenas
//    (username, password, credentialId) mas o form Keycloak do
//    PJE-TJBA tem campos customizados (pjeoffice-code, phrase).
//    Agora extraímos TODOS os campos do form (hidden + visible)
//    e fazemos merge com username/password.
//  - Sessão persistida por CPF: reutiliza sessão ativa sem re-login
//  - Log detalhado dos cookies enviados em cada redirect hop
//  - Detecção de ;jsessionid= em Location (JBoss Seam URL rewriting)
// ============================================================

const PJE_BASE = 'https://pje.tjba.jus.br';
const PJE_REST_BASE = `${PJE_BASE}/pje/seam/resource/rest/pje-legacy`;
const PJE_FRONTEND_ORIGIN = 'https://frontend.cloud.pje.jus.br';
const PJE_LEGACY_APP = 'pje-tjba-1g';
const MAX_REDIRECTS = 25;

// ── Tipos ─────────────────────────────────────────────────────

export interface PJELoginResult {
  needs2FA: boolean;
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
  error?: string;
}

export interface PJEProfileResult {
  tasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  favoriteTasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  tags: Array<{ id: number; nomeTag: string; nomeTagCompleto: string; favorita: boolean }>;
  error?: string;
}

// ══════════════════════════════════════════════════════════════
// COOKIE JAR POR DOMÍNIO
// ══════════════════════════════════════════════════════════════

class CookieJar {
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

// ══════════════════════════════════════════════════════════════
// PERSISTÊNCIA DE SESSÃO POR CPF
// ══════════════════════════════════════════════════════════════

interface PersistedSession {
  cookies: Record<string, string>;
  idUsuarioLocalizacao: string;
  user?: PJELoginResult['user'];
  updatedAt: number;
}

const cpfSessions = new Map<string, PersistedSession>();
const CPF_SESSION_TTL = 4 * 60 * 60 * 1000;

function getPersistedSession(cpf: string): PersistedSession | null {
  const entry = cpfSessions.get(cpf);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > CPF_SESSION_TTL) {
    cpfSessions.delete(cpf);
    return null;
  }
  return entry;
}

function savePersistedSession(cpf: string, data: Omit<PersistedSession, 'updatedAt'>): void {
  cpfSessions.set(cpf, { ...data, updatedAt: Date.now() });
}

function clearPersistedSession(cpf: string): void {
  cpfSessions.delete(cpf);
}

// ── Classe principal ──────────────────────────────────────────

export class PJEAuthProxy {
  private cookieJar = new CookieJar();
  private idUsuarioLocalizacao = '';
  private cpf = '';

  // ══════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════

  async login(cpf: string, password: string): Promise<PJELoginResult> {
    this.cpf = cpf;
    try {
      // ── 0. Tentar reutilizar sessão existente ──
      const persisted = getPersistedSession(cpf);
      if (persisted) {
        console.log(`[PJE-AUTH] Sessão persistida encontrada para CPF ***${cpf.slice(-4)}, validando...`);
        this.cookieJar.importAll(persisted.cookies);
        this.idUsuarioLocalizacao = persisted.idUsuarioLocalizacao;

        const valid = await this.tryValidateExistingSession();
        if (valid) {
          console.log(`[PJE-AUTH] Sessão persistida VÁLIDA — reutilizando`);
          savePersistedSession(cpf, {
            cookies: this.cookieJar.exportAll(),
            idUsuarioLocalizacao: this.idUsuarioLocalizacao,
            user: valid.user,
          });
          return valid;
        }
        console.log(`[PJE-AUTH] Sessão persistida EXPIRADA — login completo`);
        clearPersistedSession(cpf);
        this.cookieJar.clear();
      }

      // ── 1. GET login.seam → redirects → SSO form ──
      console.log(`[PJE-AUTH] Step 1: GET ${PJE_BASE}/pje/login.seam`);
      const ssoPage = await this.followRedirects('GET', `${PJE_BASE}/pje/login.seam`);
      console.log(`[PJE-AUTH] Step 1 done: finalUrl=${ssoPage.finalUrl} (${ssoPage.body.length} chars)`);

      if (this.isLoggedInUrl(ssoPage.finalUrl)) {
        console.log(`[PJE-AUTH] Sessão já ativa`);
        return await this.validateAndBuildResponse();
      }

      // ── 2. Extrair TODOS os campos do form SSO ──
      const formData = this.extractFormFields(ssoPage.body, ssoPage.finalUrl);
      if (!formData.actionUrl) {
        console.error(`[PJE-AUTH] Form SSO não encontrado. URL: ${ssoPage.finalUrl}`);
        return { needs2FA: false, error: 'Formulário SSO não encontrado.' };
      }

      // Merge: campos extraídos do form + credenciais do usuário
      // Isso garante que pjeoffice-code, phrase, e qualquer outro campo
      // customizado do Keycloak PJE-TJBA sejam enviados
      const postFields = {
        ...formData.fields,
        username: cpf,
        password,
      };

      const fieldNames = Object.keys(postFields);
      console.log(`[PJE-AUTH] Step 2: POST to ${formData.actionUrl.substring(0, 100)}...`);
      console.log(`[PJE-AUTH]   form fields: [${fieldNames.join(', ')}]`);

      // ── 3. POST credenciais ao SSO ──
      const loginResult = await this.followRedirects(
        'POST',
        formData.actionUrl,
        new URLSearchParams(postFields),
      );
      console.log(`[PJE-AUTH] Step 2 done: finalUrl=${loginResult.finalUrl} (status=${loginResult.status})`);

      // ── 4. Verificar resultado ──

      // 4a. 2FA?
      if (this.detect2FA(loginResult.body, loginResult.finalUrl)) {
        this.persistSession();
        const sessionId = this.generateSessionId();
        sessionStore.set(sessionId, {
          cookies: this.cookieJar.exportAll(),
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          ssoHtml: loginResult.body, ssoFinalUrl: loginResult.finalUrl, cpf,
        });
        return { needs2FA: true, sessionId };
      }

      // 4b. Login OK (painel)?
      if (this.isLoggedInUrl(loginResult.finalUrl)) {
        console.log(`[PJE-AUTH] Login OK — chegou ao painel`);
        return await this.validateAndBuildResponse();
      }

      // 4c. Voltou ao SSO → credenciais incorretas ou erro
      if (loginResult.finalUrl.includes('openid-connect/auth') ||
          loginResult.finalUrl.includes('sso.cloud.pje.jus.br/auth/realms')) {
        const errorMsg = this.extractLoginError(loginResult.body);
        if (errorMsg) return { needs2FA: false, error: errorMsg };

        if (loginResult.body.includes('kc-form-login') || loginResult.body.includes('username')) {
          console.log(`[PJE-AUTH] Voltou ao form SSO`);
          console.log(`[PJE-AUTH] Cookie jar:\n${this.cookieJar.debugDump()}`);
          return { needs2FA: false, error: 'CPF ou senha incorretos.' };
        }
      }

      const errorMsg = this.extractLoginError(loginResult.body);
      if (errorMsg) return { needs2FA: false, error: errorMsg };

      console.error(`[PJE-AUTH] Login falhou. URL: ${loginResult.finalUrl}`);
      return { needs2FA: false, error: 'Falha no login. Verifique CPF e senha.' };
    } catch (err) {
      console.error(`[PJE-AUTH] Exception:`, err);
      return { needs2FA: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }

  // ══════════════════════════════════════════════════════════
  // VALIDAR SESSÃO EXISTENTE
  // ══════════════════════════════════════════════════════════

  private async tryValidateExistingSession(): Promise<PJELoginResult | null> {
    try {
      const user = await this.apiGet<any>('usuario/currentUser');
      if (!user?.idUsuario) return null;

      this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor || '');
      const sessionId = this.generateSessionId();
      sessionStore.set(sessionId, {
        cookies: this.cookieJar.exportAll(),
        idUsuarioLocalizacao: this.idUsuarioLocalizacao,
        cpf: this.cpf,
      });

      return {
        needs2FA: false,
        sessionId,
        user: {
          idUsuario: user.idUsuario,
          nomeUsuario: user.nomeUsuario,
          login: user.login,
          perfil: user.perfil || user.nomePerfil || '',
          nomePerfil: user.nomePerfil || user.perfil || '',
          idUsuarioLocalizacaoMagistradoServidor: user.idUsuarioLocalizacaoMagistradoServidor,
        },
      };
    } catch {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2FA
  // ══════════════════════════════════════════════════════════

  async submit2FA(sessionId: string, code: string): Promise<PJELoginResult> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return { needs2FA: false, error: 'Sessão 2FA expirada.' };

      this.cookieJar.importAll(stored.cookies);
      this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
      this.cpf = stored.cpf || '';

      const formData = this.extractFormFields(stored.ssoHtml || '', stored.ssoFinalUrl || '');
      if (!formData.actionUrl) return { needs2FA: false, error: 'Formulário 2FA não encontrado.' };

      const postFields = { ...formData.fields, code };
      const result = await this.followRedirects('POST', formData.actionUrl, new URLSearchParams(postFields));
      sessionStore.delete(sessionId);

      if (this.isLoggedInUrl(result.finalUrl)) {
        return await this.validateAndBuildResponse();
      }
      if (this.detect2FA(result.body, result.finalUrl)) {
        this.persistSession();
        const newSid = this.generateSessionId();
        sessionStore.set(newSid, {
          cookies: this.cookieJar.exportAll(),
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          ssoHtml: result.body, ssoFinalUrl: result.finalUrl, cpf: this.cpf,
        });
        return { needs2FA: true, sessionId: newSid, error: 'Código inválido ou expirado.' };
      }
      return { needs2FA: false, error: 'Falha na verificação 2FA.' };
    } catch (err) {
      return { needs2FA: false, error: err instanceof Error ? err.message : 'Erro no 2FA' };
    }
  }

  // ══════════════════════════════════════════════════════════
  // SELEÇÃO DE PERFIL
  // ══════════════════════════════════════════════════════════

  async selectProfile(sessionId: string, profileIndex: number): Promise<PJEProfileResult> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return { tasks: [], favoriteTasks: [], tags: [], error: 'Sessão expirada.' };

      this.cookieJar.importAll(stored.cookies);
      this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
      this.cpf = stored.cpf || '';

      const profilePage = await this.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`);
      const viewState = this.extractViewState(profilePage.body);
      if (!viewState) return { tasks: [], favoriteTasks: [], tags: [], error: 'ViewState não encontrado.' };

      await this.followRedirects('POST', `${PJE_BASE}/pje/ng2/dev.seam`, new URLSearchParams({
        'papeisUsuarioForm': 'papeisUsuarioForm',
        'papeisUsuarioForm:j_id60': '',
        'papeisUsuarioForm:j_id72': 'papeisUsuarioForm:j_id72',
        'javax.faces.ViewState': viewState,
        [`papeisUsuarioForm:dtPerfil:${profileIndex}:j_id70`]: `papeisUsuarioForm:dtPerfil:${profileIndex}:j_id70`,
      }));

      const user = await this.apiGet<any>('usuario/currentUser');
      if (user?.idUsuarioLocalizacaoMagistradoServidor) {
        this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor);
      }

      stored.cookies = this.cookieJar.exportAll();
      stored.idUsuarioLocalizacao = this.idUsuarioLocalizacao;
      this.persistSession(user);

      const [tasks, favoriteTasks, tagsResult] = await Promise.all([
        this.apiPost<any[]>('painelUsuario/tarefas', { numeroProcesso: '', competencia: '', etiquetas: [] }).catch(() => []),
        this.apiPost<any[]>('painelUsuario/tarefasFavoritas', { numeroProcesso: '', competencia: '', etiquetas: [] }).catch(() => []),
        this.apiPost<{ entities: any[] }>('painelUsuario/etiquetas', { page: 0, maxResults: 500, tagsString: '' }).catch(() => ({ entities: [] })),
      ]);

      return {
        tasks: Array.isArray(tasks) ? tasks : [],
        favoriteTasks: Array.isArray(favoriteTasks) ? favoriteTasks : [],
        tags: tagsResult?.entities || [],
      };
    } catch (err) {
      return { tasks: [], favoriteTasks: [], tags: [], error: err instanceof Error ? err.message : 'Erro ao selecionar perfil' };
    }
  }

  // ══════════════════════════════════════════════════════════
  // VALIDAR E CONSTRUIR RESPOSTA
  // ══════════════════════════════════════════════════════════

  private async validateAndBuildResponse(): Promise<PJELoginResult> {
    const user = await this.apiGet<any>('usuario/currentUser');
    if (!user?.idUsuario) {
      console.error('[PJE-AUTH] currentUser falhou. Cookies:', this.cookieJar.summary());
      console.log(`[PJE-AUTH] Cookie jar:\n${this.cookieJar.debugDump()}`);
      return { needs2FA: false, error: 'Sessão inválida após login.' };
    }

    this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor || '');
    const sessionId = this.generateSessionId();
    sessionStore.set(sessionId, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      cpf: this.cpf,
    });

    this.persistSession(user);
    const profiles = await this.extractProfiles();

    return {
      needs2FA: false, sessionId,
      user: {
        idUsuario: user.idUsuario,
        nomeUsuario: user.nomeUsuario,
        login: user.login,
        perfil: user.perfil || user.nomePerfil || '',
        nomePerfil: user.nomePerfil || user.perfil || '',
        idUsuarioLocalizacaoMagistradoServidor: user.idUsuarioLocalizacaoMagistradoServidor,
      },
      profiles,
    };
  }

  private persistSession(user?: any): void {
    if (!this.cpf) return;
    savePersistedSession(this.cpf, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      user: user ? {
        idUsuario: user.idUsuario,
        nomeUsuario: user.nomeUsuario,
        login: user.login,
        perfil: user.perfil || user.nomePerfil || '',
        nomePerfil: user.nomePerfil || user.perfil || '',
        idUsuarioLocalizacaoMagistradoServidor: user.idUsuarioLocalizacaoMagistradoServidor,
      } : undefined,
    });
  }

  // ══════════════════════════════════════════════════════════
  // EXTRAIR PERFIS
  // ══════════════════════════════════════════════════════════

  private async extractProfiles(): Promise<PJELoginResult['profiles']> {
    try {
      const page = await this.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`);
      const html = page.body;
      const profiles: Array<{ indice: number; nome: string; orgao: string; favorito: boolean }> = [];

      const indexSet = new Set<number>();
      const indexRegex = /papeisUsuarioForm:dtPerfil:(\d+)/g;
      let m;
      while ((m = indexRegex.exec(html)) !== null) indexSet.add(parseInt(m[1], 10));
      const allIndices = [...indexSet].sort((a, b) => a - b);
      console.log(`[PJE-AUTH] Perfis indices: [${allIndices.join(', ')}]`);

      for (const idx of allIndices) {
        const linkPos = html.indexOf(`papeisUsuarioForm:dtPerfil:${idx}:j_id70`);
        if (linkPos < 0) continue;

        const before = html.substring(Math.max(0, linkPos - 3000), linkPos);
        const trIdx = before.lastIndexOf('<tr');
        if (trIdx < 0) continue;

        const trStart = Math.max(0, linkPos - 3000) + trIdx;
        const after = html.substring(trStart);
        const trClose = after.match(/<\/tr>/i);
        if (!trClose || trClose.index === undefined) continue;

        const row = after.substring(0, trClose.index + 5);
        const isFav = row.includes('j_id66') || /class="[^"]*(?:ui-icon-star|star-filled|favorit)/i.test(row);

        const tds: string[] = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let td;
        while ((td = tdRe.exec(row)) !== null) {
          const t = this.decodeHtmlEntities(this.stripHtml(td[1]).trim());
          if (t.length > 3 && !/^selecionar$/i.test(t)) tds.push(t);
        }

        let nome = tds.length > 0 ? tds.sort((a, b) => b.length - a.length)[0] : `Perfil ${idx}`;
        let orgao = '';
        const parts = nome.split(' / ');
        if (parts.length >= 2) orgao = parts[0].trim();

        profiles.push({ indice: idx, nome, orgao, favorito: isFav });
      }

      console.log(`[PJE-AUTH] Perfis: ${profiles.length}`);
      for (const p of profiles) console.log(`  [${p.indice}] ${p.favorito ? '⭐ ' : ''}${p.nome}`);
      return profiles;
    } catch (err) {
      console.error('[PJE-AUTH] Erro perfis:', err);
      return [];
    }
  }

  async debugGetProfilesHtml(sessionId: string): Promise<string> {
    const stored = sessionStore.get(sessionId);
    if (!stored) return '<h1>Sessão não encontrada</h1>';
    this.cookieJar.importAll(stored.cookies);
    this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
    return (await this.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`)).body;
  }

  // ══════════════════════════════════════════════════════════
  // HTTP: FOLLOW REDIRECTS
  // ══════════════════════════════════════════════════════════

  private async followRedirects(
    method: 'GET' | 'POST', url: string, body?: URLSearchParams,
  ): Promise<{ body: string; finalUrl: string; status: number }> {
    let currentUrl = url;
    let currentMethod = method;
    let currentBody: URLSearchParams | undefined = body;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const cookieStr = this.cookieJar.serializeForUrl(currentUrl);

      if (i <= 6) {
        const domain = this.safeDomain(currentUrl);
        const cookieNames = cookieStr ? cookieStr.split('; ').map(c => c.split('=')[0]) : [];
        console.log(`[PJE-AUTH]     → ${currentMethod} ${domain}${this.safePath(currentUrl)} cookies: [${cookieNames.join(', ')}]`);
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
        method: currentMethod, headers,
        body: currentMethod === 'POST' && currentBody ? currentBody.toString() : undefined,
        redirect: 'manual',
      });

      this.cookieJar.extractFromResponse(res, currentUrl);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.text().catch(() => {});
        if (!location) break;

        let nextUrl = this.resolveUrl(location, currentUrl);

        // JBoss Seam URL rewriting: ;jsessionid=XXX na Location
        const jsessionMatch = nextUrl.match(/;jsessionid=([^?&#]+)/);
        if (jsessionMatch) {
          const domain = this.safeDomain(nextUrl);
          console.log(`[PJE-AUTH]     (URL rewrite) jsessionid found for ${domain}`);
          this.cookieJar.setCookie(domain, 'JSESSIONID', jsessionMatch[1]);
        }

        console.log(`[PJE-AUTH]   redirect #${i + 1}: ${res.status} ${this.truncUrl(currentUrl)} → ${this.truncUrl(nextUrl)}`);
        currentUrl = nextUrl;
        currentMethod = 'GET';
        currentBody = undefined;
        continue;
      }

      return { body: await res.text(), finalUrl: currentUrl, status: res.status };
    }
    throw new Error(`Excedido limite de ${MAX_REDIRECTS} redirects`);
  }

  // ══════════════════════════════════════════════════════════
  // REST API
  // ══════════════════════════════════════════════════════════

  private async apiGet<T = any>(endpoint: string): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, { method: 'GET', headers: this.buildRestHeaders(), redirect: 'follow' });
    this.cookieJar.extractFromResponse(res, url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private async apiPost<T = any>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, { method: 'POST', headers: this.buildRestHeaders(), body: JSON.stringify(body), redirect: 'follow' });
    this.cookieJar.extractFromResponse(res, url);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private buildRestHeaders(): Record<string, string> {
    const cookieStr = this.cookieJar.serializeForUrl(PJE_REST_BASE);
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': PJE_LEGACY_APP,
      'Origin': PJE_FRONTEND_ORIGIN,
      'Referer': `${PJE_FRONTEND_ORIGIN}/`,
      'X-pje-cookies': cookieStr,
      'X-pje-usuario-localizacao': this.idUsuarioLocalizacao,
      'Cookie': cookieStr,
    };
  }

  // ══════════════════════════════════════════════════════════
  // HTML / FORM PARSING
  // ══════════════════════════════════════════════════════════

  /**
   * Extrai TODOS os campos de um form HTML.
   *
   * O Keycloak do PJE-TJBA tem campos customizados no login form:
   *   - pjeoffice-code (hidden, valor vazio)
   *   - phrase (hidden, valor vazio)
   * Estes campos NÃO existem no Keycloak padrão.
   *
   * Nosso código antigo enviava apenas (username, password, credentialId),
   * o que fazia o SSO aceitar as credenciais mas possivelmente processar
   * o form de modo diferente, causando falha no redirect chain.
   *
   * Agora extraímos TODOS os inputs do form e fazemos merge com
   * username/password, replicando exatamente o que o browser envia.
   */
  private extractFormFields(html: string, baseUrl: string): {
    actionUrl: string | null;
    fields: Record<string, string>;
  } {
    const fields: Record<string, string> = {};
    let formHtml = '';
    let actionUrl: string | null = null;

    // 1. form#kc-form-login (preferido)
    const kcFormMatch = html.match(/<form[^>]+id="kc-form-login"[^>]*>([\s\S]*?)<\/form>/i);
    if (kcFormMatch) {
      formHtml = kcFormMatch[0];
      const actionMatch = kcFormMatch[0].match(/action="([^"]+)"/i);
      if (actionMatch) {
        const a = actionMatch[1].replace(/&amp;/g, '&');
        actionUrl = a.startsWith('http') ? a : this.resolveUrl(a, baseUrl);
      }
    }

    // 2. Fallback: form method=post
    if (!actionUrl) {
      const postFormMatch = html.match(/<form[^>]+method="post"[^>]*>([\s\S]*?)<\/form>/i)
        || html.match(/<form[^>]*>([\s\S]*?)<\/form>/i);
      if (postFormMatch) {
        formHtml = postFormMatch[0];
        const actionMatch = postFormMatch[0].match(/action="([^"]+)"/i);
        if (actionMatch) {
          const a = actionMatch[1].replace(/&amp;/g, '&');
          actionUrl = a.startsWith('http') ? a : this.resolveUrl(a, baseUrl);
        }
      }
    }

    // 3. Fallback absoluto: action em qualquer lugar
    if (!actionUrl) {
      const actionMatch = html.match(/action="([^"]+)"/i);
      if (actionMatch) {
        const a = actionMatch[1].replace(/&amp;/g, '&');
        actionUrl = a.startsWith('http') ? a : this.resolveUrl(a, baseUrl);
      }
      return { actionUrl, fields };
    }

    // Extrair TODOS os campos <input> do form
    const inputRegex = /<input[^>]*>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
      const tag = inputMatch[0];

      const nameMatch = tag.match(/name="([^"]*)"/i);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      // Ignorar botões
      const typeMatch = tag.match(/type="([^"]*)"/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
      if (type === 'submit' || type === 'button' || type === 'image') continue;

      const valueMatch = tag.match(/value="([^"]*)"/i);
      const value = valueMatch ? valueMatch[1].replace(/&amp;/g, '&') : '';

      fields[name] = value;
    }

    console.log(`[PJE-AUTH] Form fields extracted: [${Object.keys(fields).join(', ')}]`);
    return { actionUrl, fields };
  }

  private detect2FA(html: string, url: string): boolean {
    const lower = html.toLowerCase();
    return ['codigo enviado', 'digite o codigo', 'código de verificação', 'verification code', 'otp', 'two-factor']
      .some((p) => lower.includes(p)) || url.includes('otp');
  }

  private extractLoginError(html: string): string | null {
    const patterns: Array<{ regex: RegExp; message?: string }> = [
      { regex: /class="[^"]*kc-feedback-text[^"]*"[^>]*>([^<]+)/i },
      { regex: /id="kc-error-message"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*alert-error[^"]*"[^>]*>([^<]+)/i },
      { regex: /<span[^>]*class="[^"]*kc-feedback-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i },
      { regex: /Invalid username or password/i, message: 'CPF ou senha incorretos.' },
      { regex: /invalid.*credentials/i, message: 'CPF ou senha incorretos.' },
      { regex: /Usu.rio ou senha inv.lidos/i, message: 'CPF ou senha incorretos.' },
      { regex: /Account is disabled/i, message: 'Conta desativada.' },
      { regex: /Account is locked/i, message: 'Conta bloqueada.' },
      { regex: /Conta bloqueada/i, message: 'Conta bloqueada.' },
    ];
    for (const { regex, message } of patterns) {
      const match = html.match(regex);
      if (match) {
        if (message) return message;
        const text = this.decodeHtmlEntities(this.stripHtml((match[1] || '').trim()));
        if (text.length > 2 && text.length < 200) return text;
      }
    }
    return null;
  }

  private extractViewState(html: string): string | null {
    const match = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
    return match?.[1] || null;
  }

  private isLoggedInUrl(url: string): boolean {
    return url.includes('/pje/') && (
      url.includes('painel') || url.includes('dev.seam') ||
      url.endsWith('/pje/') || url.includes('ng2')
    );
  }

  private resolveUrl(location: string, base: string): string {
    if (location.startsWith('http')) return location;
    try { return new URL(location, base).toString(); } catch { return location; }
  }

  private safeDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return '?'; }
  }

  private safePath(url: string): string {
    try { return new URL(url).pathname.substring(0, 50); } catch { return ''; }
  }

  private truncUrl(url: string): string {
    try {
      const u = new URL(url);
      const search = u.search.length > 40 ? u.search.substring(0, 40) + '...' : u.search;
      return `${u.hostname}${u.pathname}${search}`;
    } catch { return url.substring(0, 100); }
  }

  private stripHtml(html: string): string {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
      .replace(/&atilde;/g, 'ã').replace(/&Atilde;/g, 'Ã')
      .replace(/&otilde;/g, 'õ').replace(/&Otilde;/g, 'Õ')
      .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
      .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
      .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
      .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
      .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
      .replace(/&agrave;/g, 'à').replace(/&egrave;/g, 'è')
      .replace(/&acirc;/g, 'â').replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô')
      .replace(/&uuml;/g, 'ü').replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .trim();
  }

  private generateSessionId(): string {
    return `pje_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ══════════════════════════════════════════════════════════════
// SESSION STORE
// ══════════════════════════════════════════════════════════════

interface StoredSession {
  cookies: Record<string, string>;
  idUsuarioLocalizacao: string;
  ssoHtml?: string;
  ssoFinalUrl?: string;
  cpf?: string;
  createdAt?: number;
}

class SessionStore {
  private store = new Map<string, StoredSession>();
  private readonly TTL = 30 * 60 * 1000;

  constructor() { setInterval(() => this.cleanup(), 5 * 60 * 1000); }

  set(id: string, data: StoredSession): void {
    data.createdAt = Date.now();
    this.store.set(id, data);
  }

  get(id: string): StoredSession | undefined {
    const s = this.store.get(id);
    if (!s) return undefined;
    if (Date.now() - (s.createdAt || 0) > this.TTL) { this.store.delete(id); return undefined; }
    return s;
  }

  delete(id: string): void { this.store.delete(id); }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, s] of this.store) {
      if (now - (s.createdAt || 0) > this.TTL) this.store.delete(id);
    }
  }
}

export const sessionStore = new SessionStore();