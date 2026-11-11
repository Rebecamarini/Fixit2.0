# FixIt 2.0

Novo projeto de gestão de solicitações de manutenção com escopo reduzido.

- Código: https://github.com/Rebecamarini/Fixit2.0
- Backlog: https://trello.com/b/SsT0I7Di/backlog-do-produto-fixit

Stack da versão anterior: Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3 e Supabase. Node 24.18.0 e npm 11.16.0; versões fixadas no package.json e package-lock.json.

## Preparação e ambientes

Use Node e npm nas versões acima. Docker Engine ativo (Docker Desktop ou Colima) é necessário para Supabase local.

```sh
nvm use
npm ci
cp .env.example .env.supabase.local
cp .env.example .env.supabase.cloud
```

Preencha os três campos dos arquivos reais, que são ignorados pelo Git:

| Variável | Local | Cloud |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_ENV` | `local` | `cloud` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL local, normalmente `http://127.0.0.1:55321` | Project URL HTTPS do novo projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável local; `anon` legada também aceita somente aqui | Chave `sb_publishable_...` |

A URL deve conter apenas protocolo, host e porta opcional. O validador recusa URL cloud em configuração local, loopback no cloud e chaves privilegiadas. Nunca coloque chaves secretas ou `service_role` em `NEXT_PUBLIC_`.

O Next.js também valida a chave na inicialização e antes do build, impedindo que uma chave privilegiada configurada seja incorporada ao bundle público, mesmo se os outros campos estiverem ausentes.

## Supabase local

Para infraestrutura local, com Docker disponível:

```sh
npm run supabase:start
npm run supabase:status
npx supabase migration up --local
```

Copie a URL e a chave **publicável** da saída do status para `.env.supabase.local`; não copie chaves secretas. As portas próprias da v2 são API `55321`, banco `55322`, Studio `55323` e e-mail local `55324`, separadas da versão antiga.

`supabase start` aplica migrations ao inicializar um banco novo; `migration up --local` aplica pendências em um banco existente. Para parar preservando os dados, use `npm run supabase:stop`.

## Supabase cloud

Projeto exclusivo da v2: **fixit-v2**, referência `wvdqynbngsveqyzsphre`, organização **Junior's Org**, região **São Paulo (sa-east-1)**. A criação foi cotada em **US$ 0/mês** no plano gratuito; não contratar recursos pagos para este setup.

No [painel do projeto](https://supabase.com/dashboard/project/wvdqynbngsveqyzsphre), copie Project URL e chave **Publishable** para `.env.supabase.cloud` e altere seu marcador para `cloud`. Não use o projeto da versão anterior.

A migration técnica já foi aplicada ao novo projeto. Para aplicar migrations futuras pelo CLI fixado neste repositório, confira o destino e use:

```sh
npx supabase login
npx supabase link --project-ref wvdqynbngsveqyzsphre
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

O login e o banco podem solicitar autenticação; credenciais reais não devem ser versionadas. Migrations e dados não sincronizam automaticamente entre local e cloud.

## Verificação de conexão

```sh
npm run supabase:check -- local
npm run supabase:check -- cloud
```

Cada comando lê **somente** `.env.supabase.local` ou `.env.supabase.cloud`, respectivamente, sem recorrer ao shell ou ao arquivo ativo da aplicação. Usa o SDK para chamar `setup_healthcheck()` pela Data API e espera `fixit-v2:ok`. A função não acessa dados de negócio, usa permissões do chamador e permite execução aos papéis de API `anon` e `authenticated`.

Sucesso imprime o ambiente e a confirmação. Falha de configuração, acesso, rede (limite de 10 segundos) ou resposta inesperada retorna código 1, sem imprimir chaves ou conteúdo remoto. Se a função não for encontrada, confira se a migration foi aplicada ao destino selecionado.

## Aplicação Next.js

Escolha o ambiente ativo explicitamente:

```sh
cp .env.supabase.local .env.local
# Para cloud, use no lugar do comando acima:
# cp .env.supabase.cloud .env.local
npm run dev
```

Reinicie o servidor ao trocar o arquivo. Para produção, configure os três campos antes de `npm run build`: `NEXT_PUBLIC_` é incorporado ao JavaScript do navegador durante o build, portanto a troca exige um novo build. Evite exportar variáveis homônimas no shell, pois têm precedência sobre `.env.local` no Next.js.

Clientes disponíveis: `createBrowserSupabaseClient` em `src/lib/supabase/client.ts` e `createServerSupabaseClient` em `src/lib/supabase/server.ts`. O servidor é protegido por `server-only` e cria o cliente por chamada. Ambos usam somente chave publicável e são **sem sessão** neste setup: não persistem usuário, não atualizam tokens e não processam login pela URL. Cookies, autenticação e permissões do produto pertencem aos próximos cartões.

A página inicial funciona sem credenciais; clientes só são criados onde forem usados. Não há tela ou endpoint técnico permanente no produto.

## Validação

```sh
npm run verify
```

Executa testes de comportamento do comando/configuração, lint, tipos e build. Os testes usam uma API HTTP controlada e não substituem as consultas reais nos dois ambientes. A validação dos clientes no navegador e servidor deve ser registrada na evidência do cartão.

Consulte a [spec do setup](docs/specs/setup-supabase.md), `CONTEXT.md`, `docs/adr/` e `docs/agents/` para escopo e convenções. Tabelas de negócio, autenticação e RLS continuam nos próximos cartões do Trello.

## Tabelas principais

Contrato: [spec de tabelas](docs/specs/tabelas-principais.md). A migration cria
`profiles`, `solicitacoes` e `historico`, com restrições no banco, histórico
imutável e RLS habilitada. O acesso comum pela API permanece fechado até o
cartão de políticas. Não há geração automática de eventos nesta entrega.

Aplique migrations pendentes com os comandos de local/cloud descritos acima.
Confirme o projeto **fixit-v2** antes de qualquer aplicação cloud. A verificação
SQL é autocontida, usa fixtures dentro de uma transação e termina em rollback:

```sh
# Supabase local em Docker; configure DOCKER_CONTEXT se usar Colima.
docker exec -i supabase_db_fixit-v2 psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/tabelas-principais.sql

# Cloud: conexão PostgreSQL do projeto v2, guardada fora do Git.
# Requer o cliente psql; não coloque a senha diretamente no comando/histórico.
psql "$FIXIT_V2_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tabelas-principais.sql
```

O teste cobre dados válidos, limites, valores inválidos, vínculos, atribuição a
inativos, desativação preservando atribuições, imutabilidade e exclusões
bloqueadas. Nenhuma fixture de negócio persiste. Números sequenciais podem ter
lacunas após testes ou transações revertidas.

Para testar o bloqueio real da Data API, obtenha uma sessão Auth de teste no
ambiente selecionado, configure o JWT em `SUPABASE_TEST_ACCESS_TOKEN` por meio
seguro e execute:

```sh
npm run db:check-api -- local
npm run db:check-api -- cloud
```

O comando lê apenas `.env.supabase.<ambiente>`, exige sessão válida, confirma a
consulta técnica e verifica SELECT/INSERT/UPDATE/DELETE nas três tabelas com
`anon` e `authenticated`. Exige erro explícito de permissão ou tabela não exposta em cada operação;
respostas vazias bem-sucedidas, erros de rede e token inválido não comprovam
o bloqueio. Usa IDs inexistentes e não cria conta nem dados de negócio; quem
provisionou a conta de teste deve removê-la ao terminar. Não publique o JWT nem
use chave privilegiada como sessão de teste. Não inclua estes testes reais no
comando padrão `verify`, que continua reproduzível sem credenciais de banco.
