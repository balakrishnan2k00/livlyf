import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export type MeProfile = {
  username?: string;
  is_admin?: boolean;
  email?: string | null;
};

export function useMeState() {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId || !token) {
      setIsAdmin(false);
      setProfile(null);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    (async () => {
      let nextProfile: MeProfile | null = null;
      let admin = false;

      try {
        const m = await apiGet<{ isAdmin: boolean; profile?: MeProfile | null }>("/api/me");
        nextProfile = m.profile ?? null;
        admin = Boolean(m.isAdmin || nextProfile?.is_admin);
      } catch {
        /* API may be down or session not accepted — fall back to Supabase profile */
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select("username, is_admin, email")
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();

      if (!error && row) {
        admin = admin || row.is_admin === true;
        nextProfile = {
          username: nextProfile?.username ?? row.username ?? undefined,
          is_admin: nextProfile?.is_admin ?? row.is_admin,
          email: nextProfile?.email ?? row.email,
        };
      }

      if (!cancelled) {
        setProfile(nextProfile);
        setIsAdmin(admin);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.access_token]);

  return { isAdmin, profile, ready };
}
