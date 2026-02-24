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

/**
 * Serializa dados para exibição no console, tratando objetos vazios,
 * erros e valores não-serializáveis de forma legível.
 */
function serializeDados(dados: unknown): unknown {
  if (dados === undefined || dados === null) return dados;

  // Se for um Error, extrair informações úteis
  if (dados instanceof Error) {
    return {
      tipo: dados.name,
      mensagem: dados.message,
      stack: dados.stack?.split('\n').slice(0, 5).join('\n'),
      ...(dados as any).status !== undefined ? { status: (dados as any).status } : {},
      ...(dados as any).data !== undefined ? { data: (dados as any).data } : {},
    };
  }

  // Se for um objeto vazio, indicar explicitamente
  if (typeof dados === 'object' && dados !== null && Object.keys(dados).length === 0) {
    return '(objeto vazio — sem detalhes adicionais)';
  }

  return dados;
}

function log(level: LogLevel, modulo: string, mensagem: string, dados?: unknown): void {
  if (!IS_DEV) return;

  const ts = timestamp();
  const prefix = `%c[PJE ${ts}] ${ICONES[level]} [${modulo}]`;
  const serializedDados = serializeDados(dados);

  if (level === 'error') {
    // Erros sempre expandidos para maior visibilidade
    console.group(`${prefix} ${mensagem}`, CORES[level]);
    if (serializedDados !== undefined) {
      if (typeof serializedDados === 'string') {
        console.log(`%c${serializedDados}`, 'color:#dc2626');
      } else {
        console.log(serializedDados);
      }
    }
    console.trace('Stack trace');
    console.groupEnd();
  } else if (serializedDados !== undefined) {
    console.groupCollapsed(`${prefix} ${mensagem}`, CORES[level]);
    console.log(serializedDados);
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

  /** Erros — sempre expandidos no console para visibilidade */
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

  /** Mede tempo de uma operação async com logs detalhados de erro */
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

      // Mensagem de erro mais descritiva
      let errMsg: string;
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errMsg = `Falha de rede — servidor inacessível`;
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = String(err);
      }

      log('error', modulo, `⏱ Falhou: ${label} — ${errMsg} (${duracao}ms)`, err);
      throw err;
    }
  },
};