import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase.js";
import { isAdminEmail } from "./config.js";

export type AuthedRequest = Request & {
  userId?: string;
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
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .single();
  req.isAdmin = Boolean(profile?.is_admin) || isAdminEmail(req.userEmail);
  next();
}
