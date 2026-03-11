import { API_BASE, log, separator } from './helpers.js';

async function main() {
  const sessionId = process.argv[2];
  const mode = process.argv[3] || 'by_task';
  const taskName = process.argv[4] || '';
  const tagId = process.argv[5] || '';

  if (!sessionId) {
    console.log('Uso: npx tsx scripts/04-stream-batch.ts <sessionId> <mode> [taskName] [tagId]');
    console.log();
    console.log('Exemplos:');
    console.log('  npx tsx scripts/04-stream-batch.ts pje_123 by_task "Minutar Sentença"');
    console.log('  npx tsx scripts/04-stream-batch.ts pje_123 by_tag "" 42');
    process.exit(1);
  }

  separator('TESTE: Stream Batch (SSE)');
  log('📡', `Conectando ao SSE... mode=${mode} task="${taskName}" tag=${tagId || '-'}`);

  const url = new URL(`${API_BASE}/api/pje/downloads/stream-batch`);
  url.searchParams.set('sessionId', sessionId);
  url.searchParams.set('mode', mode);
  if (taskName) url.searchParams.set('taskName', taskName);
  if (tagId) url.searchParams.set('tagId', tagId);

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'text/event-stream',
      'x-user': JSON.stringify({ id: 1, name: 'Test', role: 'magistrado' }),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    log('❌', `HTTP ${res.status}: ${body}`);
    process.exit(1);
  }

  if (!res.body) {
    log('❌', 'Response sem body');
    process.exit(1);
  }

  log('✅', 'Conectado ao SSE, aguardando eventos...\n');

  const decoder = new TextDecoder();
  let buffer = '';
  let urlCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  const reader = res.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    let currentData = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6);
      } else if (line === '' && currentEvent && currentData) {
        handleEvent(currentEvent, currentData);
        currentEvent = '';
        currentData = '';
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  separator('RESULTADO');
  log('📊', `URLs extraídas: ${urlCount}`);
  log('❌', `Erros: ${errorCount}`);
  log('⏱️', `Tempo total: ${elapsed}s`);

  function handleEvent(event: string, rawData: string) {
    try {
      const data = JSON.parse(rawData);

      switch (event) {
        case 'auth':
          log('🔐', `Auth: ${data.status} (localizacao=${data.user})`);
          break;

        case 'listing':
          log('📋', `${data.total} processos encontrados`);
          break;

        case 'progress':
          process.stdout.write(`\r   ⏳ [${data.index}/${data.total}] ${data.processNumber}`);
          break;

        case 'url':
          urlCount++;
          console.log();
          log('🔗', `${data.processNumber} → ${data.method}`);
          console.log(`      URL: ${data.downloadUrl.slice(0, 80)}...`);
          if (data.proxyUrl) {
            console.log(`      Proxy: ${data.proxyUrl}`);
          }
          if (data.fileSize) {
            console.log(`      Tamanho: ${(data.fileSize / 1024 / 1024).toFixed(1)} MB`);
          }
          break;

        case 'queued':
          console.log();
          log('⏳', `${data.processNumber}: ${data.message}`);
          break;

        case 'error':
          errorCount++;
          console.log();
          log('❌', `${data.processNumber || '?'}: ${data.message} [${data.code}]`);
          break;

        case 'done':
          console.log();
          log('🏁', `Servidor concluiu: ${data.success} ok, ${data.failed} falhas (${Math.round(data.elapsed / 1000)}s)`);
          break;

        case 'fatal':
          console.log();
          log('💀', `FATAL: ${data.message}`);
          break;

        default:
          console.log();
          log('❓', `Evento desconhecido: ${event}`, data);
      }
    } catch {
      console.log(`   [RAW] ${event}: ${rawData.slice(0, 200)}`);
    }
  }
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
