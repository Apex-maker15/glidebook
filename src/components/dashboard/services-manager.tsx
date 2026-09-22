"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Clock, Eye, EyeSlash, Pencil, Plus, Trash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Skeleton, TextArea } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import type { ServiceDTO } from "@/types";

interface FormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const emptyForm: FormState = { name: "", description: "", durationMinutes: "60", price: "" };

export interface ManagerProps {
  /** Admins may manage another provider's data. */
  providerId?: string;
  /** Hide the page header when rendered inside another screen. */
  embedded?: boolean;
}

function scoped(path: string, providerId?: string) {
  if (!providerId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}providerId=${encodeURIComponent(providerId)}`;
}

export function ServicesManager({ providerId, embedded }: ManagerProps = {}) {
  const [services, setServices] = useState<ServiceDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    api<{ services: ServiceDTO[] }>(scoped("/api/services", providerId))
      .then((r) => setServices(r.services))
      .catch((e) => setError(errorMessage(e)));
  }, [providerId]);

  const openNew = () => {
    setForm(emptyForm);
    setIssues({});
    setEditing("new");
  };
  const openEdit = (s: ServiceDTO) => {
    setForm({ name: s.name, description: s.description ?? "", durationMinutes: String(s.durationMinutes), price: (s.priceCents / 100).toFixed(2) });
    setIssues({});
    setEditing(s);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setIssues({});
    const body = {
      name: form.name,
      description: form.description || null,
      durationMinutes: Number(form.durationMinutes),
      priceCents: Math.round(Number(form.price) * 100),
    };
    try {
      if (editing === "new") {
        const { service } = await api<{ service: ServiceDTO }>(scoped("/api/services", providerId), { method: "POST", body });
        setServices((list) => [...(list ?? []), service]);
        push({ tone: "success", title: "Service added", description: `${service.name} is now bookable.` });
      } else {
        const { service } = await api<{ service: ServiceDTO }>(scoped(`/api/services/${editing.id}`, providerId), { method: "PATCH", body });
        setServices((list) => (list ?? []).map((s) => (s.id === service.id ? service : s)));
        push({ tone: "success", title: "Service updated" });
      }
      setEditing(null);
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) setIssues(err.issues);
      else push({ tone: "error", title: "Could not save", description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  /** Optimistic toggle with rollback. */
  const toggleActive = async (s: ServiceDTO) => {
    const next = { ...s, active: !s.active };
    setServices((list) => (list ?? []).map((x) => (x.id === s.id ? next : x)));
    try {
      await api(scoped(`/api/services/${s.id}`, providerId), { method: "PATCH", body: { active: next.active } });
    } catch (err) {
      setServices((list) => (list ?? []).map((x) => (x.id === s.id ? s : x)));
      push({ tone: "error", title: "Could not update", description: errorMessage(err) });
    }
  };

  const remove = async (s: ServiceDTO) => {
    const before = services ?? [];
    setServices(before.filter((x) => x.id !== s.id));
    try {
      const res = await api<{ deleted: boolean; service?: ServiceDTO }>(scoped(`/api/services/${s.id}`, providerId), { method: "DELETE" });
      if (!res.deleted && res.service) {
        setServices((list) => [...(list ?? []), res.service!].sort((a, b) => a.sortOrder - b.sortOrder));
        push({ tone: "info", title: "Service hidden", description: "It has past bookings, so it was deactivated instead of deleted." });
      } else {
        push({ tone: "success", title: "Service deleted" });
      }
    } catch (err) {
      setServices(before);
      push({ tone: "error", title: "Could not delete", description: errorMessage(err) });
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Catalogue</p>}
          <h1 className={embedded ? "text-lg font-semibold" : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>Services</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> New service
        </Button>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {services === null && !error ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.p key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="text-sm text-bad">
            {error}
          </motion.p>
        ) : (
          <motion.div key="list" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
            <LayoutGroup>
              <motion.ul layout className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {services!.length === 0 && (
                    <motion.li key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-ink-muted">
                      Add your first service to start taking bookings.
                    </motion.li>
                  )}
                  {services!.map((s) => (
                    <motion.li
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={spring.soft}
                      className={cn("glass flex items-center gap-4 rounded-2xl p-4", !s.active && "opacity-60")}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">{s.name}</h3>
                          {!s.active && <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-ink-muted">Hidden</span>}
                        </div>
                        {s.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{s.description}</p>}
                        <p className="mt-1.5 flex items-center gap-3 text-[13px] text-ink-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                          </span>
                          <span className="font-semibold text-ink">{formatMoney(s.priceCents, s.currency)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <IconButton label={s.active ? "Hide from booking page" : "Show on booking page"} onClick={() => void toggleActive(s)}>
                          {s.active ? <Eye className="size-4" /> : <EyeSlash className="size-4" />}
                        </IconButton>
                        <IconButton label="Edit" onClick={() => openEdit(s)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label="Delete" onClick={() => void remove(s)} danger>
                          <Trash className="size-4" />
                        </IconButton>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New service" : "Edit service"}>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={issues.name?.[0]} required autoFocus />
          <TextArea label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={issues.description?.[0]} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Duration (minutes)"
              type="number"
              min={15}
              step={15}
              inputMode="numeric"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              error={issues.durationMinutes?.[0]}
              required
            />
            <Field
              label="Price"
              type="number"
              min={1}
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              error={issues.priceCents?.[0]}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing === "new" ? "Add service" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function IconButton({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={spring.snappy}
      className={cn("rounded-xl p-2 text-ink-muted transition-colors hover:bg-white/[0.08] hover:text-ink", danger && "hover:bg-bad/15 hover:text-bad")}
    >
      {children}
    </motion.button>
  );
}
