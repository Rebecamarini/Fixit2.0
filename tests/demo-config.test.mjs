import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLocalDemoConfig } from '../scripts/demo-config.mjs';

const env = {
  NEXT_PUBLIC_SUPABASE_ENV: 'local',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};
const status = 'API_URL="http://127.0.0.1:55321"\nSECRET_KEY="local-admin-key"';

test('demonstração só libera chave administrativa para a API local informada pelo CLI', () => {
  assert.equal(getLocalDemoConfig(env, status).adminKey, 'local-admin-key');
  for (const url of [
    'https://example.com',
    'http://127.0.0.1:54321',
    'http://127.0.0.1:55321/caminho'
  ]) {
    assert.throws(() => getLocalDemoConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: url }, status));
  }
  assert.throws(() =>
    getLocalDemoConfig(
      {
        ...env,
        NEXT_PUBLIC_SUPABASE_ENV: 'cloud',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.com'
      },
      status
    )
  );
  assert.throws(() => getLocalDemoConfig(env, 'API_URL="http://127.0.0.1:55321"'));
  assert.throws(() => getLocalDemoConfig(env, 'SECRET_KEY="local-admin-key"'));
});
