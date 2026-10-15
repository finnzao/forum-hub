# Arquitetura do Fórum Hub

> Documento de trabalho. Registra decisões, modelo de domínio e plano de evolução do sistema de
> controle de trabalho do cartório. Atualizar a cada decisão nova (seção 16).
> Criado em 15/10/2026.

---

## Sumário

1. [Objetivo e público](#1--objetivo-e-público)
2. [Dois sistemas, dois papéis](#2--dois-sistemas-dois-papéis)
3. [Stack e estrutura do repositório](#3--stack-e-estrutura-do-repositório)
4. [Conceitos de domínio](#4--conceitos-de-domínio)
5. [Perfil do PJE e contexto ativo](#5--perfil-do-pje-e-contexto-ativo)
6. [Filtro de dígito](#6--filtro-de-dígito)
7. [Captura e snapshot](#7--captura-e-snapshot)
8. [Regra central: não reanalisar](#8--regra-central-não-reanalisar)
9. [Distribuição e priorização](#9--distribuição-e-priorização)
10. [Fluxos por perfil](#10--fluxos-por-perfil)
11. [Modelo de dados](#11--modelo-de-dados)
12. [Contrato entre os sistemas](#12--contrato-entre-os-sistemas)
13. [API do Fórum Hub](#13--api-do-fórum-hub)
14. [Estado atual do código](#14--estado-atual-do-código)
15. [Fases de implementação](#15--fases-de-implementação)
16. [Decisões e pontos em aberto](#16--decisões-e-pontos-em-aberto)

---

## 1 · Objetivo e público

O Fórum Hub controla o trabalho feito pelos servidores de uma unidade judiciária sobre o acervo
de processos do PJE/TJBA. Dois resultados esperados:

- **Visibilidade**: o chefe de cartório sabe o que cada servidor fez, em qual processo, quando.
- **Sem retrabalho**: um processo analisado não volta para análise enquanto nada mudou nele.

**Público.** Servidores com conhecimento básico de informática, acostumados ao Google Planilhas.
Isso orienta a interface: tabelas, poucos conceitos, uma ação por tarefa, número de processo
nunca digitado à mão.

**Perfis do sistema.**

| Perfil | O que faz |
| --- | --- |
| Servidor | Vê os processos do seu dígito e das suas listas, registra o que fez, controla lembretes |
| Chefe de cartório | Dispara capturas, configura a distribuição da unidade, acompanha a equipe, cria listas manuais |
| Magistrado | Fora do escopo desta fase (telas atuais são mock) |
| Administrador | Férias e inventário (módulos existentes, fora do escopo deste documento) |

## 2 · Dois sistemas, dois papéis

| Repositório | Papel | Estado |
| --- | --- | --- |
| `pje-services-web` | **Adaptador do PJE.** Login, 2FA, perfis, scraping das tarefas, planilhas, etiquetas. Sem banco. Frágil por natureza (muda a cada deploy do PJE). | Em produção (Render + Vercel) |
| `forum-hub` (este) | **Sistema de trabalho.** Banco de dados, usuários, acervo por unidade, distribuição, listas, histórico, lembretes. | Protótipo de telas com dados fictícios |

Regra: **o scraper fica em um lugar só.** O `forum-hub` não fala com o PJE diretamente; consome o
`pje-services-web` por um contrato JSON versionado (seção 12). A cópia antiga do módulo
`pje-download` que existe em `apps/api` e `apps/worker` será removida (seção 14).

O que o `forum-hub` reaproveita do `pje-services-web` sem reescrever:

- **Listagem de tarefas** (`recuperarProcessosTarefaPendenteComCriterios`): já entrega polos,
  classe, assunto, tarefa, data de chegada, último movimento, etiquetas, prioridade, sigilo.
- **Motor de priorização** `digito-core` (peso 0–100, P1–P3, filas de espera, tarefas
  ignoradas), já coberto por testes. Vira pacote compartilhado.
- **Serviço de etiquetas**, único ponto que escreve no PJE. Usado na fase 3 para marcar no PJE
  o servidor responsável.
- **Planilha de informações completas** (`.xlsx`): é um snapshot pronto e serve como fonte de
  dados da fase 1, pelo wizard de importação que já existe aqui.

## 3 · Stack e estrutura do repositório

Monorepo `pnpm` (`pnpm@10.28.2`, Node 20+).

| Pacote | Tecnologias | Papel |
| --- | --- | --- |
| `apps/web` | Next.js 16.1 (App Router), React 19.2, Tailwind, lucide-react, xlsx | Interface. Hoje concentra toda a lógica (localStorage + mocks) |
| `apps/api` | Fastify 5, BullMQ, ioredis, ExcelJS, Vitest | API. Hoje só tem a cópia do pje-download |
| `apps/worker` | BullMQ, ioredis | Jobs assíncronos. Hoje só o download |
| `packages/shared` | TypeScript, zod | Tipos e schemas compartilhados |

**Alvo.**

- `apps/api`: Fastify + **PostgreSQL** via **Prisma** (ou Drizzle, decidir na fase 1). Módulos
  por domínio: `auth`, `unidades`, `processos`, `capturas`, `distribuicao`, `listas`,
  `historico`, `lembretes`.
- `apps/worker`: job de **captura** (consome o adaptador, faz upsert do snapshot, roda a regra
  de novidade) e futuros jobs de etiquetagem. Redis continua como fila.
- `packages/shared`: schemas zod das entidades, contrato `ProcessoCapturado`, funções puras
  (parse do CNJ, filtro de dígito, `digito-core` extraído).
- `apps/web`: deixa de guardar estado. Consome a API. Mantém a filtragem por dígito no cliente
  (seção 6).

## 4 · Conceitos de domínio

Três camadas com donos diferentes. **Nunca misturar.**

```
┌───────────────────────────────────────────────────────────────────┐
│ IDENTIDADE  (nunca muda)                                           │
│   Processo = número CNJ (só dígitos) dentro de uma Unidade          │
├───────────────────────────────────────────────────────────────────┤
│ ESTADO OBSERVADO  (dono: captura / scraper; humano não edita)      │
│   tarefa atual, último movimento, etiquetas, polos, classe,        │
│   assunto, prioridade, sigilo, capturadoEm, capturaId              │
│   + log de mudanças dos campos que importam                        │
├───────────────────────────────────────────────────────────────────┤
│ TRABALHO HUMANO  (dono: pessoas; captura não toca; append-only)    │
│   atribuição, item de lista, registro de trabalho, observação,     │
│   lembrete                                                         │
└───────────────────────────────────────────────────────────────────┘
```

| Conceito | Definição |
| --- | --- |
| **Unidade** | Órgão julgador (ex.: Vara Criminal de Rio Real). Dona do acervo. Identificada pelo id que o PJE devolve no login, não pelo nome |
| **Perfil PJE** | Unidade + papel + cargo (ex.: "Vara Criminal de Rio Real / Direção de Secretaria / Diretor de Secretaria"). Credencial de captura e contexto ativo na sessão |
| **Usuário** | Pessoa no Fórum Hub. Tem um ou mais perfis PJE vinculados. Por unidade, tem um perfil de sistema (servidor, chefe) e uma configuração de dígito |
| **Processo** | Identidade + estado observado. Único por (unidade, CNJ) |
| **Captura** | Uma execução do scraper: quem, quando, por qual perfil, quais tarefas, contagens, status |
| **Mudança observada** | Diferença entre duas capturas em um campo relevante de um processo |
| **Lista de trabalho** | Conjunto de processos entregue a um servidor com período. Hoje é a única forma de atribuição; passa a ser a **exceção manual** (seção 9) |
| **Item de lista** | Processo dentro de uma lista: pendente → em andamento → concluído, com observação |
| **Registro de trabalho** | O que o servidor fez em um processo: data, tipo de movimentação, quantidade de atos, nota. Nasce ao concluir um item ou avulso |
| **Lembrete** | Prazo ligado a um processo e a um usuário |

**Um só conceito de trabalho.** As telas atuais têm Tarefas, Lista de Trabalho, Histórico e
Lembretes como módulos separados. Passam a ser uma coisa só: *o processo na minha fila*, com o
que já foi feito nele (registros) e os prazos dele (lembretes). "Tarefas" atribuídas pelo
magistrado saem do escopo desta fase.

## 5 · Perfil do PJE e contexto ativo

- No PJE, um usuário pode ter vários perfis. Trocar o perfil troca as tarefas visíveis.
- No login do Fórum Hub, o usuário vincula os perfis PJE que possui (lista obtida do adaptador,
  `GET /profiles`). Escolhe um como **perfil ativo**. Toda tela e toda consulta à API carregam a
  unidade desse perfil.
- Trocar de perfil ativo troca a unidade, o acervo, a configuração de dígito e as listas.
- O acervo pertence à **unidade**, não ao perfil. Dois usuários com papéis diferentes na mesma
  vara enxergam o mesmo acervo, e a regra "já analisado" funciona entre eles. A captura registra
  por qual perfil foi feita, para auditoria.

> Ponto a confirmar na prática: se dois papéis da mesma vara enxergarem acervos realmente
> diferentes no PJE, o acervo passa a ser por perfil, ainda agrupado por unidade.

## 6 · Filtro de dígito

Cada servidor configura **qual dígito trabalha**. O número CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO` oferece
quatro eixos de separação:

| Eixo | Origem no CNJ | Observação |
| --- | --- | --- |
| 1º dígito verificador | primeiro `D` | |
| 2º dígito verificador | segundo `D` | |
| Ano | `AAAA` | |
| Último nº da sequência | último `N` antes do hífen | É o que o painel do PJE chama de `digitoFinalNumeroProcesso` e o que a planilha administrativa usa. **Não confundir com o dígito verificador** |

Regras:

- A configuração é um conjunto de valores por eixo. **Dentro do eixo: OU. Entre eixos: E.**
  "Pares" e "Ímpares" são atalhos da tela que expandem para a lista de valores.
- **Onde fica:** no registro do usuário, por unidade (`usuario_unidade.filtro_digito`, JSON).
  Não existe tabela de dígito nem coluna de dígito no processo.
- **Onde é aplicada:** no **frontend**. A API entrega o acervo da unidade; o cliente deriva os
  quatro valores do número CNJ de cada processo e filtra. A função de derivação e a de filtro
  moram em `packages/shared` (puras, testadas), para o chefe reutilizá-las na tela de cobertura.
- "Meus processos" = processos que casam com o meu filtro **∪** processos em listas manuais
  atribuídas a mim.
- A tela do servidor deixa explícito qual eixo está em uso, porque escolher o eixo errado mostra o
  acervo de outra pessoa.

**Cobertura (tela do chefe).** Grade com os valores de cada eixo e quem cobre cada um, calculada
no cliente a partir das configurações de todos os usuários da unidade. Aponta valores sem
ninguém e valores com mais de uma pessoa. O servidor ajusta a própria visão; a cobertura oficial
é responsabilidade do chefe.

## 7 · Captura e snapshot

A sessão do PJE não se mantém (TTL de 30 min deslizante, 4 h por CPF, 2FA). O sistema é desenhado
para **dados com idade**, não para dados ao vivo.

**Ciclo de uma captura.**

1. Um usuário logado no PJE (perfil ativo com sessão válida no adaptador) dispara a captura, ou o
   agendador dispara usando a sessão vinculada.
2. O worker chama o adaptador, recebe a listagem em JSON paginado (seção 12).
3. Para cada processo: upsert do **estado observado** por (unidade, CNJ). Campos que importam são
   comparados com o valor anterior; diferença vira uma **mudança observada**.
4. Processos da unidade que **não apareceram** nesta captura recebem `ausente_desde = agora`.
   Ausência em captura completa significa que saiu do acervo (arquivado, redistribuído).
5. A captura é fechada com contagens: lidos, novos, alterados, ausentes, erros.
6. Roda a regra da seção 8.

**Campos que entram no log de mudanças:** tarefa atual, data do último movimento, descrição do
último movimento, etiquetas, prioridade. Os demais só são sobrescritos.

**Idade na tela.** Toda listagem mostra "dados de HH:MM de DD/MM" e um aviso quando a última
captura da unidade tem mais de 24 h.

**Fase 1 (sem adaptador):** a fonte é a planilha `.xlsx` de informações completas gerada pelo
`pje-services-web`, importada pelo wizard existente. Uma importação é uma captura com
`fonte = planilha`. O mesmo upsert e a mesma regra se aplicam.

## 8 · Regra central: não reanalisar

Ao concluir um item, o sistema grava junto o último movimento que o processo tinha naquele momento
(`ultimo_movimento_na_analise`). Na captura seguinte:

| Situação | Ação |
| --- | --- |
| Último movimento **igual** ao da análise | Nada aconteceu. Processo fica fora da próxima distribuição. Na tela: "analisado em DD/MM por Fulano, sem novidade" |
| Último movimento **mais recente** | Candidato de novo, já mostrando a observação anterior. Marcado "movimentou após análise" |
| Processo **ausente** na captura | Saiu do acervo. Itens abertos são fechados com motivo `saiu_do_acervo` |
| Processo **novo** na unidade | Entra como candidato normal |

A regra é uma função pura em `packages/shared`, executada pelo worker ao fim de cada captura e
reutilizável no cliente para exibir o rótulo.

## 9 · Distribuição e priorização

**Distribuição padrão: por dígito.** É a prática real da unidade. O servidor vê o seu dígito
(seção 6). Não há "distribuição" a executar: a fila de cada um é derivada.

**Distribuição manual: listas de trabalho.** Exceção, usada para mutirão, férias, reforço ou
processos fora de dígito. O chefe monta uma lista para um servidor com período e processos
escolhidos. Toda lista registra `criado_por`, motivo e data.

**Priorização.** A ordem de trabalho dentro da fila (do dígito ou da lista) vem do motor
`digito-core` extraído do `pje-services-web`: peso 0–100 por metas, assunto, tempo parado,
antiguidade; prioridade P1 (parado > 30 dias) > P2 (meta/GAB) > P3; processos em filas de espera
ficam em aba própria. O motor atual de `lib/distribuicao/motor.ts` (ordenação por 3 critérios e
fatia sequencial por servidor) é descartado.

**Ajustes nas listas manuais em relação ao protótipo atual:**

- Limite de processos por lista, em vez de distribuir tudo que existe.
- Rodízio alternado entre servidores (um processo por vez na ordem de prioridade), em vez de
  fatia sequencial, para equilibrar dificuldade e não só quantidade.
- Aviso de quantos processos ficaram sem servidor.
- Revisão em tabela com coluna "Servidor" editável, em vez de acordeão com setas.
- Ao confirmar, o processo é marcado como atribuído e não volta em outra lista enquanto o item
  estiver aberto.

## 10 · Fluxos por perfil

**Servidor.**

1. Entra, escolhe o perfil PJE ativo (ou mantém o último).
2. Vê "Meus processos": dígito + listas, ordenados por prioridade, com idade dos dados, busca por
   número, filtros de status e as colunas do estado observado (partes, tarefa, situação, dias
   parados, observação anterior).
3. Abre um processo: estado observado, registros anteriores de qualquer servidor, lembretes.
4. **Concluir é uma ação só:** escolhe tipo de movimentação, quantidade de atos, nota, lembrete
   opcional. Isso fecha o item e cria o registro de trabalho. Número do processo nunca é digitado.
5. Pode reabrir um item concluído por engano. Pode registrar trabalho avulso em processo que não
   está na fila (aí sim digita ou cola o número, com validação CNJ).
6. Registro em lote (vários tipos de movimentação no mesmo processo) continua existindo.

**Chefe de cartório.**

1. Mesma entrada e perfil ativo.
2. Dispara captura (ou importa planilha na fase 1); vê status e contagens.
3. Cobertura de dígito da unidade (seção 6).
4. Acompanhamento: por servidor, itens abertos, concluídos no período, parados, registros do dia;
   por processo, quem fez o quê.
5. Lista manual: escolhe servidor(es), limite, filtros (tarefa, dias parados, meta), revisa em
   tabela, confirma.
6. Exporta qualquer tabela em `.xlsx` (compatibilidade com a planilha antiga).

## 11 · Modelo de dados

PostgreSQL. Nomes em português, snake_case. Chaves `uuid`. `criado_em`/`atualizado_em` em tudo.

```
unidade
  id, id_pje (único), nome, ativa

usuario
  id, nome, email, cpf (único), senha_hash, ativo

perfil_pje
  id, unidade_id, papel, cargo, nome_completo_pje, indice_pje
  único (unidade_id, papel, cargo)

usuario_perfil_pje
  usuario_id, perfil_pje_id, ativo_em (null = não é o ativo)

usuario_unidade
  usuario_id, unidade_id, perfil_sistema (servidor|chefe|magistrado),
  filtro_digito jsonb  -- {dv1:[..], dv2:[..], ano:[..], ultimo_seq:[..]}; eixo ausente = sem filtro

processo
  id, unidade_id, numero_cnj (só dígitos), numero_formatado
  -- estado observado (dono: captura)
  tarefa_atual, data_chegada_tarefa, ultimo_movimento_em, ultimo_movimento_desc,
  etiquetas text[], classe, assunto, orgao_julgador, polo_ativo, polo_passivo,
  prioridade, sigiloso, nivel_acesso, dias_parados (derivado na captura),
  capturado_em, captura_id, ausente_desde
  único (unidade_id, numero_cnj)

captura
  id, unidade_id, perfil_pje_id, disparada_por (usuario_id), fonte (adaptador|planilha),
  iniciada_em, concluida_em, status (executando|concluida|falhou|cancelada),
  total_lidos, novos, alterados, ausentes, erros, mensagem, parametros jsonb

mudanca_observada
  id, processo_id, captura_id, campo, valor_anterior, valor_novo, observado_em

lista_trabalho
  id, unidade_id, servidor_id (usuario_id), titulo, motivo, periodo, data_inicio, data_fim,
  status (ativa|concluida|cancelada), criado_por, concluida_em

item_lista
  id, lista_id, processo_id, status (pendente|em_andamento|concluido|saiu_do_acervo),
  observacao, ultimo_movimento_na_analise, iniciado_em, concluido_em, concluido_por
  único (lista_id, processo_id)

analise_processo        -- última análise por processo, independente de lista (fluxo por dígito)
  processo_id (único), usuario_id, analisado_em, ultimo_movimento_na_analise,
  situacao (sem_novidade|movimentou|pendente), observacao

registro_trabalho
  id, unidade_id, processo_id, usuario_id, data, tipo_movimentacao, qtd_atos, nota,
  origem (item_lista|avulso|lote), item_lista_id (nullable)

lembrete
  id, processo_id, usuario_id, data, texto, concluido, registro_trabalho_id (nullable)
```

Notas:

- `analise_processo` é o que faz a regra da seção 8 funcionar para o fluxo por dígito, onde não
  existe lista. Concluir pelo dígito grava aqui; concluir por lista grava no item **e** aqui.
- Sem colunas de dígito no processo: a derivação é feita no cliente (seção 6).
- `registro_trabalho` é append-only. Correção = novo registro com referência ao anterior.
- Os tipos de movimentação ficam como enum no código (`movimentacoes.ts` já existe).

## 12 · Contrato entre os sistemas

Pacote `packages/shared` publica o schema zod `ProcessoCapturado` (versão no campo
`schemaVersion`). O `pje-services-web` passa a oferecer, no mesmo contrato de job das planilhas:

| Rota (no adaptador) | Descrição |
| --- | --- |
| `POST /api/pje/capturas` | `{pjeSessionId, pjeProfileIndex, tarefasIgnoradas[]}` → 202 `{jobId}` |
| `GET /api/pje/capturas/:jobId/progress` | status, progresso, totais |
| `GET /api/pje/capturas/:jobId/processos?page&size` | páginas de `ProcessoCapturado[]` |
| `DELETE /api/pje/capturas/:jobId` | cancela |

`ProcessoCapturado` (essência): `numeroCnj`, `idProcessoPje`, `tarefaAtual`, `outrasTarefas[]`,
`dataChegadaTarefa`, `ultimoMovimentoEm`, `ultimoMovimentoDesc`, `etiquetas[]`, `classe`,
`assunto`, `orgaoJulgador`, `poloAtivo`, `poloPassivo`, `prioridade`, `sigiloso`, `nivelAcesso`,
`capturadoEm`, `flags[]` (ex.: `SEM_ULTIMO_MOVIMENTO`, `NUMERO_MALFORMADO`).

O adaptador continua sem banco. O Fórum Hub guarda o `jobId` na captura para rastreio.

Autenticação entre os dois: token de serviço em header, por ambiente. O header `x-user` fixo do
adaptador é substituído por isso.

## 13 · API do Fórum Hub

Todas as rotas abaixo de `/api`, autenticadas por JWT do usuário, escopadas pela unidade do perfil
ativo (claim `unidadeId`).

| Módulo | Rotas principais |
| --- | --- |
| auth | `POST /auth/login`, `POST /auth/perfis-pje/vincular`, `PUT /auth/perfil-ativo` |
| usuarios | `GET /usuarios` (unidade), `PUT /usuarios/me/filtro-digito` |
| processos | `GET /processos` (acervo da unidade, filtros por tarefa/dias/situação de análise), `GET /processos/:id` (estado + registros + lembretes + mudanças) |
| capturas | `POST /capturas` (dispara job), `POST /capturas/planilha` (upload xlsx, fase 1), `GET /capturas`, `GET /capturas/:id` |
| analises | `POST /processos/:id/concluir` (cria registro + análise + fecha item se houver), `POST /processos/:id/reabrir` |
| listas | `POST /listas` (com preview), `GET /listas`, `GET /listas/:id`, `PATCH /listas/:id/itens/:itemId`, `POST /listas/:id/cancelar` |
| historico | `GET /registros` (filtros por servidor, processo, período, tipo), `POST /registros` (avulso/lote), export xlsx |
| lembretes | CRUD simples |
| acompanhamento | `GET /acompanhamento/equipe`, `GET /acompanhamento/cobertura-digito` |

## 14 · Estado atual do código

Tudo que envolve servidor e chefe roda só no navegador, com `localStorage` e mocks. O que existe e
o destino de cada parte:

| Existe hoje | Destino |
| --- | --- |
| `apps/web/src/app/servidor/meus-processos` (tabela, filtro de dígito no perfil, painel lateral, concluir-com-registro, reabrir) | **Feito em 15/10/2026** como protótipo sobre mock determinístico (`lib/mock/acervo.ts`); `lista-trabalho` só reexporta. Falta ligar à API |
| `componentes/tabelas/TabelaProcessos`, `componentes/processos/*`, `lib/cnj.ts` | **Feitos em 15/10/2026**. `lib/cnj.ts` (parse CNJ, filtro de dígito, cobertura) migra para `packages/shared` na fase 1 |
| `chefe-cartorio/acervo` e `chefe-cartorio/cobertura` | **Feitos em 15/10/2026** sobre o mesmo mock: acervo da unidade com responsável por dígito/lista e grade de cobertura por eixo |
| `apps/web/src/app/servidor/historico` (tabela, lote, lembretes, menu de contexto) | **Mantém** a interface; passa a ler/escrever na API; número de processo deixa de ser digitado no fluxo principal |
| `apps/web/src/app/servidor/historico/types/movimentacoes.ts` | **Mantém** como fonte única de tipos de movimentação; `tipos/historico.ts` (modelo paralelo) é removido |
| Wizard de importação (`componentes/importacao`, `hooks/useImportacao`, `lib/importacao`) | **Mantém**; vira `POST /capturas/planilha`. Hoje termina em `console.log` |
| `lib/distribuicao/motor.ts` + wizard de nova distribuição | **Substituídos** por dígito + `digito-core` + lista manual em tabela. A revisão já é tabela com coluna "Servidor" (15/10/2026); o motor e o wizard de ordem de recebimento ainda são os antigos |
| `lib/distribuicao/dados.ts` (localStorage) | **Removido**; vira API |
| Painéis `servidor/page.tsx` e `chefe-cartorio/page.tsx` | **Reescritos** com dados reais; hoje linkam para rotas inexistentes (`/tarefas`, `/lembretes`, `/historico` do chefe) e não linkam a lista de trabalho |
| `apps/api/src/modules/pje-download`, `apps/worker/src/processors/pje-download.*`, `packages/shared/src/types/pje-*` | **Removidos**; o adaptador é o `pje-services-web` |
| Módulos `administrador/ferias` e `administrador/inventario` | Fora do escopo; não mexer |

Defeitos conhecidos no protótipo que o redesenho elimina: processo nunca marcado como atribuído
(redistribuição a cada semana), duplicidade só dentro do mesmo arquivo, datas padrão calculadas
em UTC, sobras da distribuição por cota sem aviso, item concluído sem volta.

## 15 · Fases de implementação

**Fase 1 — banco e fluxo completo com planilha** (entrega valor sem tocar no scraper)

1. Postgres + ORM em `apps/api`; migrações; seed de uma unidade e usuários de teste.
2. Auth com JWT, perfis de sistema por unidade, vínculo manual de perfis PJE (sem adaptador ainda).
3. Módulos `processos`, `capturas/planilha`, `analises`, `historico`, `lembretes`.
4. Funções puras em `shared`: parse CNJ, filtro de dígito, regra de novidade.
5. Web: "Meus processos" por dígito, concluir-com-registro, histórico na API, configuração de
   dígito no perfil, cobertura para o chefe.
6. Remover o pje-download copiado e o motor de distribuição antigo.

**Fase 2 — captura pelo adaptador**

1. Rotas de captura no `pje-services-web` (contrato da seção 12) e `ProcessoCapturado` em `shared`.
2. Job de captura no `apps/worker`: upsert, mudanças, ausências, regra de novidade.
3. Vínculo real de perfis PJE no login (lista vinda do adaptador) e perfil ativo.
4. Extrair `digito-core` para pacote e usar na ordenação.
5. Listas manuais com limite, rodízio, tabela de revisão.

**Fase 3 — escrita no PJE e automação**

1. Etiqueta do servidor aplicada no PJE ao atribuir (serviço de etiquetas do adaptador).
2. Captura agendada por unidade com sessão vinculada.
3. Acompanhamento com indicadores de produtividade e exportações.

## 16 · Decisões e pontos em aberto

**Decididas**

- 15/10/2026 — Scraper só no `pje-services-web`; cópia em `forum-hub` será removida.
- 15/10/2026 — Três camadas (identidade / estado observado / trabalho humano); captura nunca
  sobrescreve trabalho humano; registros append-only.
- 15/10/2026 — Acervo vinculado ao perfil PJE, com a unidade como agrupador; perfil ativo troca
  o contexto inteiro.
- 15/10/2026 — Configuração de dígito fica **somente no perfil do usuário** (JSON por unidade);
  filtragem **no frontend**; sem tabela nem colunas de dígito no banco.
- 15/10/2026 — Distribuição padrão por dígito; listas manuais são exceção registrada.
- 15/10/2026 — Fase 1 usa a planilha do adaptador como fonte; API de captura só na fase 2.
- 15/10/2026 — Priorização reaproveita o `digito-core`; motor atual descartado.
- 15/10/2026 — Mock de acervo é **determinístico** (PRNG com semente, "agora" fixo em
  `AGORA_MOCK`) para não divergir entre servidor e cliente do Next. Nenhum mock novo usa
  `Math.random` nem `new Date()` em render.

**Em aberto**

- Prisma ou Drizzle (decidir no início da fase 1).
- Confirmar se perfis diferentes da mesma vara veem o mesmo acervo (seção 5).
- Tamanho do acervo por unidade: a filtragem no cliente pressupõe carregar o acervo inteiro da
  unidade. Até alguns milhares de processos é tranquilo; acima disso, paginar por tarefa ou
  revisar a decisão.
- Onde o `digito-core` passa a morar: pacote dentro deste monorepo consumido pelo adaptador, ou
  pacote publicado em registro privado.
- Repositórios: manter dois ou unificar o adaptador como `apps/pje-adapter` aqui. Decisão
  adiada até a fase 2 funcionar por HTTP.
- Tarefas do magistrado (hoje mock nos painéis): escopo e modelo.
