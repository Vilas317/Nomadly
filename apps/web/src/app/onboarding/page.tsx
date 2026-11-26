"use client";

import "./onboarding.css";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, Heart, Wallet, Languages, MapPin, Sparkles, LoaderCircle, SkipForward } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "SKIPPED" | "COMPLETED";
type Answers = {
  travelStyle: string | null; interests: string[]; budgetMin: number | null; budgetMax: number | null;
  languages: string[]; homeCity: string | null; homeState: string | null; homeCountry: string | null;
};
type Onboarding = { status: Status; currentStep: number; completedAt: string | null; answers: Answers };

const empty: Answers = { travelStyle: null, interests: [], budgetMin: null, budgetMax: null, languages: [], homeCity: null, homeState: null, homeCountry: null };
const stages = [
  { title: "A little about your travel style.", sub: "What kind of journeys make you feel most alive?", icon: Compass },
  { title: "What are you curious about?", sub: "Choose as many interests as you like.", icon: Heart },
  { title: "What feels comfortable?", sub: "Set a typical budget per person, per trip. This is optional.", icon: Wallet },
  { title: "Which languages do you speak?", sub: "Choose the languages you are comfortable using.", icon: Languages },
  { title: "Where do you call home?", sub: "A little context helps us make discoveries more relevant.", icon: MapPin },
  { title: "Your travel profile, at a glance.", sub: "Review your choices. You can change them later.", icon: Sparkles },
];
const styles = ["Adventure", "Backpacking", "Cultural", "Luxury", "Nature", "Road trips", "Slow travel", "Solo travel"];
const interests = ["Mountains", "Beaches", "Photography", "Food", "Culture", "History", "Wildlife", "Trekking", "Architecture", "Festivals", "Road trips", "Local experiences"];
const languageChoices = ["English", "Hindi", "Bengali", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Gujarati", "Punjabi", "Odia"];

function messageOf(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "message" in value) {
    const m = (value as { message?: string | string[] }).message;
    if (Array.isArray(m)) return m.join(" ");
    if (typeof m === "string") return m;
  }
  return fallback;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshAuth } = useAuth();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(empty);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await apiFetch("/profiles/me/onboarding");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageOf(payload, "Unable to load onboarding."));
      const item = (payload as { onboarding?: Onboarding }).onboarding;
      if (!item) throw new Error("The onboarding response was incomplete.");
      if (item.status === "COMPLETED") { router.replace("/profile"); return; }
      setOnboarding(item);
      setStep(Math.max(0, Math.min(5, item.currentStep)));
      setAnswers({ ...empty, ...item.answers });
      setMin(item.answers.budgetMin == null ? "" : String(item.answers.budgetMin));
      setMax(item.answers.budgetMax == null ? "" : String(item.answers.budgetMax));
      setLanguages(item.answers.languages ?? []);
      setCity(item.answers.homeCity ?? ""); setState(item.answers.homeState ?? "");
      setCountry(item.answers.homeCountry ?? "India");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load onboarding."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    void load();
  }, [authLoading, user, load, router]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  async function save(nextStep: number) {
    setSaving(true); setError("");
    const budgetMin = min.trim() === "" ? null : Number(min);
    const budgetMax = max.trim() === "" ? null : Number(max);
    if ((budgetMin !== null && (!Number.isSafeInteger(budgetMin) || budgetMin < 0)) ||
        (budgetMax !== null && (!Number.isSafeInteger(budgetMax) || budgetMax < 0))) {
      setError("Enter valid whole-number budgets, or leave them blank."); setSaving(false); return false;
    }
    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      setError("Minimum budget cannot exceed maximum budget."); setSaving(false); return false;
    }
    try {
      const response = await apiFetch("/profiles/me/onboarding", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: nextStep, travelStyle: answers.travelStyle, interests: answers.interests,
          budgetMin, budgetMax, languages, homeCity: city.trim() || null,
          homeState: state.trim() || null, homeCountry: country.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageOf(payload, "Unable to save your progress."));
      const result = (payload as { onboarding?: Onboarding }).onboarding;
      if (result) setOnboarding(result);
      setAnswers(a => ({ ...a, budgetMin, budgetMax, languages, homeCity: city.trim() || null, homeState: state.trim() || null, homeCountry: country.trim() || null }));
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save your progress."); return false; }
    finally { setSaving(false); }
  }

  async function next() {
    if (step === 0 && !answers.travelStyle) { setError("Choose a travel style, or skip onboarding."); return; }
    if (step < 5) { if (await save(step + 1)) setStep(s => Math.min(5, s + 1)); return; }
    if (!(await save(6))) return;
    setSaving(true);
    try {
      const response = await apiFetch("/profiles/me/onboarding/complete", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageOf(payload, "Unable to complete onboarding."));
      await refreshAuth();
      router.replace("/profile");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete onboarding."); }
    finally { setSaving(false); }
  }

  async function previous() {
    if (step === 0 || saving) return;
    const previousStep = step - 1;
    if (await save(previousStep)) {
      setStep(previousStep);
    }
  }

  async function skip() {
    setSaving(true); setError("");
    try {
      const response = await apiFetch("/profiles/me/onboarding/skip", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageOf(payload, "Unable to skip onboarding."));
      await refreshAuth();
      router.replace("/profile");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to skip onboarding."); }
    finally { setSaving(false); }
  }

  if (authLoading || !user || loading) return <div className="onboarding-loading"><LoaderCircle className="onboarding-spin" /> Preparing your travel profile…</div>;
  if (!onboarding) return <main className="onboarding-shell"><div className="onboarding-error"><h1>We couldn't load onboarding.</h1><p>{error}</p><button className="button button-dark" onClick={() => void load()}>Try again</button></div></main>;

  const Icon = stages[step].icon;
  return <main className="onboarding-shell">
    <header className="onboarding-top"><a href="/" className="onboarding-brand">nomadly<span>.</span></a><button className="onboarding-skip" disabled={saving} onClick={() => void skip()}><SkipForward size={15}/> Skip for now</button></header>
    <section className="onboarding-content">
      <div className="onboarding-progress-meta"><span>GETTING TO KNOW YOU</span><span>{step + 1} OF 6</span></div>
      <div className="onboarding-progress"><span style={{ width: `${(step / 6) * 100}%` }}/></div>
      <div className="onboarding-heading"><div className="onboarding-step-icon"><Icon size={23}/></div><span className="eyebrow">STEP {step + 1}</span><h1>{stages[step].title}</h1><p>{stages[step].sub}</p></div>

      {step === 0 && <div className="onboarding-choice-grid">{styles.map(v => <button key={v} className={`onboarding-choice ${answers.travelStyle === v ? "selected" : ""}`} onClick={() => { setAnswers(a => ({ ...a, travelStyle: v })); setError(""); }}><span>{v}</span>{answers.travelStyle === v && <Check size={17}/>}</button>)}</div>}
      {step === 1 && <><div className="onboarding-selection-note">{answers.interests.length} selected</div><div className="onboarding-chip-grid">{interests.map(v => <button key={v} className={`onboarding-chip ${answers.interests.includes(v) ? "selected" : ""}`} onClick={() => toggle(answers.interests, v, v => setAnswers(a => ({ ...a, interests: v })))}>{answers.interests.includes(v) && <Check size={14}/ >}{v}</button>)}</div></>}
      {step === 2 && <div className="onboarding-budget"><label>Minimum budget (₹)<input type="number" min="0" step="1" value={min} onChange={e => setMin(e.target.value)} placeholder="e.g. 5000"/></label><label>Maximum budget (₹)<input type="number" min="0" step="1" value={max} onChange={e => setMax(e.target.value)} placeholder="e.g. 25000"/></label><p>Leave either field blank if you don't have a fixed budget.</p></div>}
      {step === 3 && <><div className="onboarding-chip-grid">{languageChoices.map(v => <button key={v} className={`onboarding-chip ${languages.includes(v) ? "selected" : ""}`} onClick={() => toggle(languages, v, setLanguages)}>{languages.includes(v) && <Check size={14}/ >}{v}</button>)}</div><div className="onboarding-custom-language"><input value={otherLanguage} onChange={e => setOtherLanguage(e.target.value)} placeholder="Add another language"/><button onClick={() => { const v = otherLanguage.trim(); if (v && !languages.some(x => x.toLowerCase() === v.toLowerCase())) setLanguages(a => [...a, v]); setOtherLanguage(""); }}>Add</button></div></>}
      {step === 4 && <div className="onboarding-location-grid"><label>City<input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Raipur" maxLength={100}/></label><label>State / region<input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Chhattisgarh" maxLength={100}/></label><label className="full">Country<input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. India" maxLength={100}/></label></div>}
      {step === 5 && <div className="onboarding-review">{[["Travel style", answers.travelStyle || "Not set"],["Interests", answers.interests.join(", ") || "Not set"],["Budget", min || max ? `₹${min || "—"} – ₹${max || "—"}` : "Not set"],["Languages", languages.join(", ") || "Not set"],["Home", [city,state,country].filter(Boolean).join(", ") || "Not set"]].map(([k,v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>}
      {error && <p className="onboarding-error-message" role="alert">{error}</p>}
      <footer className="onboarding-footer"><button className="onboarding-back" disabled={step === 0 || saving} onClick={() => void previous()}><ArrowLeft size={16}/> Back</button><button className="button button-dark onboarding-next" disabled={saving} onClick={() => void next()}>{saving ? <LoaderCircle className="onboarding-spin" size={16}/> : step === 5 ? <Check size={16}/> : null}{saving ? "Saving…" : step === 5 ? "Complete profile" : "Continue"}{!saving && step !== 5 && <ArrowRight size={16}/>}</button></footer>
      <p className="onboarding-reassurance">This is optional. You can update your preferences anytime from your profile.</p>
    </section>
  </main>;
}
