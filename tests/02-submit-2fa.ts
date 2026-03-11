import { apiPost, log, separator } from './helpers.js';

interface TwoFAResult {
  needs2FA: boolean;
  sessionId?: string;
  user?: { idUsuario: number; nomeUsuario: string };
  profiles?: Array<{ indice: number; nome: string; orgao: string; favorito: boolean }>;
}

async function main() {
  const code = process.argv[2];
  const sessionId = process.argv[3];

  if (!code || !sessionId) {
    console.log('Uso: npx tsx scripts/02-submit-2fa.ts <código_6_digitos> <sessionId>');
    console.log('Exemplo: npx tsx scripts/02-submit-2fa.ts 123456 pje_1773155312086_abc123');
    process.exit(1);
  }

  separator('TESTE: Submit 2FA');
  log('📱', `Enviando código ${code} para sessão ${sessionId.slice(0, 20)}...`);

  const result = await apiPost<TwoFAResult>('/api/pje/downloads/auth/2fa', {
    sessionId,
    code,
  });

  if (result.needs2FA) {
    log('⚠️', 'Código inválido ou expirado. Tente novamente.');
    process.exit(1);
  }

  if (!result.user) {
    log('❌', '2FA falhou: nenhum usuário retornado');
    process.exit(1);
  }

  log('✅', `2FA verificado: ${result.user.nomeUsuario}`);
  log('🔑', `sessionId: ${result.sessionId}`);

  if (result.profiles && result.profiles.length > 0) {
    log('📋', `${result.profiles.length} perfil(is):`);
    for (const p of result.profiles) {
      const star = p.favorito ? '⭐' : '  ';
      console.log(`   ${star} [${p.indice}] ${p.nome}`);
    }
  }

  separator('PRÓXIMO');
  console.log(`  npx tsx scripts/03-select-profile.ts ${result.sessionId}`);
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
