import {
  API_BASE, PJE_CPF, PJE_PASSWORD, PJE_PROFILE_INDEX,
  validateCredentials, apiPost, log, separator,
} from './helpers.js';

interface LoginResult {
  needs2FA: boolean;
  sessionId?: string;
  user?: { idUsuario: number; nomeUsuario: string };
  profiles?: Array<{ indice: number; nome: string; favorito: boolean }>;
}

interface ProfileResult {
  tasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  favoriteTasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  tags: Array<{ id: number; nomeTag: string }>;
}

async function main() {
  separator('FLUXO COMPLETO: Login → Perfil → Stream');
  validateCredentials();

  const maxProcessos = parseInt(process.argv[2] || '5', 10);
  const targetTask = process.argv[3] || '';

  log('📌', `Limite de processos: ${maxProcessos}`);
  if (targetTask) log('📌', `Tarefa alvo: "${targetTask}"`);

  // ═══ FASE 1: Login ═══
  log('🔐', `Login CPF ***${PJE_CPF.slice(-4)}...`);
  const loginStart = Date.now();

  const loginResult = await apiPost<LoginResult>('/api/pje/downloads/auth/login', {
    cpf: PJE_CPF,
    password: PJE_PASSWORD,
  });

  if (loginResult.needs2FA) {
    log('📱', '2FA necessário. Execute manualmente:');
    log('💡', `npx tsx scripts/02-submit-2fa.ts <código> ${loginResult.sessionId}`);
    process.exit(0);
  }

  if (!loginResult.user || !loginResult.sessionId) {
    log('❌', 'Login falhou');
    process.exit(1);
  }

  log('✅', `Login OK: ${loginResult.user.nomeUsuario} (${Date.now() - loginStart}ms)`);

  const sessionId = loginResult.sessionId;

  // ═══ FASE 2: Selecionar Perfil ═══
  log('👤', `Selecionando perfil #${PJE_PROFILE_INDEX}...`);

  const profileResult = await apiPost<ProfileResult>('/api/pje/downloads/auth/profile', {
    sessionId,
    profileIndex: PJE_PROFILE_INDEX,
  });

  log('✅', `Perfil OK: ${profileResult.tasks.length} tarefas, ${profileResult.tags.length} etiquetas`);

  // ═══ FASE 3: Escolher tarefa ═══
  let chosenTask = '';

  if (targetTask) {
    const found = profileResult.tasks.find(
      (t) => t.nome.toLowerCase().includes(targetTask.toLowerCase()),
    );
    if (!found) {
      log('❌', `Tarefa "${targetTask}" não encontrada`);
      log('📋', 'Tarefas disponíveis:');
      for (const t of profileResult.tasks.slice(0, 10)) {
        console.log(`   [${t.quantidadePendente}] ${t.nome}`);
      }
      process.exit(1);
    }
    chosenTask = found.nome;
    log('📋', `Tarefa encontrada: "${chosenTask}" (${found.quantidadePendente} processos)`);
  } else {
    const withProcesses = profileResult.tasks
      .filter((t) => t.quantidadePendente > 0 && t.quantidadePendente <= maxProcessos)
      .sort((a, b) => a.quantidadePendente - b.quantidadePendente);

    if (withProcesses.length === 0) {
      const any = profileResult.tasks
        .filter((t) => t.quantidadePendente > 0)
        .sort((a, b) => a.quantidadePendente - b.quantidadePendente);

      if (any.length === 0) {
        log('⚠️', 'Nenhuma tarefa com processos pendentes');
        process.exit(0);
      }

      chosenTask = any[0].nome;
      log('⚠️', `Nenhuma tarefa com ≤${maxProcessos} processos. Usando "${chosenTask}" (${any[0].quantidadePendente})`);
    } else {
      chosenTask = withProcesses[0].nome;
      log('📋', `Tarefa auto-selecionada: "${chosenTask}" (${withProcesses[0].quantidadePendente} processos)`);
    }
  }

  // ═══ FASE 4: Stream SSE ═══
  separator('STREAM SSE');
  log('📡', `Conectando ao stream-batch...`);

  const sseUrl = new URL(`${API_BASE}/api/pje/downloads/stream-batch`);
  sseUrl.searchParams.set('sessionId', sessionId);
  sseUrl.searchParams.set('mode', 'by_task');
  sseUrl.searchParams.set('taskName', chosenTask);

  const res = await fetch(sseUrl.toString(), {
    headers: {
      'Accept': 'text/event-stream',
      'x-user': JSON.stringify({ id: 1, name: 'Test', role: 'magistrado' }),
    },
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    log('❌', `HTTP ${res.status}: ${body.slice(0, 300)}`);
    process.exit(1);
  }

  log('✅', 'SSE conectado\n');

  const stats = { urls: 0, errors: 0, queued: 0 };
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  const reader = res.body.getReader();
  const streamStart = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6);
      } else if (line === '' && currentEvent && currentData) {
        processEvent(currentEvent, currentData);
        currentEvent = '';
        currentData = '';
      }
    }
  }

  // ═══ RESULTADO ═══
  const totalElapsed = Math.round((Date.now() - streamStart) / 1000);
  separator('RESULTADO FINAL');
  log('🔗', `URLs extraídas: ${stats.urls}`);
  log('⏳', `Enfileirados: ${stats.queued}`);
  log('❌', `Erros: ${stats.errors}`);
  log('⏱️', `Tempo stream: ${totalElapsed}s`);

  if (stats.urls > 0) {
    log('✅', 'Os PDFs podem ser baixados diretamente das URLs acima (S3) ou via proxy');
  }

  function processEvent(event: string, rawData: string) {
    try {
      const data = JSON.parse(rawData);

      switch (event) {
        case 'auth':
          log('🔐', `Sessão validada (localizacao=${data.user})`);
          break;
        case 'listing':
          log('📋', `${data.total} processos para processar`);
          break;
        case 'progress':
          process.stdout.write(`\r   ⏳ [${data.index}/${data.total}] ${data.processNumber}     `);
          break;
        case 'url':
          stats.urls++;
          console.log();
          log('🔗', `${data.processNumber} → ${data.method} (${data.fileSize ? (data.fileSize / 1024 / 1024).toFixed(1) + 'MB' : '?'})`);
          break;
        case 'queued':
          stats.queued++;
          console.log();
          log('⏳', `${data.processNumber}: enfileirado`);
          break;
        case 'error':
          stats.errors++;
          console.log();
          log('❌', `${data.processNumber || '?'}: ${data.message}`);
          break;
        case 'done':
          console.log();
          log('🏁', `Servidor: ${data.success} ok, ${data.failed} falhas (${Math.round(data.elapsed / 1000)}s)`);
          break;
        case 'fatal':
          console.log();
          log('💀', `FATAL: ${data.message}`);
          break;
      }
    } catch {
      /* ignore parse errors */
    }
  }
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
