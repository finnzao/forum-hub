import type { FormFieldsResult } from './types';

export function decodeHtmlEntities(text: string): string {
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
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .trim();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanText(html: string): string {
  return decodeHtmlEntities(stripHtml(html));
}

export function extractViewState(html: string): string | null {
  const strategies = [
    // Dentro do form papeisUsuarioForm
    () => {
      const m = html.match(/<form[^>]+(?:id|name)="papeisUsuarioForm"[^>]*>([\s\S]*?)<\/form>/i);
      return m ? extractVSFromFragment(m[1]) : null;
    },
    // Qualquer form POST
    () => {
      for (const fm of html.matchAll(/<form[^>]+method="post"[^>]*>([\s\S]*?)<\/form>/gi)) {
        const vs = extractVSFromFragment(fm[1]);
        if (vs) return vs;
      }
      return null;
    },
    () => html.match(/<input[^>]+name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i)?.[1] ?? null,
    () => html.match(/<input[^>]+value="([^"]+)"[^>]+name="javax\.faces\.ViewState"/i)?.[1] ?? null,
    () => html.match(/<input[^>]+id="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i)?.[1] ?? null,
    () => html.match(/javax\.faces\.ViewState[\s\S]{0,300}?value="([^"]{10,})"/i)?.[1] ?? null,
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const r = strategies[i]();
      if (r?.length) {
        console.log(`[PJE-AUTH] ViewState estratégia ${i + 1} (${r.length} chars)`);
        return r;
      }
    } catch { }
  }
  return null;
}

function extractVSFromFragment(fragment: string): string | null {
  const patterns = [
    /<input[^>]+name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i,
    /<input[^>]+value="([^"]+)"[^>]+name="javax\.faces\.ViewState"/i,
    /<input[^>]+id="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = fragment.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function extractFormFields(html: string, baseUrl: string): FormFieldsResult {
  const fields: Record<string, string> = {};
  let formHtml = '';
  let actionUrl: string | null = null;

  // Prioriza form com id kc-form-login (SSO Keycloak)
  const kcMatch = html.match(/<form[^>]+id="kc-form-login"[^>]*>([\s\S]*?)<\/form>/i);
  if (kcMatch) {
    formHtml = kcMatch[0];
    const am = kcMatch[0].match(/action="([^"]+)"/i);
    if (am) {
      const a = am[1].replace(/&amp;/g, '&');
      actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
    }
  }

  if (!actionUrl) {
    const postMatch = html.match(/<form[^>]+method="post"[^>]*>([\s\S]*?)<\/form>/i)
      || html.match(/<form[^>]*>([\s\S]*?)<\/form>/i);
    if (postMatch) {
      formHtml = postMatch[0];
      const am = postMatch[0].match(/action="([^"]+)"/i);
      if (am) {
        const a = am[1].replace(/&amp;/g, '&');
        actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
      }
    }
  }

  if (!actionUrl) {
    const am = html.match(/action="([^"]+)"/i);
    if (am) {
      const a = am[1].replace(/&amp;/g, '&');
      actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
    }
    return { actionUrl, fields };
  }

  // Extrai campos hidden e text (não submit/button)
  const inputRegex = /<input[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(formHtml)) !== null) {
    const tag = m[0];
    const nameM = tag.match(/name="([^"]*)"/i);
    if (!nameM) continue;
    const typeM = tag.match(/type="([^"]*)"/i);
    const type = typeM?.[1].toLowerCase() ?? 'text';
    if (['submit', 'button', 'image'].includes(type)) continue;
    const valueM = tag.match(/value="([^"]*)"/i);
    fields[nameM[1]] = valueM ? valueM[1].replace(/&amp;/g, '&') : '';
  }

  console.log(`[PJE-AUTH] Form fields: [${Object.keys(fields).join(', ')}]`);
  return { actionUrl, fields };
}

// Detecção de 2FA: URL contém authenticate E body tem padrões OTP
export function detect2FA(html: string, url: string): boolean {
  const lower = html.toLowerCase();
  const bodyHas2FA = ['codigo enviado', 'digit', 'código', 'verification code', 'otp', 'two-factor', 'totp']
    .some(p => lower.includes(p));
  const urlHas2FA = url.includes('otp') || url.includes('totp');
  // Só detecta se URL ainda está no SSO (não voltou para pje.tjba.jus.br)
  const stillInSSO = url.includes('sso.cloud.pje.jus.br');
  return (bodyHas2FA || urlHas2FA) && stillInSSO;
}

export function extractLoginError(html: string): string | null {
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
      const text = decodeHtmlEntities(stripHtml((match[1] || '').trim()));
      if (text.length > 2 && text.length < 200) return text;
    }
  }
  return null;
}

// Verifica se URL é do painel PJE (autenticado)
export function isLoggedInUrl(url: string): boolean {
  if (!url.includes('pje.tjba.jus.br')) return false;
  return url.includes('painel') ||
    url.includes('dev.seam') ||
    url.includes('ng2') ||
    url.includes('token.seam') || // token.seam = primeiro destino após SSO
    url.endsWith('/pje/') ||
    url.match(/\/pje\/(Processo|magistrado|servidor|advogado)/) !== null;
}

// Verifica se está na página de seleção de perfis
export function isProfileSelectionPage(html: string): boolean {
  return html.includes('papeisUsuarioForm') || html.includes('dtPerfil');
}

export function resolveUrl(location: string, base: string): string {
  if (location.startsWith('http')) return location;
  try { return new URL(location, base).toString(); } catch { return location; }
}
