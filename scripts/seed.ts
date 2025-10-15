import { db } from "@/db/client";
import { users, groups, groupMembers, expenses, expenseSplits } from "@/db/schema";

function makeId(i: number) {
  // Deterministic UUID-like strings for seed data (not RFC compliant)
  return `00000000-0000-0000-0000-${(100000000000 + i).toString().slice(-12)}`;
}

async function main() {
  console.log("Seeding demo data...");

  // 1) Create 10 users
  const demoUsers = Array.from({ length: 10 }).map((_, i) => ({
    id: makeId(i + 1),
    supabaseUid: `sb_${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));

  await db.insert(users).values(demoUsers).onConflictDoNothing();

  // 2) Create groups
  const demoGroups = [
    { id: makeId(1001), name: "Trip to Goa", createdBy: demoUsers[0].id },
    { id: makeId(1002), name: "Office Lunch", createdBy: demoUsers[1].id },
    { id: makeId(1003), name: "Flatmates", createdBy: demoUsers[2].id },
  ];
  await db.insert(groups).values(demoGroups).onConflictDoNothing();

  // 3) Group memberships
  const memberships = [
    // Trip to Goa: Users 1-4
    ...[0,1,2,3].map((u) => ({ groupId: demoGroups[0].id, userId: demoUsers[u].id })),
    // Office Lunch: Users 2,3,5,6
    ...[1,2,4,5].map((u) => ({ groupId: demoGroups[1].id, userId: demoUsers[u].id })),
    // Flatmates: Users 3,7,8
    ...[2,6,7].map((u) => ({ groupId: demoGroups[2].id, userId: demoUsers[u].id })),
  ];
  await db.insert(groupMembers).values(memberships).onConflictDoNothing();

  // 4) Expenses with equal splits
  // Goa: U1 paid 4000, U2 paid 2000
  const goaExp1 = await db.insert(expenses).values({ id: makeId(2001), groupId: demoGroups[0].id, paidBy: demoUsers[0].id, amount: "4000.00", description: "Hotel" }).returning();
  const goaExp2 = await db.insert(expenses).values({ id: makeId(2002), groupId: demoGroups[0].id, paidBy: demoUsers[1].id, amount: "2000.00", description: "Food" }).returning();
  const goaMembers = memberships.filter(m => m.groupId === demoGroups[0].id);
  const goaSplit1 = (4000 / goaMembers.length).toFixed(2);
  const goaSplit2 = (2000 / goaMembers.length).toFixed(2);
  await db.insert(expenseSplits).values(
    goaMembers.map(m => ({ expenseId: goaExp1[0].id, userId: m.userId, amount: goaSplit1 }))
  );
  await db.insert(expenseSplits).values(
    goaMembers.map(m => ({ expenseId: goaExp2[0].id, userId: m.userId, amount: goaSplit2 }))
  );

  // Office Lunch: U5 paid 1200
  const officeExp1 = await db.insert(expenses).values({ id: makeId(2003), groupId: demoGroups[1].id, paidBy: demoUsers[4].id, amount: "1200.00", description: "Lunch" }).returning();
  const officeMembers = memberships.filter(m => m.groupId === demoGroups[1].id);
  const officeSplit1 = (1200 / officeMembers.length).toFixed(2);
  await db.insert(expenseSplits).values(
    officeMembers.map(m => ({ expenseId: officeExp1[0].id, userId: m.userId, amount: officeSplit1 }))
  );

  // Flatmates: U3 paid 3000 (rent utilities)
  const flatExp1 = await db.insert(expenses).values({ id: makeId(2004), groupId: demoGroups[2].id, paidBy: demoUsers[2].id, amount: "3000.00", description: "Utilities" }).returning();
  const flatMembers = memberships.filter(m => m.groupId === demoGroups[2].id);
  const flatSplit1 = (3000 / flatMembers.length).toFixed(2);
  await db.insert(expenseSplits).values(
    flatMembers.map(m => ({ expenseId: flatExp1[0].id, userId: m.userId, amount: flatSplit1 }))
  );

  console.log("Seed completed.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});


