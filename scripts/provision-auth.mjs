import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

try {
  const environment = process.argv[2];
  assert(process.argv.length === 3 && ['local','cloud'].includes(environment), 'Uso: npm run auth:provision -- <local|cloud> < arquivo-privado.json');
  assert(process.env.SUPABASE_AUTH_ADMIN_KEY, 'Configure SUPABASE_AUTH_ADMIN_KEY por meio seguro.');
  const input = JSON.parse(readFileSync(0,'utf8'));
  assert(typeof input.nome === 'string' && input.nome.trim() && [...input.nome].length <= 120, 'Nome obrigatório, até 120 caracteres.');
  assert(typeof input.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()), 'E-mail inválido.');
  assert(typeof input.password === 'string' && input.password.length > 0, 'Senha obrigatória.');
  assert(['gestor','manutentor'].includes(input.papel), 'Papel deve ser gestor ou manutentor.');
  const config = getSupabaseConfig(parseEnv(await readFile(`.env.supabase.${environment}`,'utf8')));
  assert.equal(config.environment,environment);
  const admin = createClient(config.url, process.env.SUPABASE_AUTH_ADMIN_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
  const result = await admin.auth.admin.createUser({email:input.email.trim(),password:input.password,email_confirm:true,user_metadata:{nome:input.nome.trim()},app_metadata:{fixit_papel:input.papel}});
  assert(!result.error && result.data.user, 'Não foi possível provisionar a conta. Confira ambiente, política de senha e duplicidade.');
  console.log(`Conta ${input.papel} criada: ${result.data.user.id}`);
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Falha no provisionamento; confira entrada e conectividade.');
  process.exitCode = 1;
}
