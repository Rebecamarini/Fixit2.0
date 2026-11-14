import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

// Test pages/routes live in a disposable app, never in the product build.
// Playwright is an operator-supplied test tool, not a runtime dependency.
const environment = process.argv[2];
const email = `fixit-next-${randomUUID()}@example.com`;
const password = `Fixit-${randomUUID()}-Aa1!`;
let directory, server, browser;
let checks = 0;
function check(condition, message) { assert(condition, message); checks++; }
async function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FIXIT_AUTH_SQL_COMMAND, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.resume();
    child.on('error', () => reject(new Error('SQL helper indisponível.')));
    child.on('close', code => {
      if (code) return reject(new Error('Falha no SQL helper.'));
      try { resolve(JSON.parse(output)); } catch { reject(new Error('SQL helper deve retornar JSON.')); }
    });
    child.stdin.end(query);
  });
}
async function run(args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { ...options, stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error('Build do app de teste falhou.')));
  });
}
try {
  assert(process.argv.length === 3 && ['local', 'cloud'].includes(environment), 'Uso: npm run auth:check-next -- <local|cloud>');
  assert(process.env.FIXIT_AUTH_SQL_COMMAND && process.env.FIXIT_PLAYWRIGHT_MODULE, 'Configure FIXIT_AUTH_SQL_COMMAND e FIXIT_PLAYWRIGHT_MODULE (caminho absoluto para playwright-core/index.mjs).');
  const { chromium } = await import(pathToFileURL(resolve(process.env.FIXIT_PLAYWRIGHT_MODULE)).href);
  const publicEnv = parseEnv(await readFile(`.env.supabase.${environment}`, 'utf8'));
  assert.equal(getSupabaseConfig(publicEnv).environment, environment);
  directory = await mkdtemp(join(tmpdir(), 'fixit-next-check-'));
  await mkdir(join(directory, 'src/app/session'), { recursive: true });
  await mkdir(join(directory, 'src/app/render'), { recursive: true });
  await cp('src/lib', join(directory, 'src/lib'), { recursive: true });
  await cp('src/proxy.ts', join(directory, 'src/proxy.ts'));
  await cp('next.config.mjs', join(directory, 'next.config.mjs'));
  await cp('tsconfig.json', join(directory, 'tsconfig.json'));
  await symlink(await realpath('node_modules'), join(directory, 'node_modules'), 'dir');
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  await writeFile(join(directory, 'src/app/layout.tsx'), 'export default function Layout({children}: {children: React.ReactNode}) { return <html><body>{children}</body></html>; }');
  await writeFile(join(directory, 'src/app/page.tsx'), `"use client";
import { useEffect } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { createAuth } from '../lib/auth';
export default function Page() {
  useEffect(() => {
    const client = createBrowserSupabaseClient();
    Object.assign(window, { fixture: { client, auth: createAuth(client) } });
  }, []);
  return <p>Fixture de sessão</p>;
}`);
  await writeFile(join(directory, 'src/app/session/route.ts'), `import { createServerSupabaseClient } from '../../lib/supabase/server';
import { createAuth } from '../../lib/auth';
export async function GET() {
  return Response.json(await createAuth(await createServerSupabaseClient()).context());
}
export async function POST(request: Request) {
  const auth = createAuth(await createServerSupabaseClient());
  const { action, input } = await request.json();
  return Response.json(action === 'signIn' ? await auth.signIn(input) : await auth.signOut());
}`);
  await writeFile(join(directory, 'src/app/render/page.tsx'), `import { createServerSupabaseClient } from '../../lib/supabase/server';
import { createAuth } from '../../lib/auth';
export default async function Page() {
  const result = await createAuth(await createServerSupabaseClient()).context();
  return <p id="identity">{result.ok ? result.user.id : result.error}</p>;
}`);
  const childEnv = { ...process.env, ...publicEnv, NEXT_TELEMETRY_DISABLED: '1' };
  // Explicit env keys above are the only credentials the fixture app needs.
  delete childEnv.SUPABASE_AUTH_ADMIN_KEY;
  delete childEnv.FIXIT_AUTH_SQL_COMMAND;
  delete childEnv.FIXIT_PLAYWRIGHT_MODULE;
  const next = resolve('node_modules/next/dist/bin/next');
  await run([next, 'build', '--webpack'], { cwd: directory, env: childEnv });
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', '0'], { cwd: directory, env: childEnv, stdio: ['ignore', 'pipe', 'ignore'] });
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Next.js não iniciou.')), 30_000);
    let output = '';
    server.stdout.on('data', value => {
      output += value;
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
    server.once('exit', () => { clearTimeout(timeout); reject(new Error('Next.js encerrou antes de iniciar.')); });
  });
  browser = await chromium.launch({ executablePath: process.env.FIXIT_BROWSER_EXECUTABLE || undefined });
  async function open(storageState) {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => !!window.fixture);
    return { context, page };
  }
  async function serverContext(context) {
    const response = await context.request.get(`${origin}/session`);
    check(response.ok() && response.headers()['cache-control']?.includes('private') && response.headers()['cache-control']?.includes('no-store'), 'Resposta autenticada é privada e não armazenável.');
    return response.json();
  }
  const first = await open();
  check((await serverContext(first.context)).error === 'not_authenticated', 'Servidor distingue visitante.');
  const signup = await first.page.evaluate(input => window.fixture.auth.signUp(input), { nome: 'Cliente Next', email, password });
  check(signup.ok && signup.profile.papel === 'cliente', 'Cadastro no browser real cria Cliente.');
  const id = signup.user.id;
  check((await first.context.cookies()).some(cookie => cookie.name.includes('-auth-token') && cookie.expires > Date.now() / 1000), 'Browser guarda cookies persistentes reais.');
  check((await serverContext(first.context)).user?.id === id, 'Servidor reconhece sessão criada no browser.');
  await first.page.goto(`${origin}/render`);
  check(await first.page.locator('#identity').textContent() === id, 'Server Component usa sessão com cookies reais.');
  const state = await first.context.storageState();
  await first.context.close();
  const reopened = await open(state);
  check((await reopened.page.evaluate(() => window.fixture.auth.context())).user?.id === id, 'Novo contexto do navegador restaura sessão persistida.');
  const other = await open();
  const login = await other.context.request.post(`${origin}/session`, { data: { action: 'signIn', input: { email, password } } });
  check((await login.json()).user?.id === id, 'Login em Route Handler escreve cookies reais.');
  await other.page.reload();
  await other.page.waitForFunction(() => !!window.fixture);
  check((await other.page.evaluate(() => window.fixture.auth.context())).user?.id === id, 'Browser reconhece sessão criada no servidor.');
  check((await serverContext((await open()).context)).error === 'not_authenticated', 'Contexto anônimo não recebe identidade de outro usuário por cache.');

  // Age only the stored expires_at, preserving the signed JWT and real refresh
  // token. This deterministically exercises renewal without waiting an hour.
  // It does not claim the JWT's signature/expiry was changed.
  async function ageSession(context) {
    const cookies = (await context.cookies()).filter(cookie => /-auth-token(?:\.\d+)?$/.test(cookie.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    assert(cookies.length, 'Sessão deve existir antes de simular vencimento local.');
    const encoded = cookies.map(cookie => cookie.value).join('');
    assert(encoded.startsWith('base64-'));
    const session = JSON.parse(Buffer.from(encoded.slice(7), 'base64url').toString());
    const oldRefresh = session.refresh_token;
    session.expires_at = 1;
    const updated = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
    const base = cookies[0].name.replace(/\.\d+$/, '');
    await context.clearCookies({ name: /-auth-token(?:\.\d+)?$/ });
    const chunks = updated.match(/.{1,3000}/g);
    await context.addCookies(chunks.map((value, index) => ({ ...cookies[0], name: chunks.length === 1 ? base : `${base}.${index}`, value })));
    return oldRefresh;
  }
  await reopened.page.close();
  const oldRefresh = await ageSession(reopened.context);
  const renewed = await reopened.context.request.get(`${origin}/session`);
  check((await renewed.json()).user?.id === id && renewed.headers()['set-cookie']?.includes('-auth-token'), 'Proxy renova sessão e devolve Set-Cookie ao navegador.');
  const freshPage = await reopened.context.newPage();
  await freshPage.goto(origin);
  await freshPage.waitForFunction(() => !!window.fixture);
  const newRefresh = await freshPage.evaluate(async () => (await window.fixture.client.auth.getSession()).data.session.refresh_token);
  check(newRefresh !== oldRefresh, 'Renovação real gira o refresh token.');
  check((await freshPage.evaluate(() => window.fixture.auth.signOut())).ok, 'Logout do browser conclui.');
  check((await serverContext(reopened.context)).error === 'not_authenticated', 'Logout do browser remove acesso no servidor.');
  check(!(await reopened.context.cookies()).some(cookie => cookie.name.includes('-auth-token')), 'Logout remove cookies de sessão.');
  check((await serverContext(other.context)).user?.id === id, 'Outro dispositivo mantém sua sessão após logout local.');
  const logout = await other.context.request.post(`${origin}/session`, { data: { action: 'signOut' } });
  check((await logout.json()).ok, 'Logout em Route Handler conclui.');
  await other.page.reload();
  await other.page.waitForFunction(() => !!window.fixture);
  check((await other.page.evaluate(() => window.fixture.auth.context())).error === 'not_authenticated', 'Logout do servidor remove acesso no browser.');
  const terminal = await open();
  await terminal.page.evaluate(input => window.fixture.auth.signIn(input), { email, password });
  await terminal.page.close();
  await sql(`delete from auth.sessions where user_id='${id}'`);
  await ageSession(terminal.context);
  check((await serverContext(terminal.context)).error === 'not_authenticated', 'Sessão revogada não pode renovar e retorna desconectada.');
  check(!(await terminal.context.cookies()).some(cookie => cookie.name.includes('-auth-token')), 'Proxy limpa cookies quando a sessão não pode renovar.');
  console.log(`${environment}: ${checks} verificações de sessão no Next.js de produção e Chromium reais aprovadas.`);
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Falha na verificação Next.js; confira ferramentas, ambiente e conectividade.');
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
  }
  if (directory) await rm(directory, { recursive: true, force: true });
  if (process.env.FIXIT_AUTH_SQL_COMMAND) {
    try {
      const users = await sql(`select id from auth.users where email='${email}'`);
      const ids = users.map(user => `'${user.id}'`).join(',') || 'null';
      await sql(`begin;
        delete from auth.sessions where user_id in (select id from auth.users where email='${email}');
        delete from public.profiles where id in (select id from auth.users where email='${email}');
        delete from auth.users where email='${email}'; commit;`);
      const [remaining] = await sql(`select
        (select count(*) from auth.users where email='${email}')::int as users,
        (select count(*) from auth.identities where identity_data->>'email'='${email}')::int as identities,
        (select count(*) from auth.sessions where user_id in (${ids}))::int as sessions,
        (select count(*) from auth.refresh_tokens where user_id in (${ids}))::int as refresh_tokens,
        (select count(*) from public.profiles where id in (${ids}))::int as profiles`);
      assert(Object.values(remaining).every(value => value === 0));
      console.log(`${environment}: fixtures Next.js removidas e app temporário excluído.`);
    } catch {
      console.error('Limpeza incompleta das fixtures Next.js; revisar antes de prosseguir.');
      process.exitCode = 1;
    }
  }
}
