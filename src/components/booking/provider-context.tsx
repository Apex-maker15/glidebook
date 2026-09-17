"use client";

import { createContext, useContext } from "react";
import type { ProviderDTO } from "@/types";

/**
 * The provider being booked, supplied by the server-rendered page.
 * Read this (not the Zustand store) inside steps: during SSR the store still
 * holds its initial state, so `store.provider` is null on the first render.
 */
const ProviderContext = createContext<ProviderDTO | null>(null);

export const ProviderProvider = ProviderContext.Provider;

export function useProvider(): ProviderDTO {
  const provider = useContext(ProviderContext);
  if (!provider) throw new Error("useProvider must be used inside BookingWizard");
  return provider;
}
