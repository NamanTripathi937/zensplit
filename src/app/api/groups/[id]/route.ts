import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { groups, groupMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

type Params = { id: string };
export async function GET(req: Request, ctx: { params: Params | Promise<Params> }) {
  try {
    // Support Next.js async params (if provided as a Promise)
    const p = ctx.params as Params | Promise<Params>;
    const resolvedParams: Params = typeof (p as Promise<Params>).then === "function" ? await (p as Promise<Params>) : (p as Params);
    const groupId = resolvedParams?.id;
    console.log("this is thegroupId", groupId);
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    // Authenticate requester
    console.log("req hai ye wala naya naya req ", req);
    const user = await getAuthenticatedUser(req);
    console.log("user hai ye wala naya naya ", user);
    if (!user) {
      console.warn("GET /api/groups/[id] — unauthenticated request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure group exists
    const [group] = await db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found " }, { status: 404 });
    }

    // Efficient membership check: does this user belong to the group?
    const [memberRow] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (!memberRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load all members of the group joined with user info
    const rows = await db
      .select({
        userId: groupMembers.userId,
        name: users.name,
        email: users.email,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    // sanitize output a bit
    const members = rows.map((r) => ({
      userId: r.userId,
      name: r.name ?? null,
      email: r.email ?? null,
    }));

    return NextResponse.json("I am naman");
  } catch (error) {
    console.error("GET /api/groups/[id] error:", error);
    // return basic error to client; keep details in server logs
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
