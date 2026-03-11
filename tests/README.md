# Scripts de Teste — PJE Download

Testes manuais para validar o fluxo de download de processos via terminal.

## Setup

```bash
cd scripts
cp .env.example .env
# Edite .env com suas credenciais PJE reais
```

A API precisa estar rodando (`pnpm dev` na raiz do projeto).

## Scripts disponíveis

| # | Script | O que faz |
|---|--------|-----------|
| 06 | `06-health-check.ts` | Verifica se a API está rodando e endpoints respondem |
| 01 | `01-login.ts` | Faz login no PJE, mostra perfis disponíveis |
| 02 | `02-submit-2fa.ts` | Envia código 2FA (se login exigir) |
| 03 | `03-select-profile.ts` | Seleciona perfil e lista tarefas/etiquetas |
| 04 | `04-stream-batch.ts` | Conecta ao SSE e mostra URLs extraídas em tempo real |
| 05 | `05-full-flow.ts` | Fluxo completo automatizado (login → perfil → stream) |

## Uso

```bash
# 1. Verificar se API está no ar
npx tsx scripts/06-health-check.ts

# 2. Login (usa CPF/senha do .env)
npx tsx scripts/01-login.ts

# 3. Se precisar de 2FA
npx tsx scripts/02-submit-2fa.ts 123456 pje_1773155312086_abc123

# 4. Selecionar perfil (sessionId vem do login)
npx tsx scripts/03-select-profile.ts pje_1773155312086_abc123

# 5. Testar stream por tarefa
npx tsx scripts/04-stream-batch.ts pje_1773155312086_abc123 by_task "Minutar Sentença"

# 6. Testar stream por etiqueta
npx tsx scripts/04-stream-batch.ts pje_1773155312086_abc123 by_tag "" 42

# 7. Fluxo completo automático (pega primeira tarefa com processos)
npx tsx scripts/05-full-flow.ts

# 8. Fluxo completo limitando a 3 processos
npx tsx scripts/05-full-flow.ts 3

# 9. Fluxo completo com tarefa específica
npx tsx scripts/05-full-flow.ts 10 "Minutar Sentença"
```

## O que cada script valida

**01-login**: Autenticação SSO funciona, cookies são persistidos, perfis são retornados.

**03-select-profile**: Troca de contexto JSF funciona, tarefas e etiquetas são carregadas corretamente.

**04-stream-batch**: Conexão SSE estabelece, eventos chegam na ordem correta (auth → listing → progress → url/queued/error → done), URLs S3 são extraídas sem salvar nada em disco.

**05-full-flow**: Encadeia tudo automaticamente. Útil para validar o sistema de ponta a ponta após mudanças no código.

**06-health-check**: Smoke test rápido para verificar se a API e os endpoints novos (stream-batch, proxy) estão registrados.
