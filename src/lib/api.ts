import { NextResponse } from "next/server";
import { ZodError } from "zod";
import Stripe from "stripe";
import { flattenIssues } from "@/lib/validation";
import type { ApiError } from "@/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, error: string, extra: Partial<ApiError> = {}) {
  return NextResponse.json<ApiError>({ error, ...extra }, { status });
}

/** Wrap a route handler so thrown errors become well-formed JSON responses. */
export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.status, err.message, { code: err.code });
      if (err instanceof ZodError) {
        return jsonError(422, "Validation failed", { code: "VALIDATION", issues: flattenIssues(err) });
      }
      if (err instanceof SyntaxError) return jsonError(400, "Malformed JSON body", { code: "BAD_JSON" });
      if (err instanceof Stripe.errors.StripeError) {
        console.error("[stripe]", err.type, err.message);
        return jsonError(502, "Our payment provider rejected the request. Please try again shortly.", { code: "STRIPE_ERROR" });
      }
      console.error("[api]", err);
      return jsonError(500, "Something went wrong on our side", { code: "INTERNAL" });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text) throw new HttpError(400, "Request body is required", "EMPTY_BODY");
  return JSON.parse(text);
}
