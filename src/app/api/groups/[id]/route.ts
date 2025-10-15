import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { groups, groupMembers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth"; 

const createGroupBody = z.object({
  name: z.string().min(1).max(100)
});

export async function GET(req: Request) {
  try {
    const hasAuth = !!(req.headers.get("authorization") || req.headers.get("Authorization"));
    console.log("[api/groups/[id]] authorization header present:", hasAuth);
    const user = await getAuthenticatedUser(req);
    console.log("[api/groups/[id]] user found:", !!user);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get only groups where user is a member
    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, user.id)) //to add the logged in user to the group
      .orderBy(desc(groups.createdAt));

    return NextResponse.json({ groups: userGroups });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user properly
    const hasAuth = !!(req.headers.get("authorization") || req.headers.get("Authorization"));
    console.log("[api/groups/[id]:POST] authorization header present:", hasAuth);
    const user = await getAuthenticatedUser(req);
    console.log("[api/groups/[id]:POST] user found:", !!user);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request body
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createGroupBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // 3. Use transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // Create group
      const [group] = await tx
        .insert(groups)
        .values({
          name: parsed.data.name,
          createdBy: user.id,
        })
        .returning();

      // Add creator as group member
      await tx
        .insert(groupMembers)
        .values({
          groupId: group.id,
          userId: user.id,
        });

      return group;
    });

    return NextResponse.json({ group: result }, { status: 201 });
    
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}