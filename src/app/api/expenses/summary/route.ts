import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { expenseSplits, expenses, groupMembers, users, groups } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

type Summary = {
  totalBalance: number;
  totalOwed: number; // others owe you
  totalOwes: number; // you owe others
  owedBy: { name: string; amount: number }[]; // others owe you
  owesTo: { name: string; amount: number }[]; // you owe others
};

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all groups where user is a member
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, user.id));

    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      const empty: Summary = { totalBalance: 0, totalOwed: 0, totalOwes: 0, owedBy: [], owesTo: [] };
      return NextResponse.json(empty);
    }

    // Fetch all expenses for those groups
    const allExpenses = await db
      .select({ id: expenses.id, paidBy: expenses.paidBy, groupId: expenses.groupId })
      .from(expenses)
      .where(inArray(expenses.groupId, groupIds));

    const expenseIds = allExpenses.map((e) => e.id);
    if (expenseIds.length === 0) {
      const empty: Summary = { totalBalance: 0, totalOwed: 0, totalOwes: 0, owedBy: [], owesTo: [] };
      return NextResponse.json(empty);
    }

    // Fetch all splits for those expenses and join user info
    const splits = await db
      .select({
        expenseId: expenseSplits.expenseId,
        userId: expenseSplits.userId,
        amount: expenseSplits.amount,
        userName: users.name,
        userEmail: users.email,
      })
      .from(expenseSplits)
      .leftJoin(users, eq(expenseSplits.userId, users.id))
      .where(inArray(expenseSplits.expenseId, expenseIds));

    // Map expenseId -> paidBy
    const expensePaidBy = new Map(allExpenses.map((e) => [e.id, e.paidBy]));

    // Track net per counterparty
    // positive = they owe you, negative = you owe them
    const netByCounterparty = new Map<string, { name: string; amount: number }>();

    for (const s of splits) {
      const paidBy = expensePaidBy.get(s.expenseId);
      const splitAmount = typeof s.amount === "string" ? parseFloat(s.amount) : (s.amount as unknown as number);
      if (!paidBy) continue;

      // CRITICAL FIX: Skip if the payer is the same as the split user
      // The payer doesn't owe themselves
      if (paidBy === s.userId) continue;

      if (paidBy === user.id) {
        // You paid, this person (s.userId) owes you their split amount
        const key = s.userId;
        const name = s.userName ?? s.userEmail ?? s.userId;
        const current = netByCounterparty.get(key) ?? { name, amount: 0 };
        current.amount += splitAmount;
        netByCounterparty.set(key, current);
      } else if (s.userId === user.id) {
        // Someone else (paidBy) paid, you owe them your split amount
        const key = paidBy;
        // Find payer's name from splits
        const other = splits.find((x) => x.userId === paidBy);
        const name = other?.userName ?? other?.userEmail ?? paidBy;
        const current = netByCounterparty.get(key) ?? { name, amount: 0 };
        current.amount -= splitAmount;
        netByCounterparty.set(key, current);
      }
    }

    let totalOwed = 0; // others owe you
    let totalOwes = 0; // you owe others
    const owedBy: { name: string; amount: number }[] = [];
    const owesTo: { name: string; amount: number }[] = [];

    for (const { name, amount } of netByCounterparty.values()) {
      if (amount > 0.009) {
        totalOwed += amount;
        owedBy.push({ name, amount: parseFloat(amount.toFixed(2)) });
      } else if (amount < -0.009) {
        const owed = -amount;
        totalOwes += owed;
        owesTo.push({ name, amount: parseFloat(owed.toFixed(2)) });
      }
    }

    const totalBalance = parseFloat((totalOwed - totalOwes).toFixed(2));
    const summary: Summary = {
      totalBalance: totalBalance,
      totalOwed: parseFloat(totalOwed.toFixed(2)),
      totalOwes: parseFloat(totalOwes.toFixed(2)),
      owedBy,
      owesTo,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/expenses/summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}