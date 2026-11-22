import { parseEnv } from 'node:util';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

export function getLocalDemoConfig(env, statusOutput) {
  const config = getSupabaseConfig(env);
  if (config.environment !== 'local') {
    throw new Error('Este script só roda no Supabase local.');
  }

  const status = parseEnv(statusOutput);
  if (!status.API_URL || new URL(config.url).href !== new URL(status.API_URL).href) {
    throw new Error('A URL configurada deve corresponder à API do Supabase local em execução.');
  }
  if (!status.SECRET_KEY) {
    throw new Error('O Supabase local não informou a chave administrativa.');
  }

  return { ...config, adminKey: status.SECRET_KEY };
}
