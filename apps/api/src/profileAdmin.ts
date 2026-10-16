import { isAdminEmail } from "./config.js";

export function profileIsAdmin(
  profile: {
    username?: string;
    email?: string | null;
    auth_email?: string | null;
    is_admin?: boolean;
  },
  userEmail?: string,
): boolean {
  if (profile.is_admin === true) return true;
  if (userEmail && isAdminEmail(userEmail)) return true;
  if (profile.auth_email && isAdminEmail(profile.auth_email)) return true;
  if (profile.username && isAdminEmail(profile.username)) return true;
  if (profile.email && isAdminEmail(profile.email)) return true;
  return false;
}
