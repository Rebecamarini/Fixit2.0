import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

try {
  const environment = process.argv[2];
  assert(process.argv.length === 3 && ["local", "cloud"].includes(environment), "Uso: npm run db:check-api -- <local|cloud>");
  const token = process.env.SUPABASE_TEST_ACCESS_TOKEN;
  assert(token, "Configure SUPABASE_TEST_ACCESS_TOKEN com sessão de teste válida; não use chave privilegiada.");
  const config = getSupabaseConfig(parseEnv(await readFile(`.env.supabase.${environment}`, "utf8")));
  assert.equal(config.environment, environment, "Marcador de ambiente incompatível.");
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const anonymous = createClient(config.url, config.publishableKey, options);
  const authenticated = createClient(config.url, config.publishableKey, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
  const identity = await authenticated.auth.getUser(token);
  assert(!identity.error && identity.data.user, "A sessão de teste não é válida no ambiente escolhido.");
  const health = await anonymous.rpc("setup_healthcheck").abortSignal(AbortSignal.timeout(10_000));
  assert(!health.error && health.data === "fixit-v2:ok", "A consulta técnica deve funcionar antes dos testes de acesso.");
  let checks = 0;
  for (const client of [anonymous, authenticated]) {
    for (const table of ["profiles", "solicitacoes", "historico"]) {
      // IDs inexistentes evitam efeitos residuais se as permissões regredirem.
      const id = randomUUID();
      const payload = table === "profiles" ? { id, nome: "Teste isolado", papel: "cliente" }
        : table === "solicitacoes" ? { id, solicitante_id: randomUUID(), titulo: "t", descricao: "d", local: "l" }
          : { id, solicitacao_id: randomUUID(), autor_id: randomUUID(), tipo: "abertura" };
      const read = await client.from(table).select("id").limit(1).abortSignal(AbortSignal.timeout(10_000));
      const denied = (error) => ["42501", "PGRST205"].includes(error?.code);
      if (table === "profiles" && client === authenticated) {
        assert(!read.error && read.data.every(row => row.id === identity.data.user.id), "profiles: leitura deve conter somente a própria identidade.");
      } else {
        assert(denied(read.error), `${table}: leitura exposta ou falha inesperada.`);
      }
      const insert = await client.from(table).insert(payload).abortSignal(AbortSignal.timeout(10_000));
      assert(denied(insert.error), `${table}: INSERT não foi bloqueado por permissão.`);
      for (const operation of [client.from(table).update(payload).eq("id", id).select("id"), client.from(table).delete().eq("id", id).select("id")]) {
        const result = await operation.abortSignal(AbortSignal.timeout(10_000));
        assert(denied(result.error), `${table}: alteração exposta ou falha inesperada.`);
      }
      checks += 4;
    }
  }
  console.log(`${environment}: ${checks} verificações de API aprovadas (anon e authenticated).`);
} catch (error) {
  // Não imprimir respostas remotas, tokens ou configuração.
  console.error(error instanceof assert.AssertionError ? error.message : "Falha na verificação de API; confira configuração e conectividade.");
  process.exitCode = 1;
}
