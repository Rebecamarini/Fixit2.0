import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuth } from '../src/lib/auth.ts';

test('cadastro recusa entrada inválida antes de acessar o provedor', async () => {
  const auth = createAuth({});
  for (const input of [null, {}, {nome:' ',email:'a@b.com',password:'password123'}, {nome:'a'.repeat(121),email:'a@b.com',password:'password123'}, {nome:'Ana',email:'inválido',password:'password123'}, {nome:'Ana',email:'a@b.com',password:'password123',papel:'gestor'}]) {
    assert.equal((await auth.signUp(input)).error, 'invalid_input');
  }
});

test('login recusa entrada inválida e falha de rede tem estado próprio', async () => {
  const auth = createAuth({});
  assert.equal((await auth.signIn({email:'sem-email',password:'x'})).error, 'invalid_input');
  const offline = createAuth({ auth: { signInWithPassword: async () => { throw new TypeError('offline'); } } });
  assert.equal((await offline.signIn({email:'ana@example.com',password:'x'})).error, 'unavailable');
});
