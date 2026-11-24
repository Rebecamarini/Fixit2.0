import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.env.npm_execpath;

try {
  if (!npm) throw new Error("Use npm run rodar para iniciar o projeto.");

  let settings;
  try {
    settings = parseEnv(readFileSync(new URL("../.env.supabase.cloud", import.meta.url), "utf8"));
  } catch {
    throw new Error("Configure .env.supabase.cloud conforme .env.example antes de iniciar.");
  }

  const config = getSupabaseConfig(settings);
  if (config.environment !== "cloud") {
    throw new Error("O arquivo .env.supabase.cloud deve selecionar o ambiente cloud.");
  }

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_ENV: config.environment,
    NEXT_PUBLIC_SUPABASE_URL: config.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
  };

  function executar(args) {
    const result = spawnSync(process.execPath, [npm, ...args], {
      cwd: root,
      env,
      stdio: "inherit",
    });

    if (result.error) throw new Error("Não foi possível executar o npm.");
    if (result.status !== 0) process.exit(result.status ?? (result.signal === "SIGINT" ? 130 : 1));
  }

  console.log("Verificando dependências do FixIt…");
  const dependencies = spawnSync(process.execPath, [npm, "ls", "--depth=0", "--silent"], {
    cwd: root,
    env,
    stdio: "ignore",
  });
  if (dependencies.status !== 0) {
    console.log("Instalando dependências pelo lockfile…");
    executar(["ci", "--no-audit", "--no-fund", "--prefer-offline"]);
  }
  console.log("Iniciando Next.js com Supabase cloud. Use Ctrl+C para encerrar.");
  executar(["run", "dev", "--", ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
