import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase.js";
import { profileIsAdmin } from "./profileAdmin.js";

export type AuthedRequest = Request & {
  userId?: string;
  profileId?: string;
  userEmail?: string;
  isAdmin?: boolean;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  req.userId = data.user.id;
  req.userEmail = data.user.email ?? "";
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, is_admin, username, email, auth_email, login_removed, auth_user_id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!profile) {
    const { data: legacyProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, username, email, auth_email, login_removed, auth_user_id")
      .eq("id", data.user.id)
      .maybeSingle();
    profile = legacyProfile;
    if (profile && !profile.auth_user_id) {
      await supabaseAdmin.from("profiles").update({ auth_user_id: data.user.id }).eq("id", profile.id);
      profile.auth_user_id = data.user.id;
    }
  }
  if (!profile || profile.login_removed || !profile.auth_user_id) {
    res.status(401).json({ error: "Account login removed or not found" });
    return;
  }
  req.profileId = profile.id;
  req.isAdmin = profile.is_admin === true || profileIsAdmin(profile, req.userEmail);
  next();
}
