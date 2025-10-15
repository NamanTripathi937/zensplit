import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ApiInit = RequestInit & { json?: unknown };

export async function serverApiFetch<T = unknown>(input: string, init: ApiInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { data } = await supabase.auth.getSession();
  console.log('Able to get session?', data);
  const token = data.session?.access_token;
  console.log('Token?', token);

  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const body = init.json !== undefined ? JSON.stringify(init.json) : init.body;

  const res = await fetch(input, { ...init, headers, body, cache: init.cache ?? "no-store" });
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


