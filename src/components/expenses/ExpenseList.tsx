"use client";

import useSWR from "swr";
import { formatINR } from "@/lib/currency";

type Expense = { id: string; amount: string | number; description: string | null };

export default function ExpenseList({ groupId }: { groupId: string }) {
  const { data, error, isLoading, mutate } = useSWR<{ expenses: Expense[] }>(
    `/api/expenses?groupId=${groupId}`,
    async (url: string) => {
      const res = await fetch(url);
      return res.json();
    }
  );

  if (isLoading) return <p className="text-gray-500">Loading expenses...</p>;
  if (error) return <p className="text-red-600">Failed to load expenses</p>;

  const expenses = data?.expenses ?? [];

  return (
    <div className="space-y-2">
      {expenses.length === 0 && <p className="text-gray-500">No expenses yet.</p>}
      {expenses.map((e) => (
        <div key={e.id} className="p-3 border rounded bg-white flex items-center justify-between">
          <div className="text-gray-800">{e.description ?? "Untitled expense"}</div>
          <div className="font-medium">{formatINR(typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount)}</div>
        </div>
      ))}
    </div>
  );
}


