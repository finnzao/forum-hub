import { PJE_PROFILE_INDEX, apiPost, log, separator } from './helpers.js';

interface ProfileResult {
  tasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  favoriteTasks: Array<{ id: number; nome: string; quantidadePendente: number }>;
  tags: Array<{ id: number; nomeTag: string; nomeTagCompleto: string; favorita: boolean }>;
}

async function main() {
  const sessionId = process.argv[2];
  const profileIndex = process.argv[3] !== undefined
    ? parseInt(process.argv[3], 10)
    : PJE_PROFILE_INDEX;

  if (!sessionId) {
    console.log('Uso: npx tsx scripts/03-select-profile.ts <sessionId> [profileIndex]');
    console.log('Exemplo: npx tsx scripts/03-select-profile.ts pje_1773155312086_abc123 -1');
    process.exit(1);
  }

  separator('TESTE: Selecionar Perfil');
  log('👤', `Selecionando perfil #${profileIndex} na sessão ${sessionId.slice(0, 20)}...`);

  const start = Date.now();

  const result = await apiPost<ProfileResult>('/api/pje/downloads/auth/profile', {
    sessionId,
    profileIndex,
  });

  const elapsed = Date.now() - start;
  log('✅', `Perfil selecionado em ${elapsed}ms`);

  if (result.tasks.length > 0) {
    log('📋', `${result.tasks.length} tarefa(s):`);
    const sorted = [...result.tasks].sort((a, b) => b.quantidadePendente - a.quantidadePendente);
    for (const t of sorted.slice(0, 15)) {
      console.log(`   [${String(t.quantidadePendente).padStart(4)}] ${t.nome}`);
    }
    if (sorted.length > 15) {
      console.log(`   ... e mais ${sorted.length - 15} tarefa(s)`);
    }
  }

  if (result.favoriteTasks.length > 0) {
    log('⭐', `${result.favoriteTasks.length} tarefa(s) favorita(s):`);
    for (const t of result.favoriteTasks) {
      console.log(`   [${String(t.quantidadePendente).padStart(4)}] ${t.nome}`);
    }
  }

  if (result.tags.length > 0) {
    log('🏷️', `${result.tags.length} etiqueta(s):`);
    for (const tag of result.tags.slice(0, 10)) {
      const star = tag.favorita ? '⭐' : '  ';
      console.log(`   ${star} [${tag.id}] ${tag.nomeTagCompleto || tag.nomeTag}`);
    }
    if (result.tags.length > 10) {
      console.log(`   ... e mais ${result.tags.length - 10} etiqueta(s)`);
    }
  }

  separator('PRÓXIMO');
  console.log(`  Testar stream por tarefa:`);
  console.log(`     npx tsx scripts/04-stream-batch.ts ${sessionId} by_task "Nome da Tarefa"`);
  console.log();
  console.log(`  Testar stream por etiqueta:`);
  console.log(`     npx tsx scripts/04-stream-batch.ts ${sessionId} by_tag "" <tagId>`);
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
