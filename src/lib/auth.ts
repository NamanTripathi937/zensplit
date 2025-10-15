import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type AppUser = typeof users.$inferSelect;

export async function getAuthenticatedUser(req?: Request): Promise<AppUser | null> {
  console.log("[auth] getAuthenticatedUser called. req present?", !!req);
  const cookieStore = await cookies();
  console.log("[auth] cookieStore", cookieStore);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  let { data: { user } } = await supabase.auth.getUser();
  if (!user && req) {
    const bearer = req.headers.get("authorization") || req.headers.get("Authorization");
    console.log("This is the bearer", bearer);
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined;
    console.log("This is the token", token);
    if (token) {
      const browserClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await browserClient.auth.getUser(token);
      console.log("This is the culprit, token", data);
      user = data.user ?? null;
      console.log("This is the user", user);
    }
  }
  if (!user) return null;

  const authUser = user;
  // Find existing app user by Supabase UID
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.supabaseUid, authUser.id))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Create app user record on first login
  const displayName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    null;

  const [created] = await db
    .insert(users)
    .values({
      supabaseUid: authUser.id,
      email: authUser.email ?? "",
      name: displayName ?? null,
    })
    .returning();

  return created ?? null;
}


