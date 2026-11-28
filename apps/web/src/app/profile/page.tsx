"use client";

import { ProfileAvatarControl } from "@/components/profile-avatar-control";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Camera, Globe2, MapPin, Settings, UserRound, LoaderCircle, Check,
  AlertCircle, Plane, Save, X, MapPinned,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

type Visibility = "PUBLIC" | "PRIVATE";
type Profile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  homeCity: string | null;
  homeState: string | null;
  homeCountry: string | null;
  visibility: Visibility;
  travelStyle: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  languages: string[];
  interests: string[];
  onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "SKIPPED" | "COMPLETED";
  onboardingStep: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProfileForm = {
  username: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeState: string;
  homeCountry: string;
  travelStyle: string;
  budgetMin: string;
  budgetMax: string;
  languages: string;
  interests: string;
  visibility: Visibility;
};

const emptyForm: ProfileForm = {
  username: "", displayName: "", bio: "", homeCity: "", homeState: "",
  homeCountry: "", travelStyle: "", budgetMin: "", budgetMax: "",
  languages: "", interests: "", visibility: "PUBLIC",
};

function toForm(profile: Profile): ProfileForm {
  return {
    username: profile.username ?? "",
    displayName: profile.displayName ?? "",
    bio: profile.bio ?? "",
    homeCity: profile.homeCity ?? "",
    homeState: profile.homeState ?? "",
    homeCountry: profile.homeCountry ?? "",
    travelStyle: profile.travelStyle ?? "",
    budgetMin: profile.budgetMin == null ? "" : String(profile.budgetMin),
    budgetMax: profile.budgetMax == null ? "" : String(profile.budgetMax),
    languages: (profile.languages ?? []).join(", "),
    interests: (profile.interests ?? []).join(", "),
    visibility: profile.visibility ?? "PUBLIC",
  };
}

function splitList(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/profiles/me", { method: "GET" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Unable to load your profile."));
      const nextProfile = (payload as { profile?: Profile }).profile;
      if (!nextProfile) throw new Error("The profile response was incomplete.");
      setProfile(nextProfile);
      setForm(toForm(nextProfile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const location = useMemo(
    () => [profile?.homeCity, profile?.homeState, profile?.homeCountry].filter(Boolean).join(", "),
    [profile],
  );

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    if (profile) setForm(toForm(profile));
    setEditing(false);
    setError("");
    setSuccess("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const min = form.budgetMin.trim() === "" ? null : Number(form.budgetMin);
    const max = form.budgetMax.trim() === "" ? null : Number(form.budgetMax);
    if ((min !== null && (!Number.isInteger(min) || min < 0)) ||
        (max !== null && (!Number.isInteger(max) || max < 0))) {
      setError("Travel budgets must be non-negative whole numbers.");
      setSaving(false);
      return;
    }
    if (min !== null && max !== null && min > max) {
      setError("Minimum budget cannot exceed maximum budget.");
      setSaving(false);
      return;
    }

    const body = {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      bio: form.bio.trim() || null,
      homeCity: form.homeCity.trim() || null,
      homeState: form.homeState.trim() || null,
      homeCountry: form.homeCountry.trim() || null,
      travelStyle: form.travelStyle || null,
      budgetMin: min,
      budgetMax: max,
      languages: splitList(form.languages),
      interests: splitList(form.interests),
      visibility: form.visibility,
    };

    try {
      const response = await apiFetch("/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Unable to save your profile."));
      const updated = (payload as { profile?: Profile }).profile;
      if (!updated) throw new Error("The server saved the profile but returned an incomplete response.");
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSuccess("Your profile has been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const optionalPreferenceCount = profile
    ? [
        profile.interests.length > 0,
        profile.budgetMin != null || profile.budgetMax != null,
        profile.languages.length > 0,
        Boolean(profile.homeCity || profile.homeState || profile.homeCountry),
      ].filter(Boolean).length
    : 0;
  const onboardingNeedsAttention = profile && profile.onboardingStatus !== "COMPLETED";

  const initials = (profile?.displayName || user?.profile?.displayName || "N")
    .trim().charAt(0).toUpperCase();

  return (
    <div className="page-stack profile-page">
      <section className="page-intro">
        <span className="eyebrow">YOUR TRAVEL IDENTITY</span>
        <h1>Your story, in places.</h1>
        <p>A home for your travel interests, journeys and memories.</p>
      </section>

      {profile && (
        <section className="profile-onboarding-card" aria-label="Travel profile setup">
          <div className="profile-onboarding-copy">
            <span className="eyebrow">TRAVEL PROFILE SETUP</span>
            <h2>{profile.onboardingStatus === "COMPLETED" ? "Your travel preferences are set." : "Make your travel profile more useful."}</h2>
            <p>
              <strong>Required:</strong> travel style {profile.travelStyle ? "is set" : "still needs to be chosen"}.
              <span> Optional preferences: {optionalPreferenceCount} of 4 added (interests, budget, languages and home location).</span>
            </p>
          </div>
          <div className="profile-onboarding-action">
            <span className={`profile-onboarding-status ${profile.onboardingStatus === "COMPLETED" ? "is-complete" : ""}`}>
              {profile.onboardingStatus === "COMPLETED" ? "Completed" : profile.onboardingStatus === "IN_PROGRESS" ? "In progress" : profile.onboardingStatus === "SKIPPED" ? "Skipped" : "Not started"}
            </span>
            {onboardingNeedsAttention && (
              <a className="button button-dark" href="/onboarding">
                {profile.onboardingStatus === "IN_PROGRESS" ? "Resume setup" : profile.onboardingStatus === "SKIPPED" ? "Set up preferences" : "Get started"}
              </a>
            )}
          </div>
        </section>
      )}

      {error && (
        <div className="profile-alert profile-alert-error" role="alert">
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="profile-alert profile-alert-success" role="status">
          <Check size={17} /> <span>{success}</span>
        </div>
      )}

      <section className="profile-card">
        <div className="profile-cover" />
        <div className="profile-main">
          {profile && (
  <ProfileAvatarControl
    avatarUrl={profile.avatarUrl}
    initials={initials}
    onAvatarChange={(avatarUrl) =>
      setProfile((current) =>
        current ? { ...current, avatarUrl } : current
      )
    }
  />
)}
          <div className="profile-actions">
            {!editing ? (
              <button className="button button-outline" onClick={() => { setEditing(true); setSuccess(""); }} disabled={loading || !profile}>
                <Settings size={15} /> Edit profile
              </button>
            ) : (
              <button className="button button-outline" onClick={cancelEditing} disabled={saving}>
                <X size={15} /> Cancel
              </button>
            )}
          </div>

          {loading ? (
            <div className="profile-loading"><LoaderCircle className="spin" size={20} /> Loading your profile…</div>
          ) : !profile ? (
            <div className="profile-load-error">
              <h2>We couldn't load your profile.</h2>
              <button className="button button-dark" onClick={() => void loadProfile()}>Try again</button>
            </div>
          ) : editing ? (
            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-form-heading">
                <div><span className="eyebrow">PROFILE SETTINGS</span><h2>Make it yours.</h2><p className="muted">Tell fellow travellers a little about you.</p></div>
                <span className="profile-private-note"><Globe2 size={14} /> {form.visibility === "PUBLIC" ? "Public profile" : "Private profile"}</span>
              </div>

              <div className="profile-form-grid">
                <label>Display name<input value={form.displayName} maxLength={80} onChange={(e) => updateField("displayName", e.target.value)} required /></label>
                <label>Username<input value={form.username} maxLength={24} onChange={(e) => updateField("username", e.target.value.toLowerCase())} required autoComplete="username" /><small>Use letters, numbers and underscores.</small></label>
                <label className="profile-field-wide">About you<textarea value={form.bio} maxLength={500} rows={4} placeholder="A few words about the places and experiences you love…" onChange={(e) => updateField("bio", e.target.value)} /><small>{form.bio.length}/500 characters</small></label>
                <label>Home city<input value={form.homeCity} maxLength={80} onChange={(e) => updateField("homeCity", e.target.value)} placeholder="e.g. Bilaspur" /></label>
                <label>State / region<input value={form.homeState} maxLength={80} onChange={(e) => updateField("homeState", e.target.value)} placeholder="e.g. Chhattisgarh" /></label>
                <label>Country<input value={form.homeCountry} maxLength={80} onChange={(e) => updateField("homeCountry", e.target.value)} placeholder="e.g. India" /></label>
                <label>Travel style
                  <select value={form.travelStyle} onChange={(e) => updateField("travelStyle", e.target.value)}>
                    <option value="">Choose your style</option>
                    {["Adventure", "Backpacking", "Cultural", "Luxury", "Nature", "Road trips", "Slow travel", "Solo travel"].map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                </label>
                <label>Minimum travel budget (₹)<input type="number" min="0" step="1" value={form.budgetMin} onChange={(e) => updateField("budgetMin", e.target.value)} placeholder="e.g. 5000" /></label>
                <label>Maximum travel budget (₹)<input type="number" min="0" step="1" value={form.budgetMax} onChange={(e) => updateField("budgetMax", e.target.value)} placeholder="e.g. 25000" /></label>
                <label className="profile-field-wide">Languages <input value={form.languages} onChange={(e) => updateField("languages", e.target.value)} placeholder="English, Hindi (separate with commas)" /><small>Separate each language with a comma.</small></label>
                <label className="profile-field-wide">Travel interests <input value={form.interests} onChange={(e) => updateField("interests", e.target.value)} placeholder="Mountains, Photography, Culture" /><small>Separate each interest with a comma.</small></label>
                <label className="profile-field-wide">Profile visibility
                  <select value={form.visibility} onChange={(e) => updateField("visibility", e.target.value as Visibility)}>
                    <option value="PUBLIC">Public — discoverable by other travellers</option>
                    <option value="PRIVATE">Private — keep my profile private</option>
                  </select>
                  <small>Public profile discovery will be implemented in a later milestone.</small>
                </label>
              </div>
              <div className="profile-form-footer">
                <span className="muted">Your email address is not editable here.</span>
                <button className="button button-dark" type="submit" disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2>{profile.displayName || "Your Nomadly profile"}</h2>
              <p className="profile-handle">@{profile.username}</p>
              <p className="muted profile-bio">{profile.bio || "Complete your profile to help other travellers get to know you."}</p>
              <div className="profile-detail-row">
                <span><MapPin size={15} /> {location || "Add your home city"}</span>
                <span><Plane size={15} /> {profile.travelStyle || "Your travel style will appear here"}</span>
                <span><Globe2 size={15} /> {profile.visibility === "PRIVATE" ? "Private profile" : "Public profile"}</span>
              </div>
              <div className="profile-stats">
                <span><strong>0</strong> Trips</span><span><strong>0</strong> Places</span><span><strong>0</strong> Connections</span>
              </div>
              <div className="profile-interests">
                <span><Globe2 size={16} /> {profile.interests.length ? profile.interests.join(" · ") : "Travel interests will appear here"}</span>
                <span><MapPinned size={16} /> {location || "Add your home city"}</span>
                <span><Camera size={16} /> Your travel journal will live here</span>
              </div>
              {(profile.languages.length > 0 || profile.budgetMin != null || profile.budgetMax != null) && (
                <div className="profile-extra">
                  {profile.languages.length > 0 && <p><strong>Languages</strong> {profile.languages.join(" · ")}</p>}
                  {(profile.budgetMin != null || profile.budgetMax != null) && <p><strong>Travel budget</strong> {profile.budgetMin == null ? "No minimum" : `₹${profile.budgetMin.toLocaleString("en-IN")}`} – {profile.budgetMax == null ? "No maximum" : `₹${profile.budgetMax.toLocaleString("en-IN")}`}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
