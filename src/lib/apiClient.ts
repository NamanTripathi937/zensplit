import { supabase } from "@/lib/supabase";

type ApiInit = RequestInit & { json?: unknown };

export async function apiFetch<T = unknown>(input: string, init: ApiInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else console.warn("apiFetch: no access token found; request may be unauthorized");

  const body = init.json !== undefined
    ? JSON.stringify(init.json)
    : init.body;

  const res = await fetch(input, { ...init, headers, body });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err?.error ?? message;
    } catch {}
    throw new Error(message);
  }
  // try return json, allow empty body
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}


