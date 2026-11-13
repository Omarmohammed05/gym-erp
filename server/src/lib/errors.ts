import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string[]> };
};

/** Single error shape for the whole API: { error: { code, message, fields? } } */
export function fail(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
) {
  const body: ErrorBody = { error: { code, message, ...(fields ? { fields } : {}) } };
  return c.json(body, status);
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; fields: Record<string, string[]> };

export function parse<T>(schema: { safeParse: (v: unknown) => any }, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false, fields: result.error.flatten().fieldErrors as Record<string, string[]> };
  }
  return { ok: true, data: result.data as T };
}

/** Best-effort client IP for the audit trail (proxy aware). */
export function clientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}
