import assert from 'node:assert/strict';
import { mkdtemp, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { cleanupNextAuth } from '../scripts/next-auth-cleanup.mjs';

test('falha ao fechar navegador não impede remover app e limpar banco', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fixit-cleanup-test-'));
  let cleaned = false;
  const failures = await cleanupNextAuth({
    browser: { close: async () => { throw new Error('sensitive browser detail'); } },
    directory,
    cleanupFixtures: async () => { cleaned = true; },
  });
  assert.deepEqual(failures, ['browser']);
  assert(cleaned);
  await assert.rejects(access(directory), { code: 'ENOENT' });
});

test('falha ao remover app não impede limpeza do banco e preserva ambas as falhas', async () => {
  let attempted = false;
  const failures = await cleanupNextAuth({
    directory: '\0',
    cleanupFixtures: async () => { attempted = true; throw new Error('sensitive SQL detail'); },
  });
  assert(attempted);
  assert.deepEqual(failures, ['app', 'fixtures']);
  assert(!JSON.stringify(failures).includes('sensitive'));
});

test('falha ao terminar servidor não bloqueia limpeza de fixtures', async () => {
  const server = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null, kill: () => false });
  let cleaned = false;
  assert.deepEqual(await cleanupNextAuth({ server, cleanupFixtures: async () => { cleaned = true; } }), ['server']);
  assert(cleaned);
});
