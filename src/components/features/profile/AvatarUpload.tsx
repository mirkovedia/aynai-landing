"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface AvatarUploadProps {
  userId: string;
  value: string | null;
  onChange: (url: string) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Sube el avatar a Storage (avatars/{userId}/avatar.ext) y devuelve la URL pública. */
export const AvatarUpload = ({ userId, value, onChange }: AvatarUploadProps) => {
  const [preview, setPreview] = useState<string | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError("Formato no permitido (usa JPG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen supera los 2MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = EXT_BY_TYPE[file.type] ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError("No pudimos subir la imagen. Inténtalo de nuevo.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-busting solo para el preview local; al padre va la URL canónica.
      setPreview(`${publicUrl}?t=${Date.now()}`);
      onChange(publicUrl);
    } finally {
      setUploading(false);
    }

    // Permite re-seleccionar el mismo archivo y que onChange vuelva a dispararse.
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-20 w-20 overflow-hidden rounded-2xl border border-cream-300 bg-cream"
        aria-label="Cambiar avatar"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview || "/icon.svg"}
          alt="Avatar"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-cocoa/40 opacity-0 transition-opacity hover:opacity-100">
          <Camera size={20} className="text-cream" />
        </span>
      </button>
      <div className="text-sm">
        <p className="text-cocoa/70">{uploading ? "Subiendo..." : "JPG, PNG o WEBP · máx 2MB"}</p>
        {error && <p className="text-red">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
