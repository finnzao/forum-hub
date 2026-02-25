// ============================================================
// apps/api/src/modules/pje-download/services/pje-auth-proxy.service.ts
// Proxy de autenticação PJE — login real no SSO do TJBA
//
// Correções v7:
//  - Extração de perfis reescrita: identifica TODOS os perfis
//    pela presença de links dtPerfil:N:j_id70, extraindo nome
//    da <td> que contém o texto descritivo (geralmente a maior)
//  - Favoritos detectados por ícone star preenchido (classe/src)
//    na MESMA <tr>, não por j_id66 global
//  - situacaoDownload aceita 'S' além de 'DISPONIVEL'
//  - Persiste cookies SSO entre sessões (evita 2FA repetido)
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
  private idUsuario = '';
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
        this.persistCookies();

        const sessionId = this.generateSessionId();
        sessionStore.set(sessionId, {
          cookies: { ...this.cookies },
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          idUsuario: this.idUsuario,
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
      this.idUsuario = stored.idUsuario || '';
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
        this.persistCookies();
        return await this.validateAndBuildResponse();
      }

      if (this.detect2FA(result.body, result.finalUrl)) {
        this.persistCookies();
        const newSessionId = this.generateSessionId();
        sessionStore.set(newSessionId, {
          cookies: { ...this.cookies },
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          idUsuario: this.idUsuario,
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
      this.idUsuario = stored.idUsuario || '';
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
      if (user?.idUsuario) {
        this.idUsuario = String(user.idUsuario);
      }

      // Atualizar sessão
      stored.cookies = { ...this.cookies };
      stored.idUsuarioLocalizacao = this.idUsuarioLocalizacao;
      stored.idUsuario = this.idUsuario;
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
    this.idUsuario = String(user.idUsuario || '');

    const sessionId = this.generateSessionId();
    sessionStore.set(sessionId, {
      cookies: { ...this.cookies },
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: this.idUsuario,
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
  // EXTRACT PROFILES — v6: reescrito para pegar TODOS os perfis
  //
  // Estratégia:
  //  1. Encontra o <tbody> da tabela dtPerfil
  //  2. Separa cada <tr> cuidadosamente
  //  3. Para cada <tr>, extrai o índice real via dtPerfil:N:j_id70
  //  4. Detecta favorito pela presença de ícone star preenchido
  //     OU pelo link j_id66 (favorito do perfil ativo) NA MESMA row
  //  5. Extrai o nome da <td> mais descritiva (texto mais longo)
  // ══════════════════════════════════════════════════════════

  private async extractProfiles(): Promise<PJELoginResult['profiles']> {
    try {
      const page = await this.followGet(`${PJE_BASE}/pje/ng2/dev.seam`);
      const html = page.body;
      const profiles: Array<{ indice: number; nome: string; orgao: string; favorito: boolean }> = [];

      console.log(`[PJE-AUTH] dev.seam HTML: ${html.length} chars`);

      // ─── Estratégia principal: encontrar TODOS os links dtPerfil:N:j_id70 ───
      // e para cada índice, extrair a <tr> correspondente completa

      // Passo 1: encontrar todos os índices únicos de perfis
      const indexSet = new Set<number>();
      const indexRegex = /papeisUsuarioForm:dtPerfil:(\d+):j_id70/g;
      let idxMatch;
      while ((idxMatch = indexRegex.exec(html)) !== null) {
        indexSet.add(parseInt(idxMatch[1], 10));
      }
      const allIndices = [...indexSet].sort((a, b) => a - b);

      console.log(`[PJE-AUTH] Índices de perfis encontrados: [${allIndices.join(', ')}]`);

      if (allIndices.length === 0) {
        console.warn('[PJE-AUTH] Nenhum índice de perfil encontrado no HTML');
        return [];
      }

      // Passo 2: para cada índice, encontrar a <tr> que contém o link
      for (const idx of allIndices) {
        // Encontrar o link dtPerfil:N:j_id70 no HTML
        const linkPattern = `papeisUsuarioForm:dtPerfil:${idx}:j_id70`;
        const linkPos = html.indexOf(linkPattern);
        if (linkPos < 0) continue;

        // Voltar até o <tr> mais próximo que abre esta row
        const beforeLink = html.substring(Math.max(0, linkPos - 3000), linkPos);
        const trOpenIdx = beforeLink.lastIndexOf('<tr');
        if (trOpenIdx < 0) continue;

        const trStart = Math.max(0, linkPos - 3000) + trOpenIdx;

        // Encontrar o </tr> que fecha esta row
        const afterTrStart = html.substring(trStart);
        const trCloseMatch = afterTrStart.match(/<\/tr>/i);
        if (!trCloseMatch || trCloseMatch.index === undefined) continue;

        const rowHtml = afterTrStart.substring(0, trCloseMatch.index + 5);

        // Passo 3: detectar favorito dentro desta <tr>
        // Favorito pode ser indicado por:
        //  - Link j_id66 na mesma row (perfil favorito com link de "desfavoritar")
        //  - Ícone de estrela preenchida (img com star amarela, ou classe star-filled)
        //  - Classe CSS com "favorit" na mesma row
        const isFavorito =
          rowHtml.includes('j_id66') ||
          // Estrela preenchida como imagem (ex: star_yellow, star_filled, star-on)
          /src="[^"]*star[^"]*(?:yellow|filled|on|active)[^"]*"/i.test(rowHtml) ||
          /src="[^"]*(?:yellow|filled|on|active)[^"]*star[^"]*"/i.test(rowHtml) ||
          // Ícone preenchido via CSS class
          /class="[^"]*(?:ui-icon-star\b|star-filled|favorit|favoritado)/i.test(rowHtml) ||
          // Ícone de estrela RichFaces — star preenchida vs vazia
          // A estrela vazia geralmente tem "j_id68" ou similar, a preenchida tem "j_id66"
          // Verificar se a imagem/ícone de estrela tem src/class indicando "preenchida"
          ((): boolean => {
            // Buscar todas as <img> ou <span> com star na row
            const starImgs = rowHtml.match(/<(?:img|span)[^>]*(?:star|favorit)[^>]*>/gi) || [];
            for (const img of starImgs) {
              // Se a imagem de estrela tem atributos indicando "ativa"
              if (/(?:star_on|star-on|yellow|gold|filled|active|favorit)/i.test(img)) {
                return true;
              }
            }
            return false;
          })();

        // Passo 4: extrair nome do perfil
        // Coletar todas as <td> com texto significativo
        const tds: string[] = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
          const rawText = tdMatch[1];
          const text = this.decodeHtmlEntities(this.stripHtml(rawText).trim());
          // Ignorar células vazias, ícones, botões, ou texto muito curto
          if (text.length > 3 &&
              !/^selecionar$/i.test(text) &&
              !/^favorit/i.test(text) &&
              !/^\s*$/.test(text)) {
            tds.push(text);
          }
        }

        // O nome do perfil é a célula com texto mais longo
        // (contém "ORGAO / Papel / Cargo")
        let nome = '';
        if (tds.length > 0) {
          nome = tds.sort((a, b) => b.length - a.length)[0];
        }

        if (!nome) nome = `Perfil ${idx}`;

        // Passo 5: extrair órgão do nome (primeira parte antes de " / ")
        let orgao = '';
        const parts = nome.split(' / ');
        if (parts.length >= 2) {
          orgao = parts[0].trim();
        }

        profiles.push({ indice: idx, nome, orgao, favorito: isFavorito });
      }

      // ─── Passo 6: Extrair perfil ativo/favorito do <thead> ───
      // O perfil ativo aparece no <thead> com link j_id66 e ícone de
      // estrela preenchida (favorite-16x16.png SEM -disabled).
      // Este perfil NÃO tem dtPerfil:N:j_id70, então não é capturado
      // pelo loop acima. Precisamos adicioná-lo manualmente.
      const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
      if (theadMatch) {
        const thead = theadMatch[1];
        // Verificar se tem j_id66 (link de favorito ativo)
        const hasJ66 = thead.includes('j_id66');
        // Verificar se tem estrela preenchida (não disabled)
        const hasActiveStar =
          thead.includes('favorite-16x16.png') &&
          !thead.includes('favorite-16x16-disabled');

        if (hasJ66 || hasActiveStar) {
          // Extrair nome do perfil ativo
          const j66NameMatch = thead.match(/j_id66[^>]*>([^<]+)/);
          let activeName = j66NameMatch
            ? this.decodeHtmlEntities(j66NameMatch[1].trim())
            : '';

          // Se não encontrou pelo j_id66, buscar a <td> mais longa no thead
          if (!activeName) {
            const theadTds: string[] = [];
            const theadTdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            let theadTdMatch;
            while ((theadTdMatch = theadTdRegex.exec(thead)) !== null) {
              const text = this.decodeHtmlEntities(this.stripHtml(theadTdMatch[1]).trim());
              if (text.length > 3) theadTds.push(text);
            }
            if (theadTds.length > 0) {
              activeName = theadTds.sort((a, b) => b.length - a.length)[0];
            }
          }

          if (activeName) {
            // Verificar se já não foi capturado nos profiles do tbody
            const alreadyExists = profiles.some(
              (p) => p.nome === activeName || p.nome.includes(activeName) || activeName.includes(p.nome)
            );

            if (!alreadyExists) {
              let activeOrgao = '';
              const activeParts = activeName.split(' / ');
              if (activeParts.length >= 2) {
                activeOrgao = activeParts[0].trim();
              }

              // Índice -1 indica perfil ativo (do thead, sem dtPerfil index)
              profiles.unshift({
                indice: -1,
                nome: activeName,
                orgao: activeOrgao,
                favorito: true,
              });

              console.log(`[PJE-AUTH] Perfil ativo do <thead> adicionado: ⭐ ${activeName}`);
            }
          }
        }
      }

      // ─── Log resultado ───
      console.log(`[PJE-AUTH] Perfis extraídos: ${profiles.length}`);
      for (const p of profiles) {
        console.log(`  [${p.indice}] ${p.favorito ? '⭐ ' : '   '}${p.nome}`);
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
    this.idUsuario = stored.idUsuario || '';

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
    const patterns: Array<{ regex: RegExp; message?: string }> = [
      { regex: /class="[^"]*kc-feedback-text[^"]*"[^>]*>([^<]+)/i },
      { regex: /id="kc-error-message"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*login-pf-error[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*alert-error[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*error-message[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*error[^"]*"[^>]*>([^<]+)/i },
      { regex: /class="[^"]*alert[^"]*"[^>]*>([^<]+)/i },
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
        if (message) return message;
        const text = this.decodeHtmlEntities((match[1] || '').trim());
        if (text.length > 2 && text.length < 200) return text;
      }
    }

    return null;
  }

  private extractViewState(html: string): string | null {
    const match = html.match(/javax\.faces\.ViewState[^>]+value="([^"]+)"/);
    return match?.[1] || null;
  }

  private extractHiddenFields(html: string, baseUrl: string): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const regex of [
      /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi,
      /<input[^>]+name="([^"]+)"[^>]+type="hidden"[^>]+value="([^"]*)"/gi,
    ]) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        if (!fields[match[1]]) fields[match[1]] = match[2];
      }
    }

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
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
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
  idUsuario: string;
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
