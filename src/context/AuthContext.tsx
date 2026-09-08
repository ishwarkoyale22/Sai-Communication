import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type CustomerProfile = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  isLoading: boolean;
  /** Signs in with an email address. */
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Resolves the phone number to an email via the get_email_by_phone RPC, then signs in. */
  signInWithPhone: (phone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: { fullName: string; phone: string; email: string; password: string }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id, full_name, phone, email")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CustomerProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Starts neutral on both server and first client render (same reasoning
  // as CartProvider) — Supabase's own client resolves the persisted
  // session asynchronously after mount, so there's nothing to hydrate
  // eagerly here without risking an SSR/client mismatch.
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) { setProfile(null); return; }
    setProfile(await fetchProfile(userId));
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsLoading(false);
      void loadProfile(data.session?.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      void loadProfile(newSession?.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    const { data: email, error: rpcError } = await supabase.rpc("get_email_by_phone", { p_phone: phone });
    if (rpcError || !email) {
      return { error: "No account found for this mobile number." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email as string, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async ({ fullName, phone, email, password }: { fullName: string; phone: string; email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error.message, needsEmailConfirmation: false };
    if (!data.user) return { error: "Could not create account. Please try again.", needsEmailConfirmation: false };

    // Create the profile row now — works whether or not email confirmation
    // is required, since the signUp call above already returns a session
    // (when auto-confirm is on) or at least a user id (when it isn't) and
    // RLS only requires auth.uid() = id, which the signUp response's JWT
    // satisfies either way.
    const { error: profileError } = await supabase.from("customer_profiles").insert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
    });
    if (profileError) {
      // Most likely: phone already registered (unique constraint) or the
      // session isn't authenticated yet because confirmation is required
      // — either way, surface something actionable instead of silently
      // leaving an auth user with no profile.
      return {
        error: profileError.code === "23505"
          ? "This mobile number is already registered."
          : "Account created, but we couldn't save your profile. Please contact support.",
        needsEmailConfirmation: !data.session,
      };
    }

    return { error: null, needsEmailConfirmation: !data.session };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      ...(typeof window !== "undefined" ? { options: { redirectTo: window.location.origin } } : {}),
    });
    return { error: error?.message ?? null };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      typeof window !== "undefined" ? { redirectTo: window.location.origin } : undefined
    );
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        isLoading,
        signInWithEmail,
        signInWithPhone,
        signUp,
        signInWithGoogle,
        sendPasswordReset,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
