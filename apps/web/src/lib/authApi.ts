import { supabase } from "./supabase";
import { apiDelete, apiGet, apiPost } from "./api";

type SessionTokens = { access_token: string; refresh_token: string };

export async function loginWithIdentifier(identifier: string, password: string) {
  const tokens = await apiPost<SessionTokens>("/api/auth/login", { identifier, password });
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw error;
}

export async function signUpAccount(input: {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}) {
  const res = await apiPost<SessionTokens & { ok?: boolean; message?: string }>("/api/auth/signup", {
    username: input.username,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
  });
  if (res.access_token && res.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    if (error) throw error;
  }
  return res;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const r = await apiGet<{ available: boolean }>(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
  return r.available;
}

export async function deleteMyAccount() {
  await apiDelete("/api/account");
  await supabase.auth.signOut();
}
