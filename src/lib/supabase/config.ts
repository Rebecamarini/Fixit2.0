type Environment = Record<string, string | undefined>;

export function getPublicSupabaseConfig() {
  // Referências estáticas permitem ao Next.js incluir apenas estes valores públicos no browser.
  return getSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_ENV: process.env.NEXT_PUBLIC_SUPABASE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getSupabaseConfig(env: Environment) {
  const environment = env.NEXT_PUBLIC_SUPABASE_ENV;
  if (environment !== "local" && environment !== "cloud") {
    throw new Error("NEXT_PUBLIC_SUPABASE_ENV deve ser local ou cloud.");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (environment === "local" ? !loopback || !["http:", "https:"].includes(parsed.protocol) : loopback || parsed.protocol !== "https:") {
    throw new Error("URL incompatível com o ambiente: local exige loopback; cloud exige HTTPS fora de loopback.");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve conter apenas a origem, sem credenciais, caminho ou parâmetros.");
  }
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  let legacyAnon = false;
  if (publishableKey.startsWith("eyJ")) {
    try {
      legacyAnon = JSON.parse(atob(publishableKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "anon";
    } catch {
      // Chaves malformadas são recusadas abaixo sem imprimir seu conteúdo.
    }
  }
  if (!publishableKey.startsWith("sb_publishable_") && !(environment === "local" && legacyAnon)) {
    throw new Error("Use uma chave publicável sb_publishable_; apenas local aceita a chave anon legada. Chaves privilegiadas são proibidas.");
  }
  return { environment, url, publishableKey };
}
