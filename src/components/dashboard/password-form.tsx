"use client";

import { useState } from "react";
import { Key } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";

/** Change-password card for the signed-in provider (never shown when an admin is editing someone else). */
export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const push = useToastStore((s) => s.push);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api("/api/account/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      push({ tone: "success", title: "Password changed" });
    } catch (err) {
      const msg = err instanceof ClientApiError && err.issues?.newPassword?.[0] ? err.issues.newPassword[0] : errorMessage(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="glass mt-6 space-y-4 rounded-3xl p-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Key className="size-4 text-accent-strong" /> Change password
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">Use at least 8 characters. You stay signed in on this device.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Field label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
        <Field label="Repeat new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={saving}>
          Update password
        </Button>
      </div>
    </form>
  );
}
