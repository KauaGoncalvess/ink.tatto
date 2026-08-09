# Ink House — plataforma para estúdio de tatuagem

Aplicação completa para um estúdio de tatuagem: site público editorial,
agendamento online com motor de disponibilidade real e painel administrativo.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
PostgreSQL · Prisma · Zod · autenticação própria (JWT + bcrypt)

---

## Começando

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# gere um segredo real para AUTH_SECRET:
openssl rand -base64 48

# 3. Banco (migrations + dados de demonstração)
npm run db:migrate
npm run db:seed

# 4. Imagens
npm run images:placeholders   # placeholders on-brand (já versionados)
npm run images:fetch          # opcional: baixa fotografias reais

# 5. Rodar
npm run dev
```

Site em `http://localhost:3000` · painel em `http://localhost:3000/admin`.

**Acesso do seed** (troque antes de qualquer deploy público):

| Papel | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@inkhouse.studio` | `InkHouse@2026` |
| Artista | `marina-vasquez@inkhouse.studio` | `InkHouse@2026` |

Artistas veem agenda, clientes, galeria e depoimentos; serviços, horários e
configurações são restritos a administradores.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `start` | Build e execução de produção |
| `npm run verify` | typecheck + lint + testes + build |
| `npm run test` | Vitest: disponibilidade, schemas, sessão e autorização |
| `npm run test:concurrency` | Prova que reservas simultâneas não duplicam |
| `npm run e2e` | Percurso ponta a ponta em navegador real + capturas |
| `npm run a11y` | axe-core em 31 estados de tela (WCAG 2.1 AA) |
| `npm run perf` | Peso de JS/CSS por rota, cru e comprimido |
| `npm run db:migrate` / `db:seed` / `db:reset` / `db:studio` | Banco |
| `npm run images:placeholders` | Gera os placeholders on-brand |
| `npm run images:fetch` | Baixa fotografias reais para os mesmos caminhos |

`a11y`, `perf` e `e2e` precisam do servidor no ar (`npm run build && npm run start`).

---

## Como o agendamento funciona

O núcleo é `src/lib/availability.ts` — uma função **pura**: recebe os dados já
carregados e devolve os horários livres. Não acessa o banco, não lê
`process.env` e não usa o relógio do sistema (o "agora" é parâmetro). É por
isso que dá para testá-la de verdade.

Um horário só é oferecido quando passa por todas estas regras:

1. está dentro da janela de funcionamento do estúdio **∩** da grade semanal do artista;
2. não cai no intervalo/pausa do artista;
3. não intersecta folga, férias ou bloqueio manual (do artista ou do estúdio inteiro);
4. não sobrepõe outro agendamento ativo (cancelado libera; não comparecido não);
5. `duração + buffer` cabe inteiro na janela;
6. respeita a antecedência mínima configurada.

### Por que não há overbooking

Validar a disponibilidade antes de gravar não basta: entre "consultei a agenda"
e "gravei o agendamento" existe uma janela em que outra requisição pode reservar
o mesmo horário. Por isso a gravação acontece dentro de uma transação que toma
um **advisory lock** no artista (`pg_advisory_xact_lock`) e **revalida o
conflito lá dentro**, antes do insert.

`npm run test:concurrency` dispara oito reservas simultâneas para o mesmo
horário e confirma que exatamente uma vence.

### Fusos horários

No banco tudo é UTC. Toda conversão para o horário do estúdio passa por
`src/lib/datetime.ts`. Nenhum outro módulo deve usar `new Date(y, m, d)` para
lógica de agenda — isso usaria o fuso do servidor, que em produção é UTC.
Os testes rodam com `TZ=UTC` justamente para pegar esse tipo de regressão.

---

## Estrutura

```
prisma/            schema, migrations e seed (com dados de demonstração)
scripts/           imagens, E2E, acessibilidade, performance, concorrência
src/
  app/
    (site)/        rotas públicas
    (admin)/admin/ painel (protegido)
    (auth)/admin/  login (fora do layout protegido, senão haveria loop)
    api/           disponibilidade, upload, busca de cliente, export CSV
  components/
    ui/            primitivos (botão, campo, diálogo, menu, switch)
    site/          navbar, footer, hero, galeria, cards
    admin/         casca do painel e peças compartilhadas
  features/        booking · appointments · admin · auth · content
  lib/             availability · datetime · prisma · auth · storage · notifier
                   rate-limit · audit
  proxy.ts         CSP com nonce + corte de acesso a /admin (antes: middleware)
  config/          site.ts (marca) · images.ts (manifesto de imagens)
  schemas/         Zod compartilhado entre cliente e servidor
```

**Configuração da marca:** tudo que identifica o estúdio está em
`src/config/site.ts`. O que o dono precisa editar sem deploy vive em
`StudioSettings` no banco, editável em `/admin/configuracoes`.

---

## Imagens

Todo slot de imagem é declarado em `src/config/images.ts`. Nenhum componente
escreve um caminho literal. Há três formas de trocar a arte:

1. `npm run images:fetch` — baixa uma curadoria de fotos para os mesmos caminhos;
2. substituir os arquivos em `public/images/` mantendo os nomes;
3. editar o manifesto e apontar para outros caminhos.

Os placeholders versionados são gerados proceduralmente
(`scripts/generate-placeholders.ts`): composições escuras com grão, vinheta e
o fio vermelho da marca — pensados para o site parecer intencional antes de as
fotos reais chegarem.

> As fotografias não puderam ser baixadas no ambiente onde o projeto foi
> construído (a política de rede bloqueia os CDNs de banco de imagens). Rode
> `npm run images:fetch` na sua máquina para preenchê-las.

---

## Segurança

- Sessão em JWT HS256 (`jose`) num cookie `httpOnly` / `SameSite=Lax` / `Secure` em produção.
- Senhas com bcrypt custo 12. O login compara contra um hash falso quando o
  e-mail não existe, para o tempo de resposta não permitir enumerar contas.
- **Duas camadas de autorização:** o proxy (`src/proxy.ts`) barra a navegação em `/admin/*`,
  e cada Server Action revalida a sessão contra o banco — uma action pode ser
  invocada por POST direto, sem passar pela navegação. O papel vem do banco, não
  do token, então revogar acesso vale na hora.
- Zod valida toda entrada no servidor; a validação no cliente é só UX.
- Rate limiting em login, agendamento, upload e busca de cliente por telefone.
- Uploads: tipo verificado pela **assinatura binária**, não pelo `Content-Type`
  (que o cliente escolhe); nome gerado no servidor; 5 MB de limite.
- **CSP com nonce por requisição**, gerada em `src/proxy.ts` e combinada com
  `strict-dynamic` — os chunks do Next herdam a confiança do script inicial, e
  nenhum inline injetado executa. Sem `unsafe-inline` em `script-src`.
- Cabeçalhos de segurança em `next.config.ts`.
- **Log de auditoria** (`AuditLog`): quem criou, editou, cancelou ou excluiu o
  quê. Sobrevive à exclusão do usuário porque o nome é copiado no momento da ação.
- A busca pública de cliente por telefone devolve **só o primeiro nome**. Como o
  endpoint é público, devolver o cadastro completo transformaria a consulta numa
  varredura de base — e cliente bloqueado responde como inexistente.

A autorização é testada, não presumida: `src/features/admin/authorization.test.ts`
chama as Server Actions com sessões forjadas — sem sessão, com papel `ARTIST`,
com conta desativada, com usuário já removido e com um token que mente o papel —
e confirma que nada é gravado.

---

## Notificações

`src/lib/notifier.ts` grava as notificações no banco (alimentando o sino do
painel) e, quando há credenciais, envia e-mail de verdade pelo Resend: o cliente
recebe o comprovante com o número da reserva e o estúdio recebe o aviso.

Sem `RESEND_API_KEY` nada quebra — o adapter fica inerte e as notificações
seguem apenas no painel. É deliberado: um envio que falha em silêncio seria pior
que nenhum.

Cada agendamento também traz um botão "responder no WhatsApp" com a mensagem
pré-preenchida.

---

## Deploy

1. Provisione um PostgreSQL e aponte `DATABASE_URL`.
2. Defina `AUTH_SECRET` (`openssl rand -base64 48`) e `NEXT_PUBLIC_SITE_URL`.
3. `npm run db:deploy` para aplicar as migrations.
4. `npm run build && npm run start`.

Os três pontos abaixo têm padrão que funciona sozinho e uma variável de ambiente
que troca a implementação — nenhum exige mexer em código.

| Assunto | Padrão | Quando trocar | Como |
| --- | --- | --- | --- |
| Uploads | disco local (`public/uploads`) | sistema de arquivos efêmero (Vercel, Cloud Run) ou mais de uma instância | `STORAGE_DRIVER="s3"` + as variáveis `S3_*` |
| Rate limit | contagem em memória | mais de uma instância — cada processo contaria por si, multiplicando o limite | `UPSTASH_REDIS_REST_URL` + `_TOKEN` |
| E-mail | só notificação no painel | quiser confirmação por e-mail para o cliente | `RESEND_API_KEY` + `EMAIL_FROM` |

O driver S3 fala SigV4 direto por `fetch`, sem SDK da AWS — serve para S3, R2 e
Backblaze B2. Todos os detalhes estão em `.env.example`.

O build tolera banco indisponível: `generateStaticParams` e o sitemap caem para
renderização sob demanda em vez de quebrar o pipeline.

---

## Verificação

O que já foi executado e passa neste projeto:

- `npm run typecheck` · `npm run lint` · `npm run build` — sem erros nem avisos;
- **91 testes unitários**: motor de disponibilidade (sobreposição, pausa,
  bloqueio, fora de expediente, duração que não cabe, lead time, fuso), schemas
  Zod contra entrada maliciosa (path traversal, link no nome, data inexistente),
  token de sessão (assinatura forjada, `alg: none`, expirado, papel inventado) e
  autorização das Server Actions contra o banco real;
- teste de concorrência: 8 reservas simultâneas → 1 criada, 7 recusadas;
- E2E em navegador real: agendamento completo até o número da reserva, login,
  confirmação do agendamento no painel, varredura de todas as rotas, H1 único
  por página e ausência de scroll horizontal em 390px e 1440px;
- **acessibilidade: 31 estados de tela, zero violações** de WCAG 2.1 AA no
  axe-core — rotas públicas e do painel, em 390px e 1440px, incluindo estados
  que só existem depois de uma interação (lightbox, menu mobile, cada passo do
  agendamento, diálogo de CRUD).

```bash
npm run verify              # typecheck + lint + testes + build
npm run test:concurrency

npm run build && npm run start &   # os três abaixo precisam do servidor no ar
npm run e2e
npm run a11y
npm run perf
```

As capturas e os relatórios ficam em `.verification/` (fora do controle de versão).

### Acessibilidade

A primeira auditoria reprovou 31 dos 31 estados. Os achados e o que mudou:

| Problema | Correção |
| --- | --- |
| Cinzas de texto em 2,2:1 sobre o preto | Rampa `ash-*` deslocada: de `ash-600` para cima tudo passa de 4,5:1; `ash-700` virou decoração |
| Vermelho de marca (3,4:1) usado em rótulos | `blood-500` continua sendo preenchimento e ícone; texto vermelho usa `blood-400`, calibrado em 4,6:1 |
| Calendário do agendamento com `role="grid"` sem `role="row"` | Grade quebrada em linhas reais de sete células |
| `<dt>`/`<dd>` aninhados dois `<div>` abaixo do `<dl>` | Estrutura corrigida em `/contato` e no resumo do agendamento |
| `<h3>` logo abaixo do `<h1>` em `/artistas` | Nível do título do card virou propriedade |
| Dias e linhas inativos apagados com `opacity` | Recuo por fundo, mantendo o texto legível |

### Performance

`npm run perf` mede com cache frio, em navegador real, e reporta o valor cru
(custo de parse no aparelho) e o comprimido (o que trafega):

| Rota | JS | JS comprimido |
| --- | --- | --- |
| `/` | 656 kB | 197 kB |
| `/agendamento` | 953 kB | 267 kB |
| `/admin` | 694 kB | 212 kB |

Foi essa medição que motivou trocar o Recharts por gráficos escritos à mão: a
biblioteca custava **370 kB só na rota do dashboard** — mais que o site público
inteiro — para desenhar uma área e duas barras. A evolução virou um `<path>` de
SVG e os rankings viraram barras de CSS, ambos com a série repetida numa tabela
exposta só para leitor de tela.
