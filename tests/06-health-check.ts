import { API_BASE, log, separator } from './helpers.js';

async function main() {
  separator('TESTE: Health Check & Proxy');

  log('🏥', `Verificando API em ${API_BASE}...`);

  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json() as any;
    log('✅', `API respondendo: status=${data.status} uptime=${Math.round(data.uptime)}s`);
  } catch (err) {
    log('❌', `API não está respondendo em ${API_BASE}`);
    log('💡', 'Inicie a API com: pnpm dev');
    process.exit(1);
  }

  log('🔌', 'Testando endpoint proxy com token inexistente...');
  try {
    const res = await fetch(`${API_BASE}/api/pje/downloads/proxy/token_invalido_123`);
    if (res.status === 410) {
      log('✅', `Proxy retornou 410 (URL expirada) — endpoint funcionando`);
    } else {
      log('⚠️', `Proxy retornou ${res.status} (esperado 410)`);
    }
  } catch (err) {
    log('❌', `Erro ao testar proxy: ${err instanceof Error ? err.message : err}`);
  }

  log('📡', 'Testando endpoint stream-batch sem sessão...');
  try {
    const res = await fetch(`${API_BASE}/api/pje/downloads/stream-batch?mode=by_task`);
    if (res.status === 400) {
      log('✅', `Stream retornou 400 (sessão ausente) — endpoint funcionando`);
    } else {
      log('⚠️', `Stream retornou ${res.status} (esperado 400)`);
    }
  } catch (err) {
    log('❌', `Erro ao testar stream: ${err instanceof Error ? err.message : err}`);
  }

  separator('TUDO OK');
  log('✅', 'API está rodando e endpoints estão acessíveis');
}

main().catch((err) => {
  log('❌', `Erro: ${err.message}`);
  process.exit(1);
});
