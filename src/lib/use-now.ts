"use client";

import { useEffect, useState } from "react";

/** Current time, refreshed on an interval so "upcoming" stays correct on long-lived tabs. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
