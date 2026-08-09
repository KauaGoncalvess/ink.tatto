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
| `npm run test` | Testes do motor de disponibilidade (Vitest) |
| `npm run test:concurrency` | Prova que reservas simultâneas não duplicam |
| `npm run e2e` | Percurso ponta a ponta em navegador real + capturas |
| `npm run db:migrate` / `db:seed` / `db:reset` / `db:studio` | Banco |
| `npm run images:placeholders` | Gera os placeholders on-brand |
| `npm run images:fetch` | Baixa fotografias reais para os mesmos caminhos |

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
scripts/           geração de imagens, E2E, verificação de concorrência
src/
  app/
    (site)/        rotas públicas
    (admin)/admin/ painel (protegido)
    (auth)/admin/  login (fora do layout protegido, senão haveria loop)
    api/           disponibilidade e upload
  components/
    ui/            primitivos (botão, campo, diálogo, menu, switch)
    site/          navbar, footer, hero, galeria, cards
    admin/         casca do painel e peças compartilhadas
  features/        booking · appointments · admin · auth · content
  lib/             availability · datetime · prisma · auth · storage · notifier
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
- **Duas camadas de autorização:** o middleware barra a navegação em `/admin/*`,
  e cada Server Action revalida a sessão contra o banco — uma action pode ser
  invocada por POST direto, sem passar pela navegação. O papel vem do banco, não
  do token, então revogar acesso vale na hora.
- Zod valida toda entrada no servidor; a validação no cliente é só UX.
- Rate limiting em login, agendamento e upload.
- Uploads: tipo verificado pela **assinatura binária**, não pelo `Content-Type`
  (que o cliente escolhe); nome gerado no servidor; 5 MB de limite.
- Cabeçalhos de segurança em `next.config.ts`.

### Próximo passo conhecido

Não há **CSP** configurada. Uma CSP correta com o App Router exige nonce por
requisição gerado no middleware; um `script-src 'unsafe-inline'` daria falsa
sensação de proteção. Ficou documentado em vez de mal feito.

---

## Notificações

`src/lib/notifier.ts` registra as notificações no banco (alimentando o sino do
painel) e expõe um adapter plugável. **Não há envio real de e-mail/SMS** —
o projeto não recebeu credenciais de provedor, e um envio que falha em silêncio
seria pior que nenhum. Para plugar Resend/Twilio, implemente
`NotificationAdapter` e registre em `adapters`; nada no domínio muda.

Enquanto isso, cada agendamento traz um botão "responder no WhatsApp" com a
mensagem pré-preenchida.

---

## Deploy

1. Provisione um PostgreSQL e aponte `DATABASE_URL`.
2. Defina `AUTH_SECRET` (`openssl rand -base64 48`) e `NEXT_PUBLIC_SITE_URL`.
3. `npm run db:deploy` para aplicar as migrations.
4. `npm run build && npm run start`.

**Atenção — uploads.** O adapter padrão grava em `public/uploads`. Em
plataformas serverless (Vercel, Lambda) o sistema de arquivos é efêmero e as
imagens somem no próximo deploy. Para produção, implemente `StorageAdapter`
(`src/lib/storage.ts`) com S3/R2 e troque a constante `storage`.

**Atenção — rate limiting.** A implementação é em memória, por instância. Em
deploy multi-instância, troque `hit()` em `src/lib/rate-limit.ts` por Redis.

O build tolera banco indisponível: `generateStaticParams` e o sitemap caem para
renderização sob demanda em vez de quebrar o pipeline.

---

## Verificação

O que já foi executado e passa neste projeto:

- `npm run typecheck` · `npm run lint` · `npm run build` — sem erros nem avisos;
- 27 testes unitários do motor de disponibilidade (sobreposição, pausa,
  bloqueio, fora de expediente, duração que não cabe, lead time, fuso);
- teste de concorrência: 8 reservas simultâneas → 1 criada, 7 recusadas;
- E2E em navegador real: agendamento completo até o número da reserva, login,
  confirmação do agendamento no painel, varredura de todas as rotas, H1 único
  por página e ausência de scroll horizontal em 390px e 1440px.

```bash
npm run verify              # typecheck + lint + testes + build
npm run test:concurrency
npm run start &             # o E2E precisa do servidor no ar
npm run e2e
```

As capturas do E2E ficam em `.verification/` (fora do controle de versão).
