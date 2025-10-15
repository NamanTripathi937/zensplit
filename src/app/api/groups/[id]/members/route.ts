// app/api/groups/[id]/route.ts  (or pages equivalent — adapt filename)
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { groupMembers, users, groups } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const addMemberBody = z.object({ userId: z.string().uuid() });

type Params = { id: string };

function short(v: string | null | undefined, len = 200) {
  if (!v) return "";
  return v.length > len ? v.slice(0, len) + "..." : v;
}

async function resolveParams(ctx: { params: Params | Promise<Params> }) {
  const p = ctx.params as Params | Promise<Params>;
  return typeof (p as Promise<Params>).then === "function" ? await (p as Promise<Params>) : (p as Params);
}

/**
 * GET - fetch group details (and whether current user is member)
 */
export async function GET(req: Request, ctx: { params: Params | Promise<Params> }) {
  const ts = new Date().toISOString();
  try {
    const { id: groupId } = await resolveParams(ctx);

    console.log(`[${ts}] GET /api/groups/${groupId}`, {
      auth: short(req.headers.get("authorization")),
      cookie: short(req.headers.get("cookie")),
    });
    // console.log("req hai ye wala naya naya req ", req);
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.warn(`[${ts}] GET unauthorized for group ${groupId}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ensure group exists
    const [group] = await db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      console.warn(`[${ts}] GET group not found: ${groupId} (user ${user.id})`);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // is requester member?
    const [requesterIsMember] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
      .limit(1);

    // optionally fetch members count (helpful for debugging)
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    console.log(`[${ts}] GET group ${groupId} found, members=${members.length}, requesterIsMember=${!!requesterIsMember}`);

    return NextResponse.json({
      group: {
        id: group.id,
        name: (group as { id: string; name: string | null | undefined }).name ?? null,
      },
      isMember: !!requesterIsMember,
      membersCount: members.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error(`[${ts}] GET /api/groups/[id] error:`, message, stack);
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}

/**
 * POST - add a user to group (body: { userId })
 */
export async function POST(req: Request, ctx: { params: Params | Promise<Params> }) {
  const ts = new Date().toISOString();
  try {
    const { id: groupId } = await resolveParams(ctx);

    console.log(`[${ts}] POST /api/groups/${groupId}/members`, {
      auth: short(req.headers.get("authorization")),
      cookie: short(req.headers.get("cookie")),
    });

    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.warn(`[${ts}] POST unauthorized for group ${groupId}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ensure group exists
    const [group] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // ensure requester is member
    const [requesterIsMember] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
      .limit(1);
    if (!requesterIsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await req.json().catch(() => null);
    if (!json) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const parsed = addMemberBody.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { userId } = parsed.data;

    // ensure target user exists
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // check not already in group
    const [existing] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    if (existing) return NextResponse.json({ error: "User already in group" }, { status: 409 });

    await db.insert(groupMembers).values({ groupId, userId });

    console.log(`[${ts}] POST added user ${userId} to group ${groupId} (by ${user.id})`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    const messageUnknown = error instanceof Error ? error.message : String(error);
    const stackUnknown = error instanceof Error ? error.stack : "";
    console.error(`[${ts}] POST /api/groups/[id]/members error:`, messageUnknown, stackUnknown);
    // surface DB connect problems separately
    const message = messageUnknown;
    if (message.includes("ENOTFOUND") || message.includes("connect")) {
      return NextResponse.json({ error: "DB unavailable", detail: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}
