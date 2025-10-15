import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { groups, groupMembers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const createGroupBody = z.object({
  name: z.string().min(1).max(100),
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

    return NextResponse.json({ groups: userGroups });
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

      await tx.insert(groupMembers).values({ groupId: group.id, userId: user.id });
      
      return group;
    });

    return NextResponse.json({ group: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}