"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/client-api";
import { spring } from "@/components/motion";

interface Props {
  bookingId: string;
  token: string;
  businessName: string;
  existing: { rating: number; text: string | null } | null;
}

/** Shown on the client's manage page once the appointment has happened. One review per booking. */
export function ReviewForm({ bookingId, token, businessName, existing }: Props) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(existing?.text ?? "");
  const [saved, setSaved] = useState(Boolean(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Tap a star first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/bookings/${bookingId}/review`, { method: "POST", body: { token, rating, text: text.trim() || null } });
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const labels = ["", "Not great", "Okay", "Good", "Great", "Perfect"];
  const shown = hover || rating;

  return (
    <motion.form
      onSubmit={(e) => void submit(e)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="glass mt-6 rounded-3xl p-6"
    >
      <h2 className="text-lg font-semibold">{saved ? "Thanks for the review" : `How was ${businessName}?`}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {saved ? "It's live on their booking page. You can edit it here any time." : "It takes ten seconds and it helps them more than you'd think."}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => {
                setRating(n);
                setSaved(false);
              }}
              className="p-1"
            >
              <Star className={`size-7 ${n <= shown ? "fill-accent text-accent" : "text-ink-muted/40"}`} />
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-muted">{labels[shown]}</span>
      </div>
      <TextArea
        className="mt-4"
        label="A few words (optional)"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="What stood out?"
        maxLength={600}
      />
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button type="submit" loading={busy} disabled={saved}>
          {saved ? "Saved" : existing ? "Update review" : "Post review"}
        </Button>
      </div>
    </motion.form>
  );
}
