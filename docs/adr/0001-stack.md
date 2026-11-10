# ADR 0001 — Manter a stack da versão anterior

Status: aceito por solicitação do usuário em 2026-11-10.

Usar Next.js App Router, React, TypeScript, ESLint e Supabase (Auth e PostgreSQL), com Node.js e npm. A base fixa as versões encontradas no package.json da versão anterior e usa CSS nativo.

Iniciar código e histórico Git novos. Não copiar funcionalidades, migrations, dados, credenciais ou vínculo cloud da versão anterior. A criação de schema e integração autenticada será realizada nas tarefas específicas do Trello. Supabase local usa configuração própria deste projeto.
