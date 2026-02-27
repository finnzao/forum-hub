import { CookieJar } from './cookie-jar';
import { PJEHttpClient } from './http-client';
import { sessionStore, generateSessionId, getPersistedSession, savePersistedSession, clearPersistedSession } from './session-store';
import { extractProfilesFromHtml, isActiveProfileIndex, resolveProfileIndex } from './profile-extractor';
import { extractFormFields, extractViewState, detect2FA, extractLoginError, isLoggedInUrl } from './html-parser';
import { PJE_BASE } from './constants';
import type { PJELoginResult, PJEProfileResult, PJEUserInfo } from './types';

export class PJEAuthProxy {
  private cookieJar = new CookieJar();
  private http = new PJEHttpClient(this.cookieJar);
  private idUsuarioLocalizacao = '';
  private idUsuario: number | undefined;
  private cpf = '';

  async login(cpf: string, password: string): Promise<PJELoginResult> {
    this.cpf = cpf;
    try {
      const reused = await this.tryReusePersistedSession(cpf);
      if (reused) return reused;

      const ssoPage = await this.navigateToSSOForm();
      if (isLoggedInUrl(ssoPage.finalUrl)) {
        console.log(`[PJE-AUTH] Sessão já ativa`);
        return await this.validateAndBuildResponse();
      }

      const loginResult = await this.submitSSOCredentials(ssoPage, cpf, password);
      if (!loginResult) {
        return { needs2FA: false, error: 'Formulário SSO não encontrado.' };
      }

      return await this.handleLoginResult(loginResult);
    } catch (err) {
      console.error(`[PJE-AUTH] Exception:`, err);
      return { needs2FA: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }

  async submit2FA(sessionId: string, code: string): Promise<PJELoginResult> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return { needs2FA: false, error: 'Sessão 2FA expirada.' };

      this.restoreFromSession(stored);

      const formData = extractFormFields(stored.ssoHtml || '', stored.ssoFinalUrl || '');
      if (!formData.actionUrl) return { needs2FA: false, error: 'Formulário 2FA não encontrado.' };

      const postFields = { ...formData.fields, code };
      const result = await this.http.followRedirects('POST', formData.actionUrl, new URLSearchParams(postFields));
      sessionStore.delete(sessionId);

      if (isLoggedInUrl(result.finalUrl)) {
        return await this.validateAndBuildResponse();
      }

      if (detect2FA(result.body, result.finalUrl)) {
        this.persistSession();
        const newSid = generateSessionId();
        sessionStore.set(newSid, {
          cookies: this.cookieJar.exportAll(),
          idUsuarioLocalizacao: this.idUsuarioLocalizacao,
          idUsuario: this.idUsuario,
          ssoHtml: result.body,
          ssoFinalUrl: result.finalUrl,
          cpf: this.cpf,
        });
        return { needs2FA: true, sessionId: newSid, error: 'Código inválido ou expirado.' };
      }

      return { needs2FA: false, error: 'Falha na verificação 2FA.' };
    } catch (err) {
      return { needs2FA: false, error: err instanceof Error ? err.message : 'Erro no 2FA' };
    }
  }

  async selectProfile(sessionId: string, profileIndex: number): Promise<PJEProfileResult> {
    try {
      const stored = sessionStore.get(sessionId);
      if (!stored) return { tasks: [], favoriteTasks: [], tags: [], error: 'SESSION_EXPIRED' };

      this.restoreFromSession(stored);

      const profilePage = await this.http.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`);

      // Detecta se a sessão expirou (redirecionou para SSO)
      if (this.isRedirectedToSSO(profilePage.finalUrl)) {
        console.error(`[PJE-AUTH] Sessão PJE expirada — redirecionou para SSO`);
        console.error(`[PJE-AUTH]   URL final: ${profilePage.finalUrl}`);
        console.error(`[PJE-AUTH]   Cookies: ${this.cookieJar.summary()}`);

        if (this.cpf) clearPersistedSession(this.cpf);
        sessionStore.delete(sessionId);

        return { tasks: [], favoriteTasks: [], tags: [], error: 'SESSION_EXPIRED' };
      }

      const viewState = extractViewState(profilePage.body);
      if (!viewState) {
        console.error(`[PJE-AUTH] ViewState não encontrado na página de perfis`);
        console.error(`[PJE-AUTH]   URL final: ${profilePage.finalUrl}`);
        console.error(`[PJE-AUTH]   Cookies: ${this.cookieJar.summary()}`);

        if (this.cpf) clearPersistedSession(this.cpf);
        sessionStore.delete(sessionId);

        return { tasks: [], favoriteTasks: [], tags: [], error: 'SESSION_EXPIRED' };
      }

      console.log(`[PJE-AUTH] ViewState encontrado (${viewState.length} chars): ${viewState.slice(0, 20)}...`);

      await this.switchProfileIfNeeded(profilePage.body, profileIndex, viewState);

      const user = await this.fetchCurrentUser();
      if (user?.idUsuarioLocalizacaoMagistradoServidor) {
        this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor);
        this.idUsuario = user.idUsuario;
        console.log(`[PJE-AUTH] idUsuarioLocalizacao atualizado: ${this.idUsuarioLocalizacao}`);
        console.log(`[PJE-AUTH] idUsuario atualizado: ${this.idUsuario}`);
      }

      stored.cookies = this.cookieJar.exportAll();
      stored.idUsuarioLocalizacao = this.idUsuarioLocalizacao;
      stored.idUsuario = this.idUsuario;
      this.persistSession(user);

      return await this.fetchTasksAndTags();
    } catch (err) {
      console.error('[PJE-AUTH] Erro em selectProfile:', err);
      return { tasks: [], favoriteTasks: [], tags: [], error: err instanceof Error ? err.message : 'Erro ao selecionar perfil' };
    }
  }

  private isRedirectedToSSO(finalUrl: string): boolean {
    return finalUrl.includes('sso.cloud.pje.jus.br') ||
           finalUrl.includes('openid-connect/auth') ||
           finalUrl.includes('/auth/realms/');
  }

  async debugGetProfilesHtml(sessionId: string): Promise<string> {
    const stored = sessionStore.get(sessionId);
    if (!stored) return '<h1>Sessão não encontrada</h1>';
    this.restoreFromSession(stored);
    return (await this.http.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`)).body;
  }

  private async tryReusePersistedSession(cpf: string): Promise<PJELoginResult | null> {
    const persisted = getPersistedSession(cpf);
    if (!persisted) return null;

    console.log(`[PJE-AUTH] Sessão persistida encontrada para CPF ***${cpf.slice(-4)}, validando...`);
    this.cookieJar.importAll(persisted.cookies);
    this.idUsuarioLocalizacao = persisted.idUsuarioLocalizacao;
    this.idUsuario = persisted.idUsuario;

    const user = await this.fetchCurrentUser();
    if (!user?.idUsuario) {
      console.log(`[PJE-AUTH] Sessão persistida EXPIRADA — login completo`);
      clearPersistedSession(cpf);
      this.cookieJar.clear();
      return null;
    }

    console.log(`[PJE-AUTH] Sessão persistida VÁLIDA — reutilizando`);
    this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor || '');
    this.idUsuario = user.idUsuario;

    const sid = generateSessionId();
    sessionStore.set(sid, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: this.idUsuario,
      cpf: this.cpf,
    });

    savePersistedSession(cpf, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: this.idUsuario,
      user: this.mapUser(user),
    });

    return {
      needs2FA: false,
      sessionId: sid,
      user: this.mapUser(user),
    };
  }

  private async navigateToSSOForm() {
    console.log(`[PJE-AUTH] Step 1: GET ${PJE_BASE}/pje/login.seam`);
    const ssoPage = await this.http.followRedirects('GET', `${PJE_BASE}/pje/login.seam`);
    console.log(`[PJE-AUTH] Step 1 done: finalUrl=${ssoPage.finalUrl} (${ssoPage.body.length} chars)`);
    return ssoPage;
  }

  private async submitSSOCredentials(
    ssoPage: { body: string; finalUrl: string },
    cpf: string,
    password: string,
  ) {
    const formData = extractFormFields(ssoPage.body, ssoPage.finalUrl);
    if (!formData.actionUrl) {
      console.error(`[PJE-AUTH] Form SSO não encontrado. URL: ${ssoPage.finalUrl}`);
      return null;
    }

    const postFields = { ...formData.fields, username: cpf, password };
    console.log(`[PJE-AUTH] Step 2: POST to ${formData.actionUrl.substring(0, 100)}...`);
    console.log(`[PJE-AUTH]   form fields: [${Object.keys(postFields).join(', ')}]`);

    const result = await this.http.followRedirects('POST', formData.actionUrl, new URLSearchParams(postFields));
    console.log(`[PJE-AUTH] Step 2 done: finalUrl=${result.finalUrl} (status=${result.status})`);
    return result;
  }

  private async handleLoginResult(result: { body: string; finalUrl: string; status: number }): Promise<PJELoginResult> {
    if (detect2FA(result.body, result.finalUrl)) {
      this.persistSession();
      const sid = generateSessionId();
      sessionStore.set(sid, {
        cookies: this.cookieJar.exportAll(),
        idUsuarioLocalizacao: this.idUsuarioLocalizacao,
        idUsuario: this.idUsuario,
        ssoHtml: result.body,
        ssoFinalUrl: result.finalUrl,
        cpf: this.cpf,
      });
      return { needs2FA: true, sessionId: sid };
    }

    if (isLoggedInUrl(result.finalUrl)) {
      console.log(`[PJE-AUTH] Login OK — chegou ao painel`);
      return await this.validateAndBuildResponse();
    }

    if (result.finalUrl.includes('openid-connect/auth') ||
        result.finalUrl.includes('sso.cloud.pje.jus.br/auth/realms')) {
      const errorMsg = extractLoginError(result.body);
      if (errorMsg) return { needs2FA: false, error: errorMsg };

      if (result.body.includes('kc-form-login') || result.body.includes('username')) {
        console.log(`[PJE-AUTH] Voltou ao form SSO`);
        return { needs2FA: false, error: 'CPF ou senha incorretos.' };
      }
    }

    const errorMsg = extractLoginError(result.body);
    if (errorMsg) return { needs2FA: false, error: errorMsg };

    console.error(`[PJE-AUTH] Login falhou. URL: ${result.finalUrl}`);
    return { needs2FA: false, error: 'Falha no login. Verifique CPF e senha.' };
  }

  private async validateAndBuildResponse(): Promise<PJELoginResult> {
    const user = await this.fetchCurrentUser();
    if (!user?.idUsuario) {
      console.error('[PJE-AUTH] currentUser falhou. Cookies:', this.cookieJar.summary());
      return { needs2FA: false, error: 'Sessão inválida após login.' };
    }

    this.idUsuarioLocalizacao = String(user.idUsuarioLocalizacaoMagistradoServidor || '');
    this.idUsuario = user.idUsuario;
    const sid = generateSessionId();
    sessionStore.set(sid, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: this.idUsuario,
      cpf: this.cpf,
    });

    this.persistSession(user);

    const profilePage = await this.http.followRedirects('GET', `${PJE_BASE}/pje/ng2/dev.seam`);
    const profiles = extractProfilesFromHtml(profilePage.body);

    return {
      needs2FA: false,
      sessionId: sid,
      user: this.mapUser(user),
      profiles,
    };
  }

  private async switchProfileIfNeeded(html: string, profileIndex: number, viewState: string): Promise<void> {
    if (isActiveProfileIndex(html, profileIndex)) {
      console.log(`[PJE-AUTH] Perfil #${profileIndex} já é o perfil ativo, pulando troca`);
      return;
    }

    const realIndex = resolveProfileIndex(html, profileIndex);
    console.log(`[PJE-AUTH] Trocando para perfil: profileIndex=${profileIndex}, realIndex=${realIndex}`);

    await this.http.followRedirects('POST', `${PJE_BASE}/pje/ng2/dev.seam`, new URLSearchParams({
      'papeisUsuarioForm': 'papeisUsuarioForm',
      'papeisUsuarioForm:j_id60': '',
      'javax.faces.ViewState': viewState,
      [`papeisUsuarioForm:dtPerfil:${realIndex}:j_id70`]: `papeisUsuarioForm:dtPerfil:${realIndex}:j_id70`,
    }));
  }

  private async fetchTasksAndTags(): Promise<PJEProfileResult> {
    const [tasks, favoriteTasks, tagsResult] = await Promise.all([
      this.http.apiPost<any[]>('painelUsuario/tarefas', { numeroProcesso: '', competencia: '', etiquetas: [] }, this.idUsuarioLocalizacao).catch((e) => {
        console.error('[PJE-AUTH] Erro ao buscar tarefas:', e);
        return [];
      }),
      this.http.apiPost<any[]>('painelUsuario/tarefasFavoritas', { numeroProcesso: '', competencia: '', etiquetas: [] }, this.idUsuarioLocalizacao).catch((e) => {
        console.error('[PJE-AUTH] Erro ao buscar tarefas favoritas:', e);
        return [];
      }),
      this.http.apiPost<{ entities: any[] }>('painelUsuario/etiquetas', { page: 0, maxResults: 500, tagsString: '' }, this.idUsuarioLocalizacao).catch((e) => {
        console.error('[PJE-AUTH] Erro ao buscar etiquetas:', e);
        return { entities: [] };
      }),
    ]);

    const taskList = Array.isArray(tasks) ? tasks : [];
    const favList = Array.isArray(favoriteTasks) ? favoriteTasks : [];
    const tagList = tagsResult?.entities || [];

    console.log(`[PJE-AUTH] Perfil OK: ${taskList.length} tarefas, ${favList.length} favoritas, ${tagList.length} etiquetas`);

    return { tasks: taskList, favoriteTasks: favList, tags: tagList };
  }

  private async fetchCurrentUser(): Promise<any> {
    try {
      return await this.http.apiGet<any>('usuario/currentUser', this.idUsuarioLocalizacao);
    } catch {
      return null;
    }
  }

  private restoreFromSession(stored: { cookies: Record<string, string>; idUsuarioLocalizacao: string; idUsuario?: number; cpf?: string }): void {
    this.cookieJar.importAll(stored.cookies);
    this.idUsuarioLocalizacao = stored.idUsuarioLocalizacao;
    this.idUsuario = stored.idUsuario;
    this.cpf = stored.cpf || '';
  }

  private persistSession(user?: any): void {
    if (!this.cpf) return;
    savePersistedSession(this.cpf, {
      cookies: this.cookieJar.exportAll(),
      idUsuarioLocalizacao: this.idUsuarioLocalizacao,
      idUsuario: this.idUsuario ?? user?.idUsuario,
      user: user ? this.mapUser(user) : undefined,
    });
  }

  private mapUser(raw: any): PJEUserInfo {
    return {
      idUsuario: raw.idUsuario,
      nomeUsuario: raw.nomeUsuario,
      login: raw.login,
      perfil: raw.perfil || raw.nomePerfil || '',
      nomePerfil: raw.nomePerfil || raw.perfil || '',
      idUsuarioLocalizacaoMagistradoServidor: raw.idUsuarioLocalizacaoMagistradoServidor,
    };
  }
}
