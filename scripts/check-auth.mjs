import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';
import { createAuth } from '../src/lib/auth.ts';

// Only the fixture helper is privileged. It is explicitly supplied by the
// operator and never exposed to application code, arguments or reports.
async function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FIXIT_AUTH_SQL_COMMAND, {shell:true, stdio:['pipe','pipe','pipe']});
    let output = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.resume();
    child.on('error', () => reject(new Error('SQL helper indisponível.')));
    child.on('close', code => {
      if (code) return reject(new Error('Falha no SQL helper.'));
      try { resolve(JSON.parse(output)); } catch { reject(new Error('SQL helper deve retornar um array JSON.')); }
    });
    child.stdin.end(query);
  });
}

const environment = process.argv[2];
const accounts = [];
let checks = 0;
let admin;
try {
  assert(process.argv.length === 3 && ['local','cloud'].includes(environment), 'Uso: npm run auth:check -- <local|cloud>');
  assert(process.env.FIXIT_AUTH_SQL_COMMAND && process.env.SUPABASE_AUTH_ADMIN_KEY, 'Configure FIXIT_AUTH_SQL_COMMAND e SUPABASE_AUTH_ADMIN_KEY por meio seguro.');
  const config = getSupabaseConfig(parseEnv(await readFile(`.env.supabase.${environment}`, 'utf8')));
  assert.equal(config.environment, environment);
  const options = {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  admin = createClient(config.url, process.env.SUPABASE_AUTH_ADMIN_KEY, options);
  function browser(jar = new Map()) {
    const headers = new Map();
    const client = createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll: () => [...jar].map(([name,value]) => ({name,value})),
        setAll(values, responseHeaders) {
          values.forEach(({name,value,options}) => {
            assert(options.maxAge !== undefined, 'Cookies devem persistir entre usos do navegador.');
            if (options.maxAge === 0) jar.delete(name); else jar.set(name,value);
          });
          Object.entries(responseHeaders).forEach(([name,value]) => headers.set(name,value));
        },
      },
    });
    return {client, auth:createAuth(client), jar, headers};
  }
  function check(condition, message) { assert(condition, message); checks++; }
  const prefix = `fixit-auth-${randomUUID()}`;
  const password = `Fixit-${randomUUID()}-Aa1!`;
  const email = `${prefix}@example.com`;
  accounts.push(email);
  const first = browser();
  const signup = await first.auth.signUp({nome:'Cliente de teste',email,password});
  check(signup.ok, `Cadastro deve concluir com sessão e perfil: ${signup.error ?? ''}`);
  check(signup.profile.papel === 'cliente' && signup.profile.ativo && signup.profile.id === signup.user.id, 'Vínculo e papel inicial corretos.');
  check(first.jar.size > 0 && first.headers.get('Cache-Control')?.includes('no-store'), 'Cookies persistentes e resposta sem cache.');
  const reopened = browser(new Map(first.jar));
  check((await reopened.auth.context()).ok, 'Nova instância restaura sessão pelos cookies.');
  const second = browser();
  check((await second.auth.signIn({email,password})).ok, 'Outro dispositivo entra.');
  check((await browser().auth.signIn({email,password:'senha-incorreta'})).error === 'invalid_credentials', 'Credenciais inválidas recusadas.');
  check(!(await browser().auth.signUp({nome:'Duplicado',email,password})).ok, 'Cadastro duplicado recusado.');
  for (const nome of ['', '   ', 'a'.repeat(121)]) {
    check((await browser().auth.signUp({nome,email:`invalid-${randomUUID()}@example.com`,password})).error === 'invalid_input', 'Nome inválido recusado.');
  }
  check((await browser().auth.signUp({nome:'Nome',email:'invalido',password})).error === 'invalid_input', 'E-mail inválido recusado.');
  const weakEmail = `weak-${prefix}@example.com`;
  accounts.push(weakEmail);
  check((await browser().auth.signUp({nome:'Nome',email:weakEmail,password:'x'})).error === 'invalid_input', 'Política real de senha aplicada.');
  check((await first.auth.signUp({nome:'Nome',email,password,papel:'gestor'})).error === 'invalid_input', 'Interface pública recusa papel.');
  const forgedEmail = `forged-${prefix}@example.com`;
  accounts.push(forgedEmail);
  const forged = browser();
  const forgedResult = await forged.client.auth.signUp({email:forgedEmail,password,options:{data:{nome:'Forjado',papel:'gestor',ativo:false,fixit_papel:'manutentor',app_metadata:{fixit_papel:'gestor'}}}});
  check(!forgedResult.error, 'Cadastro direto adversarial exercitado.');
  const forgedContext = await forged.auth.context();
  check(forgedContext.ok && forgedContext.profile.papel === 'cliente' && forgedContext.profile.ativo, 'Metadados públicos não concedem privilégios.');
  const foreign = await first.client.from('profiles').select('id').eq('id',forgedContext.user.id);
  check(!foreign.error && foreign.data.length === 0, 'RLS esconde perfil alheio.');
  for (const papel of ['gestor','manutentor']) {
    const teamEmail = `${papel}-${prefix}@example.com`;
    accounts.push(teamEmail);
    const provisioned = spawnSync(process.execPath, ['scripts/provision-auth.mjs', environment], {input:JSON.stringify({email:teamEmail,password,nome:papel,papel}),encoding:'utf8',env:process.env});
    check(provisioned.status === 0 && !provisioned.stdout.includes(password), 'Procedimento administrativo cria conta sem expor senha.');
    const login = await browser().auth.signIn({email:teamEmail,password});
    check(login.ok && login.profile.papel === papel, 'Equipe recebe papel correto desde a criação.');
  }
  const raw = createClient(config.url,config.publishableKey,options);
  const invalidEmail = `rollback-${prefix}@example.com`;
  accounts.push(invalidEmail);
  const rollback = await raw.auth.signUp({email:invalidEmail,password,options:{data:{nome:' '}}});
  check(!!rollback.error, 'Falha real do perfil impede cadastro.');
  const rows = await sql(`select count(*)::int as count from auth.users where email='${invalidEmail}'`);
  check(rows[0].count === 0, 'Falha do perfil não deixa conta órfã.');
  check((await browser().auth.signUp({nome:'Nova tentativa',email:invalidEmail,password})).ok, 'Nova tentativa após falha conclui.');
  const refresh = await reopened.client.auth.refreshSession();
  check(!refresh.error && (await reopened.auth.context()).ok, 'Renovação real mantém acesso.');
  check((await reopened.auth.signOut()).ok, 'Logout local conclui.');
  check((await reopened.auth.context()).error === 'not_authenticated' && reopened.jar.size === 0, 'Logout remove cookies e acesso local.');
  check((await second.auth.context()).ok && !(await second.client.auth.refreshSession()).error, 'Outro dispositivo preserva acesso e renovação.');
  await sql(`update public.profiles set ativo=false where id='${signup.user.id}'`);
  check((await second.auth.context()).error === 'profile_missing', 'RLS oculta perfil inativo e impede acesso pronto.');
  await sql(`delete from public.profiles where id='${signup.user.id}'`);
  check((await second.auth.context()).error === 'profile_missing', 'Perfil ausente é distinguido.');
  for (const table of ['solicitacoes','historico']) {
    const result = await second.client.from(table).select('id');
    check(!result.error && result.data.length === 0, 'Perfil ausente não lê solicitações nem histórico.');
  }
  const session = await second.client.auth.getSession();
  await admin.auth.admin.signOut(session.data.session.access_token,'global');
  const expired = browser(new Map(second.jar));
  await expired.client.auth.refreshSession();
  check((await expired.auth.context()).error === 'not_authenticated', 'Sessão revogada não se renova.');
  console.log(`${environment}: ${checks} verificações reais de autenticação aprovadas.`);
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Falha na integração de autenticação; confira ambiente e conectividade.');
  process.exitCode = 1;
} finally {
  if (admin && accounts.length) {
    try {
      const emails = accounts.map(email => `'${email}'`).join(',');
      const rows = await sql(`select id from auth.users where email in (${emails})`);
      // Revoke sessions before removing identity; restrictive profile FK is preserved.
      for (const {id} of rows) {
        await sql(`delete from auth.sessions where user_id='${id}'; delete from public.profiles where id='${id}'`);
        const deleted = await admin.auth.admin.deleteUser(id);
        assert(!deleted.error, 'Falha ao limpar conta de teste.');
      }
      const remaining = await sql(`select count(*)::int as count from auth.users where email in (${emails})`);
      assert.equal(remaining[0].count,0);
      console.log(`${environment}: fixtures removidas.`);
    } catch {
      console.error('Limpeza incompleta das fixtures de autenticação; revisar contas de teste antes de prosseguir.');
      process.exitCode = 1;
    }
  }
}
