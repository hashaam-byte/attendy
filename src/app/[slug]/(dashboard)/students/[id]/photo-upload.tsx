"use client";
// src/app/[slug]/(dashboard)/students/[id]/photo-upload.tsx — ATTENDY-EDU v4
// Premium plan only. Compresses image client-side to <80KB before upload.
// Shows on QR card if uploaded. Falls back to initials if no photo.

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, CheckCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  studentId:    string;
  orgId:        string;
  currentPhoto: string | null;
  plan:         string;
  onUploaded:   (url: string | null) => void;
}

// Compress image client-side to under 80KB
async function compressImage(file: File, maxKb = 80): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas  = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if too large
      const MAX_DIM = 400;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else                { width  = Math.round((width  * MAX_DIM) / height); height = MAX_DIM; }
      }

      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality levels until under maxKb
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Compression failed")); return; }
            if (blob.size <= maxKb * 1024 || quality <= 0.2) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryCompress();
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function PhotoUpload({ studentId, orgId, currentPhoto, plan, onUploaded }: Props) {
  const supabase    = createClient();
  const inputRef    = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(currentPhoto);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [done,      setDone]      = useState(false);

  const isPremium = ["premium", "enterprise"].includes(plan);

  if (!isPremium) {
    return (
      <div className="card p-4 border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
          📸 Student photo upload is available on the Premium plan and above.
        </p>
      </div>
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setDone(false);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setUploading(true);

    try {
      // Compress client-side
      const compressed = await compressImage(file, 80);
      const sizeKb     = Math.round(compressed.size / 1024);

      // Upload to Supabase storage
      const path = `${orgId}/${studentId}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("student-photos")
        .upload(path, compressed, {
          upsert:      true,
          contentType: "image/jpeg",
        });

      if (uploadErr) throw new Error(uploadErr.message);

      // Get signed URL (bucket is private)
      const { data: signedData } = await supabase.storage
        .from("student-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      if (!signedData?.signedUrl) throw new Error("Could not get photo URL");

      // Update member record
      const { error: updateErr } = await supabase
        .from("members")
        .update({ photo_url: signedData.signedUrl })
        .eq("id", studentId)
        .eq("organisation_id", orgId);

      if (updateErr) throw new Error(updateErr.message);

      setPreview(signedData.signedUrl);
      onUploaded(signedData.signedUrl);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);
    try {
      const path = `${orgId}/${studentId}.jpg`;
      await supabase.storage.from("student-photos").remove([path]);
      await supabase
        .from("members")
        .update({ photo_url: null })
        .eq("id", studentId)
        .eq("organisation_id", orgId);

      setPreview(null);
      onUploaded(null);
    } catch (err: any) {
      setError(err.message ?? "Remove failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Photo preview */}
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#bbf7d0] dark:border-[#1a3a24] bg-green-50 dark:bg-green-950/20 flex items-center justify-center overflow-hidden shrink-0">
          {preview
            ? <img src={preview} alt="Student photo" className="w-full h-full object-cover" />
            : <Camera size={22} className="text-green-300 dark:text-green-700" />
          }
        </div>

        <div className="space-y-2 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs w-full justify-center"
          >
            {uploading ? (
              <><Loader2 size={12} className="animate-spin" /> Uploading…</>
            ) : done ? (
              <><CheckCircle size={12} className="text-green-500" /> Uploaded!</>
            ) : (
              <><Camera size={12} /> {preview ? "Change Photo" : "Upload Photo"}</>
            )}
          </button>

          {preview && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="btn-secondary text-xs w-full justify-center text-red-500 hover:border-red-300"
            >
              <Trash2 size={12} /> Remove Photo
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <X size={10} /> {error}
            </p>
          )}

          <p className="text-[10px] text-slate-400 dark:text-[#4a7a5a]">
            Compressed to &lt;80KB automatically. Appears on QR card.
          </p>
        </div>
      </div>
    </div>
  );
}