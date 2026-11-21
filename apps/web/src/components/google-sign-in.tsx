"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { googleLogin } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignIn() {
  const ref = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { refreshAuth } = useAuth();

  useEffect(() => {
    if (!scriptReady || !window.google || !ref.current || !clientId) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setLoading(true);
        setError("");
        try {
          const response = await googleLogin(credential);
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body && typeof body.message === "string" ? body.message : "Google sign-in failed. Please try again.");
          }
          if (!(await refreshAuth())) {
            throw new Error("Google sign-in succeeded, but Nomadly could not load your session. Please try again.");
          }
          window.location.assign("/profile");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Google sign-in failed. Please try again.");
          busyRef.current = false;
          setLoading(false);
        }
      },
    });
    ref.current.innerHTML = "";
    window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width: 320 });
  }, [clientId, scriptReady, refreshAuth]);

  return <div className="google-auth-wrap">
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
    {clientId ? <div ref={ref} aria-busy={loading} /> : <p className="auth-muted">Google sign-in is not configured yet.</p>}
    {loading && <p className="auth-muted" role="status">Signing you in…</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </div>;
}
