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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
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
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function extractViewState(html: string): string | null {
  const strategies: Array<() => string | null> = [
    () => {
      const formMatch = html.match(/<form[^>]+(?:id|name)="papeisUsuarioForm"[^>]*>([\s\S]*?)<\/form>/i);
      if (!formMatch) return null;
      return extractViewStateFromFragment(formMatch[1]);
    },
    () => {
      for (const fm of html.matchAll(/<form[^>]+method="post"[^>]*>([\s\S]*?)<\/form>/gi)) {
        const vs = extractViewStateFromFragment(fm[1]);
        if (vs) return vs;
      }
      return null;
    },
    () => {
      const m = html.match(/<input[^>]+name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i);
      return m?.[1] ?? null;
    },
    () => {
      const m = html.match(/<input[^>]+value="([^"]+)"[^>]+name="javax\.faces\.ViewState"/i);
      return m?.[1] ?? null;
    },
    () => {
      const m = html.match(/<input[^>]+id="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i);
      return m?.[1] ?? null;
    },
    () => {
      const m = html.match(/javax\.faces\.ViewState[\s\S]{0,300}?value="([^"]{10,})"/i);
      return m?.[1] ?? null;
    },
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      if (result?.length) {
        console.log(`[PJE-AUTH] ViewState via estratégia ${i + 1} (${result.length} chars)`);
        return result;
      }
    } catch { }
  }
  return null;
}

function extractViewStateFromFragment(fragment: string): string | null {
  const patterns = [
    /<input[^>]+name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i,
    /<input[^>]+value="([^"]+)"[^>]+name="javax\.faces\.ViewState"/i,
    /<input[^>]+id="javax\.faces\.ViewState"[^>]+value="([^"]+)"/i,
    /<input[^>]+value="([^"]+)"[^>]+id="javax\.faces\.ViewState"/i,
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

  const kcFormMatch = html.match(/<form[^>]+id="kc-form-login"[^>]*>([\s\S]*?)<\/form>/i);
  if (kcFormMatch) {
    formHtml = kcFormMatch[0];
    const actionMatch = kcFormMatch[0].match(/action="([^"]+)"/i);
    if (actionMatch) {
      const a = actionMatch[1].replace(/&amp;/g, '&');
      actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
    }
  }

  if (!actionUrl) {
    const postFormMatch = html.match(/<form[^>]+method="post"[^>]*>([\s\S]*?)<\/form>/i)
      || html.match(/<form[^>]*>([\s\S]*?)<\/form>/i);
    if (postFormMatch) {
      formHtml = postFormMatch[0];
      const actionMatch = postFormMatch[0].match(/action="([^"]+)"/i);
      if (actionMatch) {
        const a = actionMatch[1].replace(/&amp;/g, '&');
        actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
      }
    }
  }

  if (!actionUrl) {
    const actionMatch = html.match(/action="([^"]+)"/i);
    if (actionMatch) {
      const a = actionMatch[1].replace(/&amp;/g, '&');
      actionUrl = a.startsWith('http') ? a : resolveUrl(a, baseUrl);
    }
    return { actionUrl, fields };
  }

  const inputRegex = /<input[^>]*>/gi;
  let inputMatch;
  while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
    const tag = inputMatch[0];
    const nameMatch = tag.match(/name="([^"]*)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
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

export function detect2FA(html: string, url: string): boolean {
  const lower = html.toLowerCase();
  return ['codigo enviado', 'digite o codigo', 'código de verificação', 'verification code', 'otp', 'two-factor']
    .some((p) => lower.includes(p)) || url.includes('otp');
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

export function isLoggedInUrl(url: string): boolean {
  return url.includes('/pje/') && (
    url.includes('painel') || url.includes('dev.seam') ||
    url.endsWith('/pje/') || url.includes('ng2')
  );
}

export function resolveUrl(location: string, base: string): string {
  if (location.startsWith('http')) return location;
  try { return new URL(location, base).toString(); } catch { return location; }
}
