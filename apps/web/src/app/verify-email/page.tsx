"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api-client";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const started = useRef(false);
  const [status, setStatus] = useState("Verifying your email…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setStatus("This verification link is missing its token.");
      return;
    }

    let active = true;
    verifyEmail(token)
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "This verification link is invalid, expired, or already used.");
        if (active) {
          setOk(true);
          setStatus("Your email is verified. Welcome to Nomadly!");
        }
      })
      .catch(cause => {
        if (active) setStatus(cause instanceof Error ? cause.message : "Verification failed. Please try again.");
      });

    return () => { active = false; };
  }, [token]);

  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>{ok ? "You're all set." : "Almost there."}</h1>
        <p role="status" aria-live="polite">{status}</p>
        <Link className="button button-dark auth-submit" href="/login">Continue to sign in</Link>
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="auth-page"><section className="auth-card"><p>Loading verification…</p></section></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
