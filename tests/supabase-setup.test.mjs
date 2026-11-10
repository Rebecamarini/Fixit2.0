import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const command = fileURLToPath(new URL("../scripts/check-supabase.mjs", import.meta.url));
const projectDir = fileURLToPath(new URL("..", import.meta.url));

async function run(args, envFile, filename = ".env.supabase.local") {
  const cwd = await mkdtemp(join(tmpdir(), "fixit-setup-test-"));
  try {
    if (envFile) await writeFile(join(cwd, filename), envFile);
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, [command, ...args], { cwd });
      let output = "";
      child.stdout.on("data", (data) => { output += data; });
      child.stderr.on("data", (data) => { output += data; });
      child.on("close", (code) => resolve({ code, output }));
    });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

test("a verificação exige escolher local ou cloud explicitamente", async () => {
  const result = await run([]);
  assert.equal(result.code, 1);
  assert.match(result.output, /Uso: npm run supabase:check -- <local\|cloud>/);
});

test("a verificação não recorre a outro arquivo quando o ambiente escolhido não existe", async () => {
  const result = await run(["cloud"], "NEXT_PUBLIC_SUPABASE_ENV=local\n");
  assert.equal(result.code, 1);
  assert.match(result.output, /Não foi possível ler \.env.supabase.cloud/);
});

test("a verificação recusa configurações incompletas sem exibir seus valores", async () => {
  const result = await run(["local"], "NEXT_PUBLIC_SUPABASE_ENV=local\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_secret_nao_exibir\n");
  assert.equal(result.code, 1);
  assert.match(result.output, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(result.output, /sb_secret_nao_exibir/);
});

test("a escolha local não pode usar URL cloud nem marcador cloud", async () => {
  for (const env of [
    "NEXT_PUBLIC_SUPABASE_ENV=cloud\nNEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ENV=local\nNEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
  ]) {
    const result = await run(["local"], `${env}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n`);
    assert.equal(result.code, 1);
    assert.match(result.output, /ambiente|loopback/);
  }
});

test("a verificação recusa chaves privilegiadas sem exibi-las", async () => {
  const serviceKey = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  for (const key of ["sb_secret_nao_exibir", serviceKey]) {
    const result = await run(["local"], `NEXT_PUBLIC_SUPABASE_ENV=local\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`);
    assert.equal(result.code, 1);
    assert.match(result.output, /chave publicável|anon/);
    assert.ok(!result.output.includes(key));
  }
});

test("o comando consulta a função pelo SDK e confirma a resposta esperada", async () => {
  let requested = false;
  const server = createServer((request, response) => {
    requested = true;
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/rest/v1/rpc/setup_healthcheck");
    assert.equal(request.headers.apikey, "sb_publishable_test");
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify("fixit-v2:ok"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const result = await run(["local"], `NEXT_PUBLIC_SUPABASE_ENV=local\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${server.address().port}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n`);
    assert.equal(result.code, 0);
    assert.match(result.output, /local: conexão e consulta confirmadas/);
    assert.ok(requested);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("resposta inesperada ou falha da API termina com erro e não imprime conteúdo remoto", async () => {
  for (const [status, body] of [[200, "resposta-inesperada"], [404, { message: "sb_secret_remoto" }]]) {
    const server = createServer((_request, response) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const result = await run(["local"], `NEXT_PUBLIC_SUPABASE_ENV=local\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${server.address().port}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n`);
      assert.equal(result.code, 1);
      assert.match(result.output, /consulta falhou|resposta inesperada/);
      assert.doesNotMatch(result.output, /sb_secret_remoto/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test("cloud recusa URLs locais e sem HTTPS antes de fazer a consulta", async () => {
  for (const url of ["https://127.0.0.1:55321", "http://example.supabase.co"]) {
    const result = await run(["cloud"], `NEXT_PUBLIC_SUPABASE_ENV=cloud\nNEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n`, ".env.supabase.cloud");
    assert.equal(result.code, 1);
    assert.match(result.output, /cloud exige HTTPS fora de loopback/);
  }
});

test("o build Next rejeita chaves privilegiadas antes de gerar o bundle, mesmo com configuração parcial", async () => {
  const serviceKey = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role", sentinel: "nao_publicar" })).toString("base64url")}.signature`;
  for (const key of ["sb_secret_nao_publicar_no_bundle", serviceKey]) {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [fileURLToPath(import.meta.resolve("next/dist/bin/next")), "build"], {
        cwd: projectDir,
        env: { ...process.env, NEXT_PUBLIC_SUPABASE_ENV: "", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, NEXT_TELEMETRY_DISABLED: "1" },
      });
      let output = "";
      child.stdout.on("data", (data) => { output += data; });
      child.stderr.on("data", (data) => { output += data; });
      child.on("close", (code) => resolve({ code, output }));
    });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Chaves privilegiadas são proibidas/);
    assert.doesNotMatch(result.output, /Creating an optimized production build/);
    assert.ok(!result.output.includes(key));
  }
});
