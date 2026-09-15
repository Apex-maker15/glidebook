import type { ApiError } from "@/types";

export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public issues?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/** Thin fetch wrapper that throws `ClientApiError` for non-2xx responses. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const res = await fetch(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>;
    throw new ClientApiError(err.error ?? `Request failed (${res.status})`, res.status, err.code, err.issues);
  }
  return data as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof ClientApiError) return err.message;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
