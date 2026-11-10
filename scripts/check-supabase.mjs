import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

const environment = process.argv[2];

if (process.argv.length !== 3 || !["local", "cloud"].includes(environment)) {
  console.error("Uso: npm run supabase:check -- <local|cloud>");
  process.exitCode = 1;
} else {
  const filename = `.env.supabase.${environment}`;
  let env;
  try {
    env = parseEnv(await readFile(filename, "utf8"));
  } catch {
    console.error(`Não foi possível ler ${filename}. Configure-o a partir de .env.example.`);
    process.exitCode = 1;
  }
  if (env) {
    try {
      const config = getSupabaseConfig(env);
      if (config.environment !== environment) throw new Error("O marcador de ambiente não corresponde ao ambiente escolhido.");
      const client = createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error, status } = await client.rpc("setup_healthcheck").abortSignal(AbortSignal.timeout(10_000));
      if (error) throw new Error(`${environment}: consulta falhou (HTTP ${status}). Confira conexão, URL, chave e aplicação da migration.`);
      if (data !== "fixit-v2:ok") throw new Error(`${environment}: resposta inesperada da consulta técnica.`);
      console.log(`${environment}: conexão e consulta confirmadas.`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
