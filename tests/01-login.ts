import {
  API_BASE, PJE_CPF, PJE_PASSWORD,
  validateCredentials, apiPost, log, separator,
} from './helpers.js';

interface LoginResult {
  needs2FA: boolean;
  sessionId?: string;
  user?: { idUsuario: number; nomeUsuario: string; login: string };
  profiles?: Array<{ indice: number; nome: string; orgao: string; favorito: boolean }>;
}

async function main() {
  separator('TESTE: Login PJE');
  validateCredentials();

  const cpfMasked = `***${PJE_CPF.slice(-4)}`;
  log('🔐', `Fazendo login com CPF ${cpfMasked}...`);

  const start = Date.now();

  const result = await apiPost<LoginResult>('/api/pje/downloads/auth/login', {
    cpf: PJE_CPF,
    password: PJE_PASSWORD,
  });

  const elapsed = Date.now() - start;

  if (result.needs2FA) {
    log('📱', `2FA necessário (${elapsed}ms)`);
    log('📱', `sessionId: ${result.sessionId}`);
    log('💡', 'Execute: npx tsx scripts/02-submit-2fa.ts <código> <sessionId>');
    return;
  }

  if (!result.user) {
    log('❌', 'Login falhou: nenhum usuário retornado');
    process.exit(1);
  }

  log('✅', `Login OK em ${elapsed}ms`);
  log('👤', `Usuário: ${result.user.nomeUsuario}`);
  log('🔑', `sessionId: ${result.sessionId}`);

  if (result.profiles && result.profiles.length > 0) {
    log('📋', `${result.profiles.length} perfil(is) disponível(is):`);
    for (const p of result.profiles) {
      const star = p.favorito ? '⭐' : '  ';
      console.log(`   ${star} [${p.indice}] ${p.nome}`);
    }
  }

  separator('PRÓXIMOS PASSOS');
  console.log(`  1. Selecionar perfil:`);
  console.log(`     npx tsx scripts/03-select-profile.ts ${result.sessionId}`);
  console.log();
  console.log(`  2. Ou rodar fluxo completo:`);
  console.log(`     npx tsx scripts/05-full-flow.ts`);
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
