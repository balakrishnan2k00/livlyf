import type { Response } from "express";
import { getSupabaseAdmin } from "./supabase.js";
import type { AuthedRequest } from "./auth.js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function syntheticAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@auth.livlyf.app`;
}

/** Remove login only; profile + usage rows stay. */
export async function removeUserLogin(profileId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("id, auth_user_id, username").eq("id", profileId).single();
  if (!profile) throw new Error("User not found");

  if (profile.auth_user_id) {
    await admin.auth.admin.deleteUser(profile.auth_user_id);
  }

  await admin
    .from("profiles")
    .update({
      auth_user_id: null,
      auth_email: null,
      login_removed: true,
      username: profile.username?.startsWith("removed_") ? profile.username : `removed_${profile.id.slice(0, 8)}`,
    })
    .eq("id", profileId);
}

export async function listUsers(_req: AuthedRequest, res: Response) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, username, email, first_name, last_name, phone, is_admin, login_removed, auth_user_id, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    users: (data ?? []).map((u) => ({
      ...u,
      hasLogin: Boolean(u.auth_user_id) && !u.login_removed,
    })),
  });
}

export async function createUser(req: AuthedRequest, res: Response) {
  const { username, password, firstName, lastName, email, phone, isAdmin } = req.body as {
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isAdmin?: boolean;
  };

  const user = normalizeUsername(username ?? "");
  if (!USERNAME_RE.test(user)) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password min 6 chars" });
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: taken } = await admin.from("profiles").select("id").eq("username", user).maybeSingle();
  if (taken) {
    res.status(409).json({ error: "Username taken" });
    return;
  }

  const contactEmail = email?.trim() || null;
  const authEmail = contactEmail?.toLowerCase() ?? syntheticAuthEmail(user);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      username: user,
      first_name: firstName,
      last_name: lastName,
      phone,
      contact_email: contactEmail,
    },
  });
  if (error || !created.user) {
    res.status(400).json({ error: error?.message ?? "Create failed" });
    return;
  }

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
      is_admin: Boolean(isAdmin),
      login_removed: false,
    })
    .eq("auth_user_id", created.user.id);

  res.status(201).json({ ok: true });
}

export async function updateUser(req: AuthedRequest, res: Response) {
  const profileId = String(req.params.id);
  const { username, isAdmin, firstName, lastName, email, phone, password } = req.body as {
    username?: string;
    isAdmin?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
  };

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!profile) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (typeof firstName === "string") updates.first_name = firstName.trim() || null;
  if (typeof lastName === "string") updates.last_name = lastName.trim() || null;
  if (typeof email === "string") updates.email = email.trim() || null;
  if (typeof phone === "string") updates.phone = phone.trim() || null;
  if (typeof isAdmin === "boolean") updates.is_admin = isAdmin;

  if (username) {
    const u = normalizeUsername(username);
    if (!USERNAME_RE.test(u)) {
      res.status(400).json({ error: "Invalid username" });
      return;
    }
    const { data: clash } = await admin.from("profiles").select("id").eq("username", u).neq("id", profileId).maybeSingle();
    if (clash) {
      res.status(409).json({ error: "Username taken" });
      return;
    }
    updates.username = u;
  }

  if (Object.keys(updates).length) {
    await admin.from("profiles").update(updates).eq("id", profileId);
  }

  if (password && password.length >= 6 && profile.auth_user_id) {
    await admin.auth.admin.updateUserById(profile.auth_user_id, { password });
  }

  res.json({ ok: true });
}

export async function deleteUserLogin(req: AuthedRequest, res: Response) {
  const profileId = String(req.params.id);
  if (profileId === req.profileId) {
    res.status(400).json({ error: "Use Profile page to delete your own account" });
    return;
  }
  try {
    await removeUserLogin(profileId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Delete failed" });
  }
}

export async function adminUsage(_req: AuthedRequest, res: Response) {
  const admin = getSupabaseAdmin();
  const { data: runs, error } = await admin
    .from("ai_runs")
    .select("id, user_id, role_key, status, cost_cents, created_at, completed_at, output_text, is_admin_run")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const userIds = [...new Set((runs ?? []).map((r) => r.user_id))];
  const { data: profiles } = await admin.from("profiles").select("id, username, display_name, login_removed").in("id", userIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  res.json({
    runs: (runs ?? []).map((r) => ({
      ...r,
      user: byId.get(r.user_id) ?? { username: "unknown", display_name: null, login_removed: true },
    })),
  });
}
