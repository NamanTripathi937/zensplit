import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { groups, groupMembers, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const createGroupBody = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).default([]),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userGroups = await db
      .select({ 
        id: groups.id, 
        name: groups.name, 
        createdAt: groups.createdAt 
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, user.id))
      .orderBy(desc(groups.createdAt));

    const groupIds = userGroups.map(g => g.id);
    let membersByGroup: Record<string, { userId: string; name: string | null; email: string | null }[]> = {};
    if (groupIds.length > 0) {
      const rows = await db
        .select({
          groupId: groupMembers.groupId,
          userId: groupMembers.userId,
          name: users.name,
          email: users.email,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(inArray(groupMembers.groupId, groupIds));

      for (const r of rows) {
        if (!membersByGroup[r.groupId]) membersByGroup[r.groupId] = [];
        membersByGroup[r.groupId].push({ userId: r.userId, name: r.name, email: r.email });
      }
    }

    const enriched = userGroups.map(g => ({
      ...g,
      members: membersByGroup[g.id] ?? [],
    }));

    return NextResponse.json({ groups: enriched });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createGroupBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groups)
        .values({ name: parsed.data.name, createdBy: user.id })
        .returning();

      // Add creator + selected members (dedup)
      const toAdd = new Set<string>([user.id, ...parsed.data.memberIds]);
      const rows = Array.from(toAdd).map((uid) => ({ groupId: group.id, userId: uid }));
      await tx.insert(groupMembers).values(rows);

      return group;
    });

    return NextResponse.json({ group: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}