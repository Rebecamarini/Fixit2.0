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

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  const hasAllowedProtocol = ["http:", "https:"].includes(parsed.protocol);
  const isCompatibleWithEnvironment =
    environment === "local"
      ? isLoopback && hasAllowedProtocol
      : !isLoopback && parsed.protocol === "https:";

  if (!isCompatibleWithEnvironment) {
    throw new Error(
      "URL incompatível com o ambiente: local exige loopback; cloud exige HTTPS fora de loopback."
    );
  }

  const hasExtraUrlParts =
    parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash;

  if (hasExtraUrlParts) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL deve conter apenas a origem, sem credenciais, caminho ou parâmetros."
    );
  }

  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");

  validateSupabasePublishableKey(publishableKey, environment);

  return { environment, url, publishableKey };
}

export function validateSupabasePublishableKey(
  publishableKey: string,
  environment: string | undefined,
) {
  let legacyAnon = false;
  if (publishableKey.startsWith("eyJ")) {
    try {
      const encodedPayload = publishableKey.split(".")[1];
      const base64Payload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64Payload));
      legacyAnon = payload.role === "anon";
    } catch {
      // Chaves malformadas são recusadas abaixo sem imprimir seu conteúdo.
    }
  }

  const isPublishableKey = publishableKey.startsWith("sb_publishable_");
  const isAllowedLegacyKey = environment === "local" && legacyAnon;

  if (!isPublishableKey && !isAllowedLegacyKey) {
    throw new Error(
      "Use uma chave publicável sb_publishable_; apenas local aceita a chave anon legada. Chaves privilegiadas são proibidas."
    );
  }
}
