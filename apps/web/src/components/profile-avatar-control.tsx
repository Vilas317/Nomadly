 "use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Camera, LoaderCircle, Minus, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import "./profile-avatar-controls.css";

type Props = {
  avatarUrl: string | null;
  initials: string;
  onAvatarChange: (avatarUrl: string | null) => void;
};
type ProfileResponse = {
  profile?: { avatarUrl?: string | null };
  message?: string | string[];
};

const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function messageOf(payload: ProfileResponse, fallback: string) {
  if (Array.isArray(payload.message)) return payload.message.join(" ");
  return typeof payload.message === "string" ? payload.message : fallback;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read this image. Please choose another file."));
    image.src = url;
  });
}

async function cropToFile(url: string, crop: Area, rotation: number): Promise<File> {
  const image = await loadImage(url);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = Math.floor(image.width * cos + image.height * sin);
  const height = Math.floor(image.width * sin + image.height * cos);

  const rotated = document.createElement("canvas");
  rotated.width = width;
  rotated.height = height;
  const rotatedContext = rotated.getContext("2d");
  if (!rotatedContext) throw new Error("Your browser could not prepare this image.");
  rotatedContext.translate(width / 2, height / 2);
  rotatedContext.rotate(radians);
  rotatedContext.drawImage(image, -image.width / 2, -image.height / 2);

  const output = document.createElement("canvas");
  output.width = 512;
  output.height = 512;
  const context = output.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, 512, 512);

  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to process this image.")), "image/jpeg", 0.9);
  });
  return new File([blob], "profile-avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

export function ProfileAvatarControl({ avatarUrl, initials, onAvatarChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function closeEditor() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCropPixels(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function chooseFile(file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Your image must be 5 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCropPixels(null);
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await apiFetch("/profiles/me/avatar", { method: "POST", body: data });
      const payload = await response.json().catch(() => ({})) as ProfileResponse;
      if (!response.ok) throw new Error(messageOf(payload, "Unable to upload your profile photo."));
      if (!payload.profile || !("avatarUrl" in payload.profile)) {
        throw new Error("The upload succeeded but the server returned an incomplete profile.");
      }
      onAvatarChange(payload.profile.avatarUrl ?? null);
      closeEditor();
      setNotice("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload your profile photo.");
    } finally {
      setBusy(false);
    }
  }

  async function savePhoto() {
    if (!previewUrl || !cropPixels || busy) return;
    setBusy(true);
    setError("");
    try {
      const file = await cropToFile(previewUrl, cropPixels, rotation);
      if (file.size > MAX_SIZE) throw new Error("The cropped image is larger than 5 MB. Try a smaller image.");
      await upload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to prepare your profile photo.");
      setBusy(false);
    }
  }

  async function removeAvatar() {
    if (!avatarUrl || busy || !window.confirm("Remove your profile photo?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch("/profiles/me/avatar", { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as ProfileResponse;
      if (!response.ok) throw new Error(messageOf(payload, "Unable to remove your profile photo."));
      onAvatarChange(payload.profile?.avatarUrl ?? null);
      setNotice("Profile photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove your profile photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-avatar-control">
      <div className="profile-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="Your profile photo" /> : <span>{initials || "N"}</span>}
        <button type="button" className="profile-avatar-edit" aria-label="Upload profile photo"
          title="Upload profile photo" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <LoaderCircle className="spin" size={15} /> : <Camera size={15} />}
        </button>
      </div>

      <input ref={inputRef} className="profile-avatar-input" type="file"
        accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile photo"
        disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0])} />

      <div className="profile-avatar-tools">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={13} /> {avatarUrl ? "Change photo" : "Add photo"}
        </button>
        {avatarUrl && <button type="button" onClick={() => void removeAvatar()} disabled={busy}>
          <Trash2 size={13} /> Remove
        </button>}
      </div>

      <p className="profile-avatar-hint">JPEG, PNG or WebP · Max 5 MB</p>
      {error && <p className="profile-avatar-message is-error" role="alert"><X size={13} />{error}</p>}
      {notice && <p className="profile-avatar-message is-success" role="status">{notice}</p>}

      {previewUrl && (
        <div className="profile-avatar-crop-backdrop">
          <section className="profile-avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
            <header className="profile-avatar-crop-header">
              <div>
                <h2 id="avatar-crop-title">Adjust your photo</h2>
                <p>Move and zoom to frame your profile picture.</p>
              </div>
              <button type="button" className="profile-avatar-crop-close" aria-label="Cancel photo editing"
                onClick={closeEditor} disabled={busy}><X size={19} /></button>
            </header>
            <div className="profile-avatar-cropper">
              <Cropper image={previewUrl} crop={crop} zoom={zoom} rotation={rotation}
                aspect={1} cropShape="round" showGrid={false} restrictPosition
                onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
                onCropComplete={(_, pixels) => setCropPixels(pixels)} />
            </div>
            <div className="profile-avatar-crop-controls">
              <label htmlFor="profile-avatar-zoom">Zoom</label>
              <button type="button" aria-label="Zoom out" disabled={busy || zoom <= 1}
                onClick={() => setZoom((v) => Math.max(1, Number((v - .1).toFixed(2))))}><Minus size={15} /></button>
              <input id="profile-avatar-zoom" type="range" min={1} max={3} step={.1}
                value={zoom} disabled={busy} onChange={(e) => setZoom(Number(e.target.value))} />
              <button type="button" aria-label="Zoom in" disabled={busy || zoom >= 3}
                onClick={() => setZoom((v) => Math.min(3, Number((v + .1).toFixed(2))))}><Plus size={15} /></button>
            </div>
            <div className="profile-avatar-crop-rotation">
              <span>Rotation: {rotation}°</span>
              <button type="button" disabled={busy} onClick={() => setRotation((v) => (v + 90) % 360)}>
                <RotateCcw size={14} /> Rotate 90°
              </button>
            </div>
            <footer className="profile-avatar-crop-actions">
              <button type="button" className="profile-avatar-cancel" onClick={closeEditor} disabled={busy}>Cancel</button>
              <button type="button" className="profile-avatar-save" onClick={() => void savePhoto()}
                disabled={busy || !cropPixels}>
                {busy ? <><LoaderCircle className="spin" size={15} /> Saving…</> : "Save photo"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
