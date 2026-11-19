"use client";

import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";

const AuthContext = createContext<{
  isSignedIn: boolean | undefined;
  user: { id: string; email?: string } | null;
}>({ isSignedIn: undefined, user: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    isSignedIn: boolean | undefined;
    user: { id: string; email?: string } | null;
  }>({ isSignedIn: undefined, user: null });
  useEffect(() => {
    const client = createAuthBrowserClient();
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active)
        setState({
          isSignedIn: Boolean(data.user?.email_confirmed_at),
          user: data.user,
        });
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active)
        setState({
          isSignedIn: Boolean(session?.user?.email_confirmed_at),
          user: session?.user ?? null,
        });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function useUser() {
  return useContext(AuthContext);
}
export function SignInButton({
  children,
}: {
  children: ReactElement<{ onClick?: () => void }>;
}) {
  return cloneElement(children, {
    onClick: () => {
      window.location.assign(
        `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`,
      );
    },
  });
}
export function SignOutButton({
  children,
  redirectUrl = "/sign-in",
  className = "text-sm underline",
  labels = {
    idle: "Sign out",
    busy: "Signing out…",
    error: "Could not sign out. Try again.",
  },
}: {
  children?: ReactElement<{ onClick?: () => void; disabled?: boolean }>;
  redirectUrl?: string;
  className?: string;
  labels?: { idle: string; busy: string; error: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setBusy(true);
    setError(false);
    const result = await createAuthBrowserClient().auth.signOut();
    if (result.error) {
      setError(true);
      setBusy(false);
      return;
    }
    window.location.assign(redirectUrl);
  }
  return (
    <>
      {children ? (
        cloneElement(children, { onClick: signOut, disabled: busy })
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={signOut}
          className={className}
        >
          {busy ? labels.busy : labels.idle}
        </button>
      )}
      {error ? <span role="alert">{labels.error}</span> : null}
    </>
  );
}
