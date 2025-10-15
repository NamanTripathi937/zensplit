import { cookies as nextCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type AppUser = typeof users.$inferSelect;
async function findOrCreateAppUser(supabaseUser: User | null): Promise<AppUser | null> {
  if (!supabaseUser) return null;
  // console.log("supabaseUser provided to findOrCreateAppUser:", supabaseUser);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.supabaseUid, supabaseUser.id))
    .limit(1);
  // console.log("existing users:", existing);
  if (existing.length > 0) return existing[0];

  const displayName =
    (supabaseUser.user_metadata?.full_name as string | undefined) ||
    (supabaseUser.user_metadata?.name as string | undefined) ||
    null;
  // console.log("displayName:", displayName);
  const [created] = await db
    .insert(users)
    .values({
      supabaseUid: supabaseUser.id,
      email: supabaseUser.email ?? "",
      name: displayName ?? null,
    })
    .returning();
  // console.log("created user:", created);
  return created ?? null;
}

export async function getAuthenticatedUser(req?: Request): Promise<AppUser | null> {
  // console.log("req provided to getAuthenticatedUser:", req);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  // 1) If we received a Request with an Authorization header, use that token.

  if (req) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    // console.log("authHeader:", authHeader);
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader ?? null;
    console.log("token:", token);
    if (token) {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await client.auth.getUser(token);
      // console.log("data hai ye wala ", data);
      // console.log("data.user hai ye wala ", data.user);
      console.log("findOrCreateAppUser hai ye wala ", await findOrCreateAppUser(data.user ?? null));
      return await findOrCreateAppUser(data.user ?? null);
    }
    else {
      console.log("no token found");
      // fallthrough: try cookie-based below if no bearer token
    }
    
  }

  // 2) Server-side cookie flow (Next.js server environment)
  const cookieStore = await nextCookies();
  const serverSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  const { data } = await serverSupabase.auth.getUser();
  return await findOrCreateAppUser(data.user ?? null);
}
