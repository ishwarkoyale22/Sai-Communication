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

/**
 * Creates the customer_profiles row for an authenticated user who doesn't
 * have one yet. This is the self-heal path for accounts whose signup
 * happened while email confirmation was pending (no session yet at
 * signUp() time, so the profile insert back then was unauthenticated and
 * rejected by RLS — see signUp() below) — full_name/phone survive that gap
 * in the auth user's own user_metadata (set via signUp's `options.data`),
 * so they're recovered from there once the user actually has a session.
 */
async function ensureProfile(user: User): Promise<CustomerProfile | null> {
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const phone = (user.user_metadata?.phone as string | undefined) ?? "";
  if (!fullName || !phone) return null;
  const { error } = await supabase.from("customer_profiles").insert({
    id: user.id,
    full_name: fullName,
    phone,
    email: user.email ?? null,
  });
  // Ignore a unique-constraint hit (23505) — another tab/request already
  // created it between our fetch and this insert; just re-fetch below.
  if (error && error.code !== "23505") return null;
  return fetchProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Starts neutral on both server and first client render (same reasoning
  // as CartProvider) — Supabase's own client resolves the persisted
  // session asynchronously after mount, so there's nothing to hydrate
  // eagerly here without risking an SSR/client mismatch.
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (user: User | undefined) => {
    if (!user) { setProfile(null); return; }
    const found = await fetchProfile(user.id);
    setProfile(found ?? (await ensureProfile(user)));
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsLoading(false);
      void loadProfile(data.session?.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      void loadProfile(newSession?.user);
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

    // Only insert the profile row now if we actually got a session back
    // (auto-confirm on, or confirmation not required for this project).
    // When email confirmation is pending, signUp() returns a user but NO
    // session — there's no JWT yet, so an insert here is sent unauthenticated
    // and RLS (auth.uid() = id) rejects it with 401, leaving a real auth
    // user with no profile row ("Account created, but we couldn't save your
    // profile"). full_name/phone are already safe in the auth user's own
    // user_metadata (set via `options.data` above), so in that case we skip
    // the insert entirely and let ensureProfile() (AuthContext's loadProfile)
    // create the row the moment this user actually gets a session — right
    // after they confirm their email and log in.
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }

    const { error: profileError } = await supabase.from("customer_profiles").insert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
    });
    if (profileError) {
      // Most likely: phone already registered (unique constraint).
      return {
        error: profileError.code === "23505"
          ? "This mobile number is already registered."
          : "Account created, but we couldn't save your profile. Please contact support.",
        needsEmailConfirmation: false,
      };
    }

    return { error: null, needsEmailConfirmation: false };
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
    await loadProfile(session?.user);
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
