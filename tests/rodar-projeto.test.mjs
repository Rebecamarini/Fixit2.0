import assert from "node:assert/strict";
import test from "node:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function executar({ config = true, installExit = 0, installed = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "fixit-rodar-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "src/lib/supabase"), { recursive: true });
    copyFileSync(
      new URL("../scripts/rodar-projeto.mjs", import.meta.url),
      join(root, "scripts/rodar-projeto.mjs")
    );
    copyFileSync(
      new URL("../src/lib/supabase/config.ts", import.meta.url),
      join(root, "src/lib/supabase/config.ts")
    );
    writeFileSync(join(root, ".env.local"), "ambiente-local-preservado\n");
    if (config) {
      writeFileSync(join(root, ".env.supabase.cloud"), [
        "NEXT_PUBLIC_SUPABASE_ENV=cloud",
        "NEXT_PUBLIC_SUPABASE_URL=https://fixit.example",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_teste",
      ].join("\n"));
    }
    writeFileSync(join(root, "npm.mjs"), `
      import { appendFileSync } from 'node:fs';
      appendFileSync('calls.jsonl', JSON.stringify({
        args: process.argv.slice(2),
        environment: process.env.NEXT_PUBLIC_SUPABASE_ENV,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL
      }) + '\\n');
      if (process.argv[2] === 'ls') process.exit(${installed ? 0 : 1});
      if (process.argv[2] === 'ci') process.exit(${installExit});
    `);
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/rodar-projeto.mjs"), "--port", "3009"],
      {
        cwd: root,
        env: {
          ...process.env,
          npm_execpath: join(root, "npm.mjs"),
          NEXT_PUBLIC_SUPABASE_ENV: "local",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1",
        },
        encoding: "utf8",
      }
    );
    const log = join(root, "calls.jsonl");
    return {
      ...result,
      calls: existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map(JSON.parse) : [],
      local: readFileSync(join(root, ".env.local"), "utf8"),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("comando prepara dependências e inicia cloud preservando .env.local e argumentos", () => {
  const result = executar();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls.map(call => call.args), [
    ["ls", "--depth=0", "--silent"],
    ["ci", "--no-audit", "--no-fund", "--prefer-offline"],
    ["run", "dev", "--", "--port", "3009"],
  ]);
  assert(result.calls.every(call => call.environment === "cloud" && call.url === "https://fixit.example"));
  assert.equal(result.local, "ambiente-local-preservado\n");
});

test("configuração ausente encerra antes de instalar ou iniciar o servidor", () => {
  const result = executar({ config: false });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Configure \.env\.supabase\.cloud/);
  assert.deepEqual(result.calls, []);
});

test("falha na instalação preserva o código de saída e impede iniciar o servidor", () => {
  const result = executar({ installExit: 27 });
  assert.equal(result.status, 27);
  assert.deepEqual(result.calls.map(call => call.args), [
    ["ls", "--depth=0", "--silent"],
    ["ci", "--no-audit", "--no-fund", "--prefer-offline"],
  ]);
});

test("dependências válidas iniciam o servidor sem reinstalação", () => {
  const result = executar({ installed: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls.map(call => call.args), [
    ["ls", "--depth=0", "--silent"],
    ["run", "dev", "--", "--port", "3009"],
  ]);
});
