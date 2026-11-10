# FixIt 2.0

Novo projeto de gestão de solicitações de manutenção com escopo reduzido.

- Código: https://github.com/Rebecamarini/Fixit2.0
- Backlog: https://trello.com/b/SsT0I7Di/backlog-do-produto-fixit

Stack da versão anterior: Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3 e Supabase. Node 24.18.0 e npm 11.16.0; versões fixadas no package.json e package-lock.json.

## Desenvolvimento

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

A página inicial funciona sem credenciais. Preencha as variáveis com URL e chave publicável do ambiente Supabase destinado ao novo projeto quando integrar as funcionalidades. Nunca coloque chaves secretas ou service_role em variáveis NEXT_PUBLIC_.

Para infraestrutura local, com Docker disponível:

```sh
npm run supabase:start
npm run supabase:status
npm run supabase:stop
```

Os serviços usam portas próprias, diferentes da configuração padrão do projeto antigo. Não há migrations ou funcionalidades de autenticação nesta base.

## Validação

```sh
npm run verify
```

Executa lint, tipos e build. As histórias do produto continuam pendentes no Trello. Consulte CONTEXT.md, docs/adr/ e docs/agents/ para domínio e convenções das skills. Os arquivos docs/agents/*.md podem ser editados diretamente; refaça o setup apenas para trocar o rastreador ou reiniciar a configuração.

## Inicialização e publicação do Git

A sessão que preparou esta base não tinha permissão para criar `.git`. A publicação pelo conector GitHub também foi recusada por falta de acesso da integração (HTTP 403). Nenhum commit foi publicado.

No terminal, dentro desta pasta, execute:

```sh
sh scripts/init-git.sh
git add .
git commit -m "chore: initialize FixIt 2.0 base"
git push -u origin main
```

O script inicia a branch main e configura origin para Rebecamarini/Fixit2.0. Os arquivos de ambiente reais, node_modules e builds estão no .gitignore.
