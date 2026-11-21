"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { register, resendVerification } from "@/lib/api-client";
import { GoogleSignIn } from "@/components/google-sign-in";

type RegistrationForm = { displayName: string; username: string; email: string; password: string };

export default function RegisterPage() {
  const [form, setForm] = useState<RegistrationForm>({ displayName: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await register(form);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to create account. Please try again.");
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to register. Please try again.");
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
      const response = await resendVerification(form.email);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "We couldn't process your request. Please try again later.");
      setResendMessage(data.message || "If your account requires verification, we'll send a fresh verification link. Please check your inbox and spam folder.");
    } catch (cause) {
      setResendError(cause instanceof Error ? cause.message : "Unable to resend right now. Please try again later.");
    } finally {
      setResendBusy(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <span className="eyebrow">ONE LAST STEP</span>
          <h1>Check your<br /><em>inbox.</em></h1>
          <p>Your account has been created. If the address is eligible, a verification email has been sent. The link expires in 24 hours. Check your spam folder too.</p>
          <button type="button" className="button button-light auth-submit" onClick={handleResend} disabled={resendBusy}>
            {resendBusy ? "Sending…" : "Resend verification email"}
          </button>
          {resendMessage && <p className="auth-muted" role="status">{resendMessage}</p>}
          {resendError && <p className="auth-error" role="alert">{resendError}</p>}
          <Link className="button button-dark auth-submit" href="/login">Back to sign in</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">START YOUR JOURNEY</span>
        <h1>Find your<br /><em>somewhere.</em></h1>
        <p>Create an account to discover places and connect with travellers.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Full name<input required maxLength={80} value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></label>
          <label>Username<input required minLength={3} maxLength={24} value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label>
          <label>Email address<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label>Password<input type="password" required minLength={10} maxLength={128} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
          <button className="button button-dark auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          {error && <p className="auth-error" role="alert">{error}</p>}
        </form>
        <div className="auth-divider"><span>OR SIGN UP WITH</span></div>
        <GoogleSignIn />
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </div>
  );
}
