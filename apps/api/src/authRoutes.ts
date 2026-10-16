import type { Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { profileIsAdmin } from "./profileAdmin.js";
import { getSupabaseAdmin } from "./supabase.js";
import type { AuthedRequest } from "./auth.js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function syntheticAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@auth.livlyf.app`;
}

async function resolveAuthEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();
  if (!id) return null;
  const admin = getSupabaseAdmin();

  if (id.includes("@")) {
    const lower = id.toLowerCase();
    const { data: byAuth } = await admin.from("profiles").select("auth_email").eq("auth_email", lower).maybeSingle();
    if (byAuth?.auth_email) return byAuth.auth_email;
    const { data: byContact } = await admin.from("profiles").select("auth_email").eq("email", lower).maybeSingle();
    if (byContact?.auth_email) return byContact.auth_email;
    return lower;
  }

  const { data } = await admin.from("profiles").select("auth_email").eq("username", normalizeUsername(id)).maybeSingle();
  return data?.auth_email ?? null;
}

export async function signUp(req: AuthedRequest, res: Response) {
  const { username, password, firstName, lastName, email, phone } = req.body as {
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  const user = normalizeUsername(username ?? "");
  if (!USERNAME_RE.test(user)) {
    res.status(400).json({ error: "Username must be 3–24 characters: letters, numbers, underscore." });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: taken } = await admin.from("profiles").select("id").eq("username", user).maybeSingle();
  if (taken) {
    res.status(409).json({ error: "Username already taken." });
    return;
  }

  const contactEmail = email?.trim() || null;
  const authEmail = contactEmail?.toLowerCase() ?? syntheticAuthEmail(user);

  if (contactEmail) {
    const { data: emailUsed } = await admin.from("profiles").select("id").eq("email", contactEmail.toLowerCase()).maybeSingle();
    if (emailUsed) {
      res.status(409).json({ error: "Email already in use." });
      return;
    }
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      username: user,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      contact_email: contactEmail,
    },
  });

  if (error || !created.user) {
    res.status(400).json({ error: error?.message ?? "Sign up failed" });
    return;
  }

  const grantAdmin = profileIsAdmin({ username: user, email: contactEmail }, authEmail);
  await admin
    .from("profiles")
    .update({
      username: user,
      auth_email: authEmail,
      email: contactEmail,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      display_name: [firstName, lastName].filter(Boolean).join(" ") || user,
      login_removed: false,
      ...(grantAdmin ? { is_admin: true } : {}),
    })
    .eq("auth_user_id", created.user.id);

  const anon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await anon.auth.signInWithPassword({ email: authEmail, password });
  if (session.error || !session.data.session) {
    res.status(201).json({ ok: true, message: "Account created. Sign in with your username." });
    return;
  }

  res.status(201).json({
    access_token: session.data.session.access_token,
    refresh_token: session.data.session.refresh_token,
  });
}

export async function signIn(req: AuthedRequest, res: Response) {
  const { identifier, password } = req.body as { identifier?: string; password?: string };
  if (!identifier?.trim() || !password) {
    res.status(400).json({ error: "Username or email and password required." });
    return;
  }

  const authEmail = await resolveAuthEmail(identifier);
  if (!authEmail) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  if (!config.supabaseAnonKey) {
    res.status(503).json({ error: "SUPABASE_ANON_KEY not configured on API." });
    return;
  }

  const anon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email: authEmail, password });
  if (error || !data.session) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, is_admin, username, email")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profile && profileIsAdmin(profile, data.user.email ?? "") && !profile.is_admin) {
    await admin.from("profiles").update({ is_admin: true }).eq("id", profile.id);
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

export async function deleteAccount(req: AuthedRequest, res: Response) {
  const profileId = req.profileId!;
  const { removeUserLogin } = await import("./adminRoutes.js");
  try {
    await removeUserLogin(profileId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Delete failed" });
  }
}

export async function checkUsername(req: AuthedRequest, res: Response) {
  const name = normalizeUsername((req.query.username as string) ?? "");
  if (!USERNAME_RE.test(name)) {
    res.json({ available: false });
    return;
  }
  const { data } = await getSupabaseAdmin().from("profiles").select("id").eq("username", name).maybeSingle();
  res.json({ available: !data });
}
