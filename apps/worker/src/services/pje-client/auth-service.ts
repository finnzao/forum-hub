// ============================================================
// apps/worker/src/services/pje-client/auth-service.ts
// Auth Service — login SSO, detecção 2FA, validação de sessão
// ============================================================

import { PJEHttpClient, type PJESession } from './http-client';
import { config } from '../../config';

export interface LoginResult {
  success: boolean;
  needs2FA: boolean;
  session?: PJESession;
  error?: string;
}

export interface CurrentUser {
  idUsuario: number;
  nomeUsuario: string;
  login: string;
  idUsuarioLocalizacaoMagistradoServidor: number;
  perfil: string;
  nomePerfil: string;
}

export class AuthService {
  constructor(private http: PJEHttpClient) {}

  async login(cpf: string, password: string): Promise<LoginResult> {
    try {
      // 1. Acessar login.seam → redireciona para SSO
      const { html: ssoHtml, finalUrl } = await this.http.ssoGet(
        `${config.pje.baseUrl}/pje/login.seam`
      );

      // 2. Extrair action URL do formulário SSO
      const actionUrl = this.extractFormAction(ssoHtml, finalUrl);
      if (!actionUrl) {
        return { success: false, needs2FA: false, error: 'Não encontrou formulário SSO.' };
      }

      // 3. POST credenciais
      const body = new URLSearchParams({
        username: cpf,
        password: password,
        credentialId: '',
      });

      const ssoResult = await this.http.ssoPost(actionUrl, body);

      // 4. Verificar se precisa de 2FA
      if (this.detect2FA(ssoResult.html, ssoResult.finalUrl)) {
        return { success: false, needs2FA: true };
      }

      // 5. Verificar se login foi bem-sucedido
      if (
        ssoResult.finalUrl.includes('/pje/') ||
        ssoResult.finalUrl.includes('/pje/painel') ||
        ssoResult.finalUrl.includes('dev.seam')
      ) {
        const user = await this.validateSession();
        if (user) {
          const session: PJESession = {
            cookies: {},
            idUsuarioLocalizacao: String(user.idUsuarioLocalizacaoMagistradoServidor),
            idUsuario: user.idUsuario,
            nomeUsuario: user.nomeUsuario,
            perfil: user.perfil,
            createdAt: Date.now(),
          };
          this.http.setLocalizacao(session.idUsuarioLocalizacao);
          return { success: true, needs2FA: false, session };
        }
      }

      const errorMsg = this.extractLoginError(ssoResult.html);
      return {
        success: false,
        needs2FA: false,
        error: errorMsg || 'Login falhou. Verifique CPF e senha.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no login';
      return { success: false, needs2FA: false, error: message };
    }
  }

  async submit2FA(code: string, ssoPageHtml?: string): Promise<LoginResult> {
    try {
      const html = ssoPageHtml || (await this.http.ssoGet(`${config.pje.baseUrl}/pje/login.seam`)).html;
      const actionUrl = this.extractFormAction(html, config.pje.ssoUrl);

      if (!actionUrl) {
        return { success: false, needs2FA: false, error: 'Formulário 2FA não encontrado.' };
      }

      const hiddenFields = this.extractHiddenFields(html);

      const body = new URLSearchParams({
        code,
        ...hiddenFields,
      });

      const result = await this.http.ssoPost(actionUrl, body);

      if (
        result.finalUrl.includes('/pje/') ||
        result.finalUrl.includes('dev.seam')
      ) {
        const user = await this.validateSession();
        if (user) {
          const session: PJESession = {
            cookies: {},
            idUsuarioLocalizacao: String(user.idUsuarioLocalizacaoMagistradoServidor),
            idUsuario: user.idUsuario,
            nomeUsuario: user.nomeUsuario,
            perfil: user.perfil,
            createdAt: Date.now(),
          };
          this.http.setLocalizacao(session.idUsuarioLocalizacao);
          return { success: true, needs2FA: false, session };
        }
      }

      if (this.detect2FA(result.html, result.finalUrl)) {
        return {
          success: false,
          needs2FA: true,
          error: 'Código 2FA inválido ou expirado. Tente novamente.',
        };
      }

      return { success: false, needs2FA: false, error: 'Falha na verificação 2FA.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no 2FA';
      return { success: false, needs2FA: false, error: message };
    }
  }

  async validateSession(): Promise<CurrentUser | null> {
    try {
      const user = await this.http.apiGet<CurrentUser>('usuario/currentUser');
      if (user?.idUsuario) {
        return user;
      }
      return null;
    } catch {
      return null;
    }
  }

  async isSessionDegraded(): Promise<boolean> {
    try {
      const tasks = await this.http.apiPost('painelUsuario/tarefas', {
        numeroProcesso: '',
        competencia: '',
        etiquetas: [],
      });

      if (Array.isArray(tasks) && tasks.length > 0) {
        return tasks[0]?.idTask !== undefined && tasks[0]?.quantidadePendente === undefined;
      }
      return false;
    } catch {
      return true;
    }
  }

  // ── Helpers privados ───────────────────────────────────

  private extractFormAction(html: string, baseUrl: string): string | null {
    const match = html.match(/action="([^"]+)"/);
    if (!match) return null;

    const action = match[1].replace(/&amp;/g, '&');
    if (action.startsWith('http')) return action;

    const url = new URL(action, baseUrl);
    return url.toString();
  }

  private detect2FA(html: string, url: string): boolean {
    const lowerHtml = html.toLowerCase();
    const patterns = [
      'codigo enviado',
      'digite o codigo',
      'código de verificação',
      'verification code',
      'otp',
      'two-factor',
    ];
    return patterns.some((p) => lowerHtml.includes(p)) || url.includes('otp');
  }

  private extractLoginError(html: string): string | null {
    const errorPatterns = [
      /class="[^"]*error[^"]*"[^>]*>([^<]+)/i,
      /class="[^"]*alert[^"]*"[^>]*>([^<]+)/i,
      /Usuário ou senha inválidos/i,
      /Conta bloqueada/i,
    ];

    for (const pattern of errorPatterns) {
      const match = html.match(pattern);
      if (match) return match[1]?.trim() || match[0];
    }
    return null;
  }

  private extractHiddenFields(html: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const regex = /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      fields[match[1]] = match[2];
    }

    const actionMatch = html.match(/action="([^"]+)"/);
    if (actionMatch) {
      const url = actionMatch[1].replace(/&amp;/g, '&');
      try {
        const parsed = new URL(url, config.pje.ssoUrl);
        for (const [key, value] of parsed.searchParams) {
          if (['session_code', 'execution', 'tab_id'].includes(key)) {
            fields[key] = value;
          }
        }
      } catch { /* ignore */ }
    }

    return fields;
  }
}
