import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { expenses, expenseSplits, groupMembers, users } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const createExpenseBody = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  paidBy: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json().catch(() => null);
    if (!json) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const parsed = createExpenseBody.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { groupId, amount, paidBy, description } = parsed.data;

    // Fetch group members for equal split
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    if (members.length === 0) {
      return NextResponse.json({ error: "No members in group" }, { status: 400 });
    }

    const splitAmount = Number((amount / members.length).toFixed(2));

    const created = await db.transaction(async (tx) => {
      const [exp] = await tx
        .insert(expenses)
        .values({
          groupId,
          paidBy,
          description,
          // Drizzle numeric maps to string; store as fixed 2-decimal string
          amount: amount.toFixed(2),
        })
        .returning();

      await tx.insert(expenseSplits).values(
        members.map((m) => ({
          expenseId: exp.id,
          userId: m.userId,
          // numeric column expects string
          amount: splitAmount.toFixed(2),
        }))
      );

      return exp;
    });

    return NextResponse.json({ expense: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.groupId, groupId));

  return NextResponse.json({ expenses: rows });
}


