import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthError = "invalid_input" | "invalid_credentials" | "not_authenticated" | "profile_missing" | "profile_inactive" | "profile_creation_failed" | "signup_failed" | "unavailable";
export type Profile = { id: string; nome: string; papel: "cliente" | "gestor" | "manutentor"; ativo: boolean; created_at: string };
export type AuthResult = { ok: true; user: { id: string; email: string | undefined }; profile: Profile } | { ok: false; error: AuthError };
const failure = (error: AuthError): AuthResult => ({ ok: false, error });

function credentials(input: unknown, signup: boolean): input is { nome: string; email: string; password: string } {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  const keys = signup ? ["nome", "email", "password"] : ["email", "password"];
  if (Object.keys(value).some(key => !keys.includes(key))) return false;
  return typeof value.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())
    && typeof value.password === "string" && value.password.length > 0
    && (!signup || (typeof value.nome === "string" && value.nome.trim().length > 0 && [...value.nome].length <= 120));
}

function providerError(error: { code?: string; status?: number }, signup = false): AuthResult {
  if (error.code === "invalid_credentials") return failure("invalid_credentials");
  if (signup && error.code === "unexpected_failure") return failure("profile_creation_failed");
  if (error.code === "user_already_exists") return failure("signup_failed");
  if (error.code === "weak_password" || error.code === "email_address_invalid" || error.code === "validation_failed") return failure("invalid_input");
  if (error.status === 429) return failure("unavailable");
  if (error.status && error.status < 500) return failure(signup ? "signup_failed" : "invalid_credentials");
  return failure("unavailable");
}

export function createAuth(client: SupabaseClient) {
  async function context(): Promise<AuthResult> {
    try {
      const { data, error } = await client.auth.getUser();
      if (error) {
        if (["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"].includes(error.code ?? "") || error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403) return failure("not_authenticated");
        return failure("unavailable");
      }
      if (!data.user) return failure("not_authenticated");
      const profile = await client.from("profiles").select("id,nome,papel,ativo,created_at").eq("id", data.user.id).maybeSingle();
      if (profile.error) return failure("unavailable");
      if (!profile.data) return failure("profile_missing");
      if (!profile.data.ativo) return failure("profile_inactive");
      return { ok: true, user: { id: data.user.id, email: data.user.email }, profile: profile.data as Profile };
    } catch {
      return failure("unavailable");
    }
  }
  return {
    context,
    async signUp(input: unknown): Promise<AuthResult> {
      if (!credentials(input, true)) return failure("invalid_input");
      try {
        const { data, error } = await client.auth.signUp({ email: input.email.trim(), password: input.password, options: { data: { nome: input.nome.trim() } } });
        if (error) return providerError(error, true);
        if (!data.session) return failure("signup_failed");
        return await context();
      } catch {
        return failure("unavailable");
      }
    },
    async signIn(input: unknown): Promise<AuthResult> {
      if (!credentials(input, false)) return failure("invalid_input");
      try {
        const { error } = await client.auth.signInWithPassword({ email: input.email.trim(), password: input.password });
        if (error) return providerError(error);
        return await context();
      } catch {
        return failure("unavailable");
      }
    },
    async signOut(): Promise<{ ok: true } | { ok: false; error: AuthError }> {
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        return error ? { ok: false, error: "unavailable" } : { ok: true };
      } catch {
        return { ok: false, error: "unavailable" };
      }
    },
  };
}
