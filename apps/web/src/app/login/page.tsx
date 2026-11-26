"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { login, resendVerification } from "@/lib/api-client";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const { refreshAuth } = useAuth();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setResendMessage("");
    setResendError("");
    try {
      const response = await login(email, password);
      if (!response.ok) throw new Error("Email or password is incorrect.");
      const data = await response.json();
      const currentUser = await refreshAuth();
      if (!currentUser) throw new Error("Sign-in succeeded, but Nomadly could not load your session. Please try again.");
      if (data.user?.emailVerified === false) {
        setUnverified(true);
        setNotice("Your email address is not verified yet. You can still use Nomadly, but verifying it helps secure your account.");
        return;
      }
      const status = currentUser.profile?.onboardingStatus;
      window.location.assign(status === "NOT_STARTED" || status === "IN_PROGRESS" ? "/onboarding" : "/profile");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (resendBusy) return;
    setResendBusy(true);
    setResendMessage("");
    setResendError("");
    try {
      const response = await resendVerification(email);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "We couldn't process your request. Please try again later.");
      setResendMessage(data.message || "If your account requires verification, we'll send a fresh verification link. Please check your inbox and spam folder.");
    } catch (cause) {
      setResendError(cause instanceof Error ? cause.message : "Unable to resend right now. Please try again later.");
    } finally {
      setResendBusy(false);
    }
  }

  return <div className="auth-page">
    <section className="auth-card">
      <span className="eyebrow">WELCOME BACK</span>
      <h1>Good to have<br /><em>you here.</em></h1>
      <p>Sign in to continue planning your next story.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Email address<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-muted" role="status">{notice}</p>}
        {unverified && <>
          <button type="button" className="button button-light auth-submit" onClick={handleResend} disabled={resendBusy || !email.trim()}>{resendBusy ? "Sending…" : "Resend verification email"}</button>
          {resendMessage && <p className="auth-muted" role="status">{resendMessage}</p>}
          {resendError && <p className="auth-error" role="alert">{resendError}</p>}
        </>}
      </form>
      <div className="auth-divider"><span>OR CONTINUE WITH</span></div>
      <GoogleSignIn />
      <p className="auth-switch">New to Nomadly? <Link href="/register">Create an account</Link></p>
    </section>
  </div>;
}
