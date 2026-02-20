// ============================================================
// app/componentes/pje-download/logger.ts
// Logger de desenvolvimento para debug do fluxo PJE
// Ativo apenas quando NEXT_PUBLIC_PJE_DEBUG=true ou NODE_ENV=development
// ============================================================

const IS_DEV =
  typeof window !== 'undefined' &&
  (process.env.NEXT_PUBLIC_PJE_DEBUG === 'true' ||
   process.env.NODE_ENV === 'development');

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

const CORES: Record<LogLevel, string> = {
  info:    'color:#3b82f6;font-weight:bold',   // blue
  warn:    'color:#f59e0b;font-weight:bold',   // amber
  error:   'color:#ef4444;font-weight:bold',   // red
  success: 'color:#10b981;font-weight:bold',   // emerald
  debug:   'color:#8b5cf6;font-weight:bold',   // violet
};

const ICONES: Record<LogLevel, string> = {
  info:    'ℹ️',
  warn:    '⚠️',
  error:   '❌',
  success: '✅',
  debug:   '🔍',
};

function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function log(level: LogLevel, modulo: string, mensagem: string, dados?: unknown): void {
  if (!IS_DEV) return;

  const ts = timestamp();
  const prefix = `%c[PJE ${ts}] ${ICONES[level]} [${modulo}]`;

  if (dados !== undefined) {
    console.groupCollapsed(`${prefix} ${mensagem}`, CORES[level]);
    console.log(dados);
    console.groupEnd();
  } else {
    console.log(`${prefix} ${mensagem}`, CORES[level]);
  }
}

export const logger = {
  /** Informação geral de fluxo */
  info: (modulo: string, mensagem: string, dados?: unknown) =>
    log('info', modulo, mensagem, dados),

  /** Avisos não-bloqueantes */
  warn: (modulo: string, mensagem: string, dados?: unknown) =>
    log('warn', modulo, mensagem, dados),

  /** Erros */
  error: (modulo: string, mensagem: string, dados?: unknown) =>
    log('error', modulo, mensagem, dados),

  /** Ações concluídas com sucesso */
  success: (modulo: string, mensagem: string, dados?: unknown) =>
    log('success', modulo, mensagem, dados),

  /** Dados detalhados para debug */
  debug: (modulo: string, mensagem: string, dados?: unknown) =>
    log('debug', modulo, mensagem, dados),

  /** Grupo colapsável para operações longas */
  group: (modulo: string, label: string, fn: () => void): void => {
    if (!IS_DEV) { fn(); return; }
    console.groupCollapsed(`%c[PJE ${timestamp()}] 📂 [${modulo}] ${label}`, CORES.debug);
    fn();
    console.groupEnd();
  },

  /** Mede tempo de uma operação async */
  async time<T>(modulo: string, label: string, fn: () => Promise<T>): Promise<T> {
    if (!IS_DEV) return fn();
    const inicio = performance.now();
    log('info', modulo, `⏱ Iniciando: ${label}`);
    try {
      const resultado = await fn();
      const duracao = (performance.now() - inicio).toFixed(0);
      log('success', modulo, `⏱ Concluído: ${label} (${duracao}ms)`, resultado);
      return resultado;
    } catch (err) {
      const duracao = (performance.now() - inicio).toFixed(0);
      log('error', modulo, `⏱ Falhou: ${label} (${duracao}ms)`, err);
      throw err;
    }
  },
};
