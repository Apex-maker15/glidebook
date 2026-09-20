"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Skeleton, TextArea } from "@/components/ui/primitives";
import { fadeVariants } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { fileToDataUrl } from "@/lib/image";
import { useToastStore } from "@/store/toast-store";
import type { ProviderAccountDTO } from "@/types";
import type { ManagerProps } from "./settings-form";

function scoped(path: string, providerId?: string) {
  if (!providerId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}providerId=${encodeURIComponent(providerId)}`;
}

interface FormState {
  tagline: string;
  bio: string;
  instagram: string;
  accentColor: string;
  logoData: string | null;
  coverData: string | null;
  gallery: string[];
  slug: string;
}

const DEFAULT_ACCENT = "#1f8fdd";

/**
 * Everything that makes the public page theirs: name line, story, Instagram,
 * brand colour, logo, cover and a few photos of their work. Images are resized
 * in the browser and stored inline, so there is nothing to configure.
 */
export function PageBranding({ providerId, embedded }: ManagerProps = {}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"logo" | "cover" | "gallery" | null>(null);
  const push = useToastStore((s) => s.push);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ provider: ProviderAccountDTO }>(scoped("/api/settings", providerId))
      .then(({ provider }) =>
        setForm({
          tagline: provider.tagline ?? "",
          bio: provider.bio ?? "",
          instagram: provider.instagram ?? "",
          accentColor: provider.accentColor ?? "",
          logoData: provider.logoData,
          coverData: provider.coverData,
          gallery: provider.gallery,
          slug: provider.slug,
        }),
      )
      .catch((err) => setError(errorMessage(err)));
  }, [providerId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => f && { ...f, [k]: v });

  const pick = async (kind: "logo" | "cover" | "gallery", files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(kind);
    try {
      if (kind === "logo") {
        set("logoData", await fileToDataUrl(files[0], { maxWidth: 512, maxHeight: 512, aspect: 1, maxChars: 260_000 }));
      } else if (kind === "cover") {
        set("coverData", await fileToDataUrl(files[0], { maxWidth: 1600, maxHeight: 640, aspect: 2.5, quality: 0.82, maxChars: 480_000 }));
      } else {
        const room = 6 - (form?.gallery.length ?? 0);
        const chosen = Array.from(files).slice(0, Math.max(0, room));
        const encoded = await Promise.all(chosen.map((f) => fileToDataUrl(f, { maxWidth: 1000, maxHeight: 1000, aspect: 1, quality: 0.8, maxChars: 240_000 })));
        setForm((f) => f && { ...f, gallery: [...f.gallery, ...encoded].slice(0, 6) });
      }
    } catch (err) {
      push({ tone: "error", title: "Could not use that image", description: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setIssues({});
    try {
      await api(scoped("/api/settings", providerId), {
        method: "PATCH",
        body: {
          tagline: form.tagline.trim() || null,
          bio: form.bio.trim() || null,
          instagram: form.instagram.trim() || null,
          accentColor: form.accentColor || null,
          logoData: form.logoData,
          coverData: form.coverData,
          gallery: form.gallery,
        },
      });
      push({ tone: "success", title: "Page updated", description: "Open your booking page to see it." });
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) setIssues(err.issues);
      push({ tone: "error", title: "Could not save", description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Your page</p>}
          <h1 className={embedded ? "text-lg font-semibold" : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>Make it yours</h1>
        </div>
        {form?.slug && (
          <Link href={`/book/${form.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
            <ExternalLink className="size-3.5" /> View page
          </Link>
        )}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!form && !error ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </motion.div>
        ) : error ? (
          <motion.p key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="text-sm text-red-300">
            {error}
          </motion.p>
        ) : (
          <motion.form key="form" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" onSubmit={(e) => void save(e)} className="space-y-4">
            {/* Cover + logo preview */}
            <div className="glass overflow-hidden rounded-3xl">
              <div
                className="relative h-36 sm:h-44"
                style={
                  form!.coverData
                    ? { backgroundImage: `url(${form!.coverData})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: `linear-gradient(135deg, ${form!.accentColor || DEFAULT_ACCENT}e6, ${form!.accentColor || DEFAULT_ACCENT}80)` }
                }
              >
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" loading={busy === "cover"} onClick={() => coverInput.current?.click()}>
                    <ImagePlus className="size-3.5" /> {form!.coverData ? "Change cover" : "Add cover photo"}
                  </Button>
                  {form!.coverData && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => set("coverData", null)} aria-label="Remove cover">
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-4 px-5 pb-5">
                <div className="-mt-10 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-2 shadow-pop">
                  {form!.logoData ? (
                    // eslint-disable-next-line @next/next/no-img-element -- inline data URL
                    <img src={form!.logoData} alt="Logo" className="size-full object-cover" />
                  ) : (
                    <Camera className="size-6 text-ink-muted" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pb-1">
                  <Button type="button" size="sm" variant="secondary" loading={busy === "logo"} onClick={() => logoInput.current?.click()}>
                    <ImagePlus className="size-3.5" /> {form!.logoData ? "Change logo" : "Add logo"}
                  </Button>
                  {form!.logoData && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => set("logoData", null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => void pick("logo", e.target.files)} />
              <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => void pick("cover", e.target.files)} />
            </div>

            <div className="glass space-y-4 rounded-3xl p-6">
              <Field
                label="One-liner"
                value={form!.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                error={issues.tagline?.[0]}
                placeholder="Mobile detailing across Phoenix and the East Valley"
                hint="Shown under your name and in link previews"
                maxLength={90}
              />
              <TextArea
                label="About you"
                value={form!.bio}
                onChange={(e) => set("bio", e.target.value)}
                error={issues.bio?.[0]}
                rows={5}
                maxLength={1500}
                placeholder="Who you are, how long you've been doing this, what you're known for, what's included."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Instagram"
                  value={form!.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  error={issues.instagram?.[0]}
                  placeholder="yourhandle"
                  hint="Just the handle, no @"
                />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="accent" className="text-[13px] font-medium text-ink-muted">
                    Brand colour
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-white/[0.04] px-3">
                    <input
                      id="accent"
                      type="color"
                      value={form!.accentColor || DEFAULT_ACCENT}
                      onChange={(e) => set("accentColor", e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-sm text-ink-muted">{form!.accentColor || "default"}</span>
                    {form!.accentColor && (
                      <button type="button" onClick={() => set("accentColor", "")} className="ml-auto text-[12px] text-ink-muted hover:text-ink">
                        Reset
                      </button>
                    )}
                  </div>
                  {issues.accentColor?.[0] && <p className="text-xs text-red-300">{issues.accentColor[0]}</p>}
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Recent work</h2>
                  <p className="mt-0.5 text-[13px] text-ink-muted">Up to 6 photos. Before-and-afters do best.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" loading={busy === "gallery"} disabled={form!.gallery.length >= 6} onClick={() => galleryInput.current?.click()}>
                  <ImagePlus className="size-3.5" /> Add photos
                </Button>
                <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void pick("gallery", e.target.files)} />
              </div>
              {form!.gallery.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {form!.gallery.map((src, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
                      <img src={src} alt={`Work ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setForm((f) => f && { ...f, gallery: f.gallery.filter((_, j) => j !== i) })}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ color: "#fff", backgroundColor: "rgb(0 0 0 / 0.6)" }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {issues.gallery?.[0] && <p className="mt-2 text-xs text-red-300">{issues.gallery[0]}</p>}
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save page
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
