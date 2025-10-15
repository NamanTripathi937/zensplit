import { cookies, headers as nextHeaders } from "next/headers";

type ApiInit = RequestInit & { json?: unknown };

export async function serverApiFetch<T = unknown>(input: string, init: ApiInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const hdrs = await nextHeaders();
  // Forward Authorization header from the incoming request if present (supports Clerk or other JWTs)
  const inboundAuth = hdrs.get("authorization");

  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (inboundAuth && !headers.has("Authorization")) headers.set("Authorization", inboundAuth);
  // Forward cookies so API routes can authenticate via cookies even if token isn't available
  const allCookies = cookieStore.getAll?.() ?? [];
  if (allCookies.length > 0 && !headers.has("Cookie")) {
    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieHeader) headers.set("Cookie", cookieHeader);
  }

  const body = init.json !== undefined ? JSON.stringify(init.json) : init.body;

  // Ensure absolute URL when running on the server
  let url = input;
  if (typeof url === "string" && url.startsWith("/")) {
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
    if (host) url = `${proto}://${host}${url}`;
  }

  const res = await fetch(url, { ...init, headers, body, cache: init.cache ?? "no-store" });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err?.error ?? message;
    } catch {}
    throw new Error(message);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}


