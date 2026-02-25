// ============================================================
// apps/api/src/modules/pje-download/services/pje-auth-proxy.service.ts
// Proxy de autenticação PJE — login real no SSO do TJBA
//
// Correções:
//  - Persiste cookies SSO entre sessões (evita 2FA repetido)
//  - Segue redirects manualmente para capturar cookies
//  - Extrai TODOS os perfis da tabela HTML com decode de entidades
// ============================================================

const PJE_BASE = 'https://pje.tjba.jus.br';
const PJE_REST_BASE = `${PJE_BASE}/pje/seam/resource/rest/pje-legacy`;
const PJE_FRONTEND_ORIGIN = 'https://frontend.cloud.pje.jus.br';
const PJE_LEGACY_APP = 'pje-tjba-1g';
const MAX_REDIRECTS = 15;

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
// COOKIE PERSISTENCE — mantém cookies SSO entre logins
// Isso evita que o SSO peça 2FA a cada login, pois os cookies
// de verificação já estão presentes (igual ao browser).
// Indexado por CPF para suportar múltiplos usuários.
// ══════════════════════════════════════════════════════════════

const persistentCookies = new Map<string, {
  cookies: Record<string, string>;
  updatedAt: number;
}>();

const PERSISTENT_COOKIE_TTL = 8 * 60 * 60 * 1000; // 8 horas

function getPersistentCookies(cpf: string): Record<string, string> {
  const entry = persistentCookies.get(cpf);
  if (!entry) return {};
  if (Date.now() - entry.updatedAt > PERSISTENT_COOKIE_TTL) {
    persistentCookies.delete(cpf);
    return {};
  }
  return { ...entry.cookies };
}

function savePersistentCookies(cpf: string, cookies: Record<string, string>): void {
  const existing = persistentCookies.get(cpf);
  persistentCookies.set(cpf, {
    cookies: { ...(existing?.cookies || {}), ...cookies },
    updatedAt: Date.now(),
  });
}

// ── Classe principal ──────────────────────────────────────────

export class PJEAuthProxy {
  private cookies: Record<string, string> = {};
  private idUsuarioLocalizacao = '';
  private cpf = '';

  // ══════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════

  async login(cpf: string, password: string): Promise<PJELoginResult> {
    this.cpf = cpf;

    try {
      // Restaurar cookies persistidos (SSO + PJE) — evita 2FA
      this.cookies = getPersistentCookies(cpf);
      const hadPersisted = Object.keys(this.cookies).length > 0;

      if (hadPersisted) {
        console.log(`[PJE-AUTH] Cookies persistidos encontrados para ***${cpf.slice(-4)} (${Object.keys(this.cookies).length} cookies)`);
      }

      // 1. GET login.seam → SSO
      const ssoPage = await this.followGet(`${PJE_BASE}/pje/login.seam`);

      // Se já redirecionou para o painel (cookies válidos), pula login
      if (this.isLoggedInUrl(ssoPage.finalUrl)) {
        console.log(`[PJE-AUTH] Sessão já ativa, pulando login`);
        this.persistCookies();
        return await this.validateAndBuildResponse();
      }

      const actionUrl = this.extractFormAction(ssoPage.body, ssoPage.finalUrl);
      if (!actionUrl) {
        return { needs2FA: false, error: 'Formulário SSO não encontrado.' };
      }

      // 2. POST credenciais
      const loginResult = await this.followPost(actionUrl, new URLSearchParams({
        username: cpf,
        password: password,
        credentialId: '',
      }));

      // 3. Detectar 2FA
      if (this.detect2FA(loginResult.body, loginResult.finalUrl)) {
        // Persistir cookies SSO parciais — o SSO pode usar esses cookies
        // para lembrar que o dispositivo já foi verificado
        this.persistCookies();

        const sessionId = this.generateSessionId();
        sessionStore.set(sessionId, {
          cookies: { ...this.cookies },
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          ssoHtml: loginResult.body,
          ssoFinalUrl: loginResult.finalUrl,
          cpf,
        });
        return { needs2FA: true, sessionId };
      }

      // 4. Login OK?
      if (this.isLoggedInUrl(loginResult.finalUrl)) {
        this.persistCookies();
        return await this.validateAndBuildResponse();
      }

      const errorMsg = this.extractLoginError(loginResult.body);
      if (!errorMsg) {
        // Log para debug — ajuda a identificar novos padrões de erro
        console.error(`[PJE-AUTH] Login falhou sem mensagem de erro detectada. URL final: ${loginResult.finalUrl}`);
        console.error(`[PJE-AUTH] HTML snippet (primeiros 500 chars):`, loginResult.body.slice(0, 500));
      }
      return { needs2FA: false, error: errorMsg || 'CPF ou senha incorretos.' };
    } catch (err) {
      return { needs2FA: false, error: err instanceof Error ? err.message : 'Erro desconhecido no login' };
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2FA
  // ══════════════════════════════════════════════════════════

  async submit2FA(sessionId: string, code: string): Promise<PJELoginResult> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) {
        return { needs2FA: false, error: 'Sessão 2FA expirada ou inválida.' };
      }

      this.cookies = { ...stored.cookies };
      this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
      this.cpf = stored.cpf || '';

      const html = stored.ssoHtml || '';
      const baseUrl = stored.ssoFinalUrl || '';
      const actionUrl = this.extractFormAction(html, baseUrl);

      if (!actionUrl) {
        return { needs2FA: false, error: 'Formulário 2FA não encontrado.' };
      }

      const hiddenFields = this.extractHiddenFields(html, baseUrl);

      const result = await this.followPost(actionUrl, new URLSearchParams({
        code,
        ...hiddenFields,
      }));

      sessionStore.delete(sessionId);

      if (this.isLoggedInUrl(result.finalUrl)) {
        // Persistir cookies — inclui cookies SSO de verificação.
        // Na próxima vez, o SSO vai reconhecer esses cookies e NÃO pedir 2FA.
        this.persistCookies();
        return await this.validateAndBuildResponse();
      }

      if (this.detect2FA(result.body, result.finalUrl)) {
        this.persistCookies();
        const newSessionId = this.generateSessionId();
        sessionStore.set(newSessionId, {
          cookies: { ...this.cookies },
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          ssoHtml: result.body,
          ssoFinalUrl: result.finalUrl,
          cpf: this.cpf,
        });
        return {
          needs2FA: true,
          sessionId: newSessionId,
          error: 'Código 2FA inválido ou expirado. Tente novamente.',
        };
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
      if (!stored) {
        return { tasks: [], favoriteTasks: [], tags: [], error: 'Sessão expirada.' };
      }

      this.cookies = { ...stored.cookies };
      this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
      this.cpf = stored.cpf || '';

      // GET página de perfis
      const profilePage = await this.followGet(`${PJE_BASE}/pje/ng2/dev.seam`);
      const viewState = this.extractViewState(profilePage.body);

      if (!viewState) {
        return { tasks: [], favoriteTasks: [], tags: [], error: 'ViewState não encontrado.' };
      }

      // POST selecionar perfil
      await this.followPost(`${PJE_BASE}/pje/ng2/dev.seam`, new URLSearchParams({
        'papeisUsuarioForm': 'papeisUsuarioForm',
        'papeisUsuarioForm:j_id60': '',
        'papeisUsuarioForm:j_id72': 'papeisUsuarioForm:j_id72',
        'javax.faces.ViewState': viewState,
        [`papeisUsuarioForm:dtPerfil:${profileIndex}:j_id70`]:
          `papeisUsuarioForm:dtPerfil:${profileIndex}:j_id70`,
      }));

      // Revalidar currentUser
      const user = await this.apiGet<any>('usuario/currentUser');
      if (user?.idUsuarioLocalizacaoMagistradoServidor) {
        this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor);
      }

      // Atualizar sessão
      stored.cookies = { ...this.cookies };
      stored.idUsuarioLocalizacao = this.idUsuarioLocalizacao;
      this.persistCookies();

      // Carregar tarefas + etiquetas
      const [tasks, favoriteTasks, tagsResult] = await Promise.all([
        this.apiPost<any[]>('painelUsuario/tarefas', {
          numeroProcesso: '', competencia: '', etiquetas: [],
        }).catch(() => []),
        this.apiPost<any[]>('painelUsuario/tarefasFavoritas', {
          numeroProcesso: '', competencia: '', etiquetas: [],
        }).catch(() => []),
        this.apiPost<{ entities: any[] }>('painelUsuario/etiquetas', {
          page: 0, maxResults: 500, tagsString: '',
        }).catch(() => ({ entities: [] })),
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
  // VALIDATE & BUILD RESPONSE
  // ══════════════════════════════════════════════════════════

  private async validateAndBuildResponse(): Promise<PJELoginResult> {
    const user = await this.apiGet<any>('usuario/currentUser');

    if (!user?.idUsuario) {
      console.error('[PJE-AUTH] currentUser falhou. Cookies:', Object.keys(this.cookies).join(', '));
      return { needs2FA: false, error: 'Sessão inválida após login.' };
    }

    this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor || '');

    const sessionId = this.generateSessionId();
    sessionStore.set(sessionId, {
      cookies: { ...this.cookies },
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      cpf: this.cpf,
    });

    const profiles = await this.extractProfiles();

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
      profiles,
    };
  }

  // ══════════════════════════════════════════════════════════
  // EXTRACT PROFILES — reescrito para pegar TODOS os perfis
  // ══════════════════════════════════════════════════════════

  private async extractProfiles(): Promise<PJELoginResult['profiles']> {
    try {
      const page = await this.followGet(`${PJE_BASE}/pje/ng2/dev.seam`);
      const html = page.body;
      const profiles: Array<{ indice: number; nome: string; orgao: string; favorito: boolean }> = [];

      console.log(`[PJE-AUTH] dev.seam HTML: ${html.length} chars`);

      // ─── Estratégia principal: Encontrar tbody da tabela de perfis ───
      // e iterar cada <tr> em ordem
      const tbodyMatch = html.match(
        /<tbody[^>]*id="papeisUsuarioForm:dtPerfil:tb"[^>]*>([\s\S]*?)<\/tbody>/i
      );

      if (tbodyMatch) {
        const tbodyHtml = tbodyMatch[1];

        // Separar as <tr> — cada uma é um perfil
        // Usar split ao invés de regex para evitar problemas com greedy matching
        const rows = tbodyHtml.split(/<tr[^>]*>/i).slice(1); // primeiro split é antes do primeiro <tr>

        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const rowHtml = rows[rowIdx].split('</tr>')[0] || rows[rowIdx];

          // Extrair o índice real do perfil a partir do link dtPerfil:N:j_id70
          // IMPORTANTE: usar `:j_id` como boundary para evitar confundir dtPerfil:1 com dtPerfil:10
          const idxMatch = rowHtml.match(/dtPerfil:(\d+):j_id/);
          const idx = idxMatch ? parseInt(idxMatch[1], 10) : rowIdx;

          // Verificar se é favorito (estrela preenchida)
          const isFavorito = rowHtml.includes('j_id66') ||
            rowHtml.includes('ui-icon-star') ||
            rowHtml.includes('star-filled') ||
            /class="[^"]*favorit/i.test(rowHtml);

          // Extrair todas as <td> e seus textos
          const tds: string[] = [];
          const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          let tdMatch;
          while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
            const text = this.decodeHtmlEntities(this.stripHtml(tdMatch[1]).trim());
            // Ignorar células vazias, ícones ou botões
            if (text.length > 3 && !/^selecionar$/i.test(text)) {
              tds.push(text);
            }
          }

          // O nome do perfil é o texto mais longo
          let nome = '';
          if (tds.length > 0) {
            nome = tds.sort((a, b) => b.length - a.length)[0];
          }

          if (!nome) nome = `Perfil ${idx}`;

          profiles.push({ indice: idx, nome, orgao: '', favorito: isFavorito });
        }
      }

      // ─── Fallback: buscar links dtPerfil:N:j_id70 individualmente ───
      if (profiles.length === 0) {
        // Encontrar todos os índices únicos usando o boundary :j_id
        const indexSet = new Set<number>();
        const indexRegex = /papeisUsuarioForm:dtPerfil:(\d+):j_id/g;
        let idxMatch;
        while ((idxMatch = indexRegex.exec(html)) !== null) {
          indexSet.add(parseInt(idxMatch[1], 10));
        }
        const allIndices = [...indexSet].sort((a, b) => a - b);

        console.log(`[PJE-AUTH] Fallback: índices encontrados: ${allIndices.join(', ')}`);

        for (const idx of allIndices) {
          // Buscar <td> imediatamente antes do link dtPerfil:N:j_id70
          const contextPattern = new RegExp(
            `<td[^>]*>([\\s\\S]{5,400}?)<\\/td>[\\s\\S]{0,300}?papeisUsuarioForm:dtPerfil:${idx}:j_id70`,
            'i'
          );
          const ctxMatch = html.match(contextPattern);
          let nome = ctxMatch?.[1]
            ? this.decodeHtmlEntities(this.stripHtml(ctxMatch[1]).trim())
            : `Perfil ${idx}`;

          profiles.push({ indice: idx, nome, orgao: '', favorito: false });
        }
      }

      // ─── Parse orgao do nome se contém " / " ───
      for (const p of profiles) {
        const parts = p.nome.split(' / ');
        if (parts.length >= 2) {
          p.orgao = parts[0].trim();
        }
      }

      // Marcar favorito pelo link j_id66 (perfil padrão/ativo)
      if (html.includes('dtPerfil:j_id66') && !profiles.some(p => p.favorito)) {
        if (profiles.length > 0) profiles[0].favorito = true;
      }

      console.log(`[PJE-AUTH] Perfis extraídos: ${profiles.length}`);
      for (const p of profiles) {
        console.log(`  [${p.indice}] ${p.favorito ? '⭐ ' : ''}${p.nome}`);
      }

      return profiles;
    } catch (err) {
      console.error('[PJE-AUTH] Erro ao extrair perfis:', err);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════
  // DEBUG: retorna HTML raw da página de perfis
  // ══════════════════════════════════════════════════════════

  async debugGetProfilesHtml(sessionId: string): Promise<string> {
    const stored = sessionStore.get(sessionId);
    if (!stored) return '<h1>Sessão não encontrada</h1>';

    this.cookies = { ...stored.cookies };
    this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;

    const page = await this.followGet(`${PJE_BASE}/pje/ng2/dev.seam`);
    return page.body;
  }

  // ══════════════════════════════════════════════════════════
  // PERSIST COOKIES
  // ══════════════════════════════════════════════════════════

  private persistCookies(): void {
    if (this.cpf) {
      savePersistentCookies(this.cpf, this.cookies);
    }
  }

  // ══════════════════════════════════════════════════════════
  // HTTP: FOLLOW REDIRECTS MANUALLY
  // ══════════════════════════════════════════════════════════

  private async followGet(url: string): Promise<{ body: string; finalUrl: string; status: number }> {
    let currentUrl = url;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'Cookie': this.serializeCookies(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'manual',
      });

      this.extractCookiesFromResponse(res);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;
        currentUrl = this.resolveUrl(location, currentUrl);
        await res.text().catch(() => {});
        continue;
      }

      return { body: await res.text(), finalUrl: currentUrl, status: res.status };
    }

    throw new Error(`Excedido limite de redirects para ${url}`);
  }

  private async followPost(
    url: string,
    body: URLSearchParams,
  ): Promise<{ body: string; finalUrl: string; status: number }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.serializeCookies(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: body.toString(),
      redirect: 'manual',
    });

    this.extractCookiesFromResponse(res);

    if (res.status < 300 || res.status >= 400) {
      return { body: await res.text(), finalUrl: url, status: res.status };
    }

    const location = res.headers.get('location');
    await res.text().catch(() => {});

    if (!location) {
      return { body: '', finalUrl: url, status: res.status };
    }

    return this.followGet(this.resolveUrl(location, url));
  }

  // ══════════════════════════════════════════════════════════
  // REST API
  // ══════════════════════════════════════════════════════════

  private async apiGet<T = any>(endpoint: string): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, { method: 'GET', headers: this.buildRestHeaders(), redirect: 'follow' });
    this.extractCookiesFromResponse(res);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private async apiPost<T = any>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${PJE_REST_BASE}/${endpoint}`;
    const res = await fetch(url, {
      method: 'POST', headers: this.buildRestHeaders(),
      body: JSON.stringify(body), redirect: 'follow',
    });
    this.extractCookiesFromResponse(res);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  private buildRestHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-pje-legacy-app': PJE_LEGACY_APP,
      'Origin': PJE_FRONTEND_ORIGIN,
      'Referer': `${PJE_FRONTEND_ORIGIN}/`,
      'X-pje-cookies': this.serializeCookies(),
      'X-pje-usuario-localizacao': this.idUsuarioLocalizacao,
      'Cookie': this.serializeCookies(),
    };
  }

  // ══════════════════════════════════════════════════════════
  // COOKIES
  // ══════════════════════════════════════════════════════════

  private serializeCookies(): string {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  private extractCookiesFromResponse(res: Response): void {
    const setCookieHeaders: string[] = (res.headers as any).getSetCookie?.() || [];
    for (const raw of setCookieHeaders) {
      const [pair] = raw.split(';');
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (name && !name.startsWith('__')) {
          this.cookies[name] = value;
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // HTML PARSING
  // ══════════════════════════════════════════════════════════

  private extractFormAction(html: string, baseUrl: string): string | null {
    const match = html.match(/action="([^"]+)"/);
    if (!match) return null;
    const action = match[1].replace(/&amp;/g, '&');
    if (action.startsWith('http')) return action;
    return this.resolveUrl(action, baseUrl);
  }

  private detect2FA(html: string, url: string): boolean {
    const lower = html.toLowerCase();
    return ['codigo enviado', 'digite o codigo', 'código de verificação',
      'verification code', 'otp', 'two-factor',
    ].some((p) => lower.includes(p)) || url.includes('otp');
  }

  private extractLoginError(html: string): string | null {
    // Keycloak SSO error patterns
    const patterns: Array<{ regex: RegExp; message?: string }> = [
      // Keycloak specific error spans
      { regex: /class="[^"]*kc-feedback-text[^"]*"[^>]*>([^<]+)/i },
      { regex: /id="kc-error-message"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*login-pf-error[^"]*"[^>]*>([^<]+)/i },
      // Generic error/alert divs
      { regex: /class="[^"]*alert-error[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*error-message[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*error[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*alert[^"]*"[^>]*>([^<]+)/i },
      // Known error strings (return fixed Portuguese message)
      { regex: /Invalid username or password/i, message: 'CPF ou senha incorretos.' },
      { regex: /invalid.*credentials/i, message: 'CPF ou senha incorretos.' },
      { regex: /Usuário ou senha inválidos/i, message: 'CPF ou senha incorretos.' },
      { regex: /Account is disabled/i, message: 'Conta desativada. Entre em contato com o suporte do PJE.' },
      { regex: /Account is locked/i, message: 'Conta bloqueada. Tente novamente mais tarde.' },
      { regex: /Conta bloqueada/i, message: 'Conta bloqueada. Tente novamente mais tarde.' },
      { regex: /User account is locked/i, message: 'Conta bloqueada temporariamente. Aguarde alguns minutos.' },
      { regex: /expired/i, message: 'Sessão expirada. Tente novamente.' },
    ];

    for (const { regex, message } of patterns) {
      const match = html.match(regex);
      if (match) {
        // Se tem mensagem fixa, usa ela
        if (message) return message;
        // Senão, usa o texto capturado (limpo)
        const text = this.decodeHtmlEntities((match[1] || '').trim());
        if (text.length > 2 && text.length < 200) return text;
      }
    }

    // Se a URL final contém error ou login_required, é erro de credenciais
    return null;
  }

  private extractViewState(html: string): string | null {
    const match = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
    return match?.[1] || null;
  }

  private extractHiddenFields(html: string, baseUrl: string): Record<string, string> {
    const fields: Record<string, string> = {};

    // Campos hidden (name antes e depois de type)
    for (const regex of [
      /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi,
      /<input[^>]+name="([^"]+)"[^>]+type="hidden"[^>]+value="([^"]*)"/gi,
    ]) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        if (!fields[match[1]]) fields[match[1]] = match[2];
      }
    }

    // Parâmetros do action URL
    const actionMatch = html.match(/action="([^"]+)"/);
    if (actionMatch) {
      try {
        const rawUrl = actionMatch[1].replace(/&amp;/g, '&');
        const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : this.resolveUrl(rawUrl, baseUrl));
        for (const [key, value] of parsed.searchParams) {
          if (['session_code', 'execution', 'tab_id', 'client_id'].includes(key)) {
            fields[key] = value;
          }
        }
      } catch { /* */ }
    }

    return fields;
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

  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // remover scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // remover styles
      .replace(/<[^>]+>/g, '')                            // remover tags
      .replace(/\s+/g, ' ')                               // normalizar espaços
      .trim();
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ccedil;/g, 'ç')
      .replace(/&Ccedil;/g, 'Ç')
      .replace(/&atilde;/g, 'ã')
      .replace(/&Atilde;/g, 'Ã')
      .replace(/&otilde;/g, 'õ')
      .replace(/&Otilde;/g, 'Õ')
      .replace(/&aacute;/g, 'á')
      .replace(/&Aacute;/g, 'Á')
      .replace(/&eacute;/g, 'é')
      .replace(/&Eacute;/g, 'É')
      .replace(/&iacute;/g, 'í')
      .replace(/&Iacute;/g, 'Í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&Oacute;/g, 'Ó')
      .replace(/&uacute;/g, 'ú')
      .replace(/&Uacute;/g, 'Ú')
      .replace(/&agrave;/g, 'à')
      .replace(/&egrave;/g, 'è')
      .replace(/&acirc;/g, 'â')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&uuml;/g, 'ü')
      .replace(/&nbsp;/g, ' ')
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

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

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
