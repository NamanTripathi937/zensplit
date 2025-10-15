"use client";
import Link from "next/link";
import useSWR from "swr";
import { formatINR } from "@/lib/currency";
import { apiFetch } from "@/lib/apiClient";
import AddExpenseModal from "@/components/expenses/AddExpenseModal";
import { useMemo, useState } from "react";

type Summary = {
  totalBalance: number | null;
  totalOwed: number | null;
  totalOwes: number | null;
  owedBy: { name: string; amount: number }[] | null;
  owesTo: { name: string; amount: number }[] | null;
};

// Locally use a safe version with non-nullable fields
type SafeSummary = {
  totalBalance: number;
  totalOwed: number;
  totalOwes: number;
  owedBy: { name: string; amount: number }[];
  owesTo: { name: string; amount: number }[];
};

// Client-side fetcher that attaches Supabase access token in Authorization header
const clientFetcher = async (url: string): Promise<Summary> => apiFetch<Summary>(url);

// safe wrapper to ensure formatINR always gets a number
function safeFormatINR(value: unknown) {
  const n = Number(value ?? 0);
  // if conversion fails, fallback to 0
  return formatINR(Number.isFinite(n) ? n : 0);
}

export default function ExpensesPage() {
  const { data, error, isLoading, mutate } = useSWR<Summary>("/api/expenses/summary", clientFetcher, {
    // optional: refresh when window gets focus
    revalidateOnFocus: true,
  });
  const [open, setOpen] = useState(false);

  // default safe summary values
  const summary = useMemo<SafeSummary>(() => {
    return {
      totalBalance: data?.totalBalance ?? 0,
      totalOwed: data?.totalOwed ?? 0,
      totalOwes: data?.totalOwes ?? 0,
      owedBy: Array.isArray(data?.owedBy) ? data!.owedBy.map((p) => ({ name: p?.name ?? "Unknown", amount: Number(p?.amount ?? 0) })) : [],
      owesTo: Array.isArray(data?.owesTo) ? data!.owesTo.map((p) => ({ name: p?.name ?? "Unknown", amount: Number(p?.amount ?? 0) })) : [],
    };
  }, [data]);

  // convenience booleans
  const hasAnyPeople = (summary.owedBy.length + summary.owesTo.length) > 0;
  const isEmpty = !hasAnyPeople && summary.totalBalance === 0 && summary.totalOwed === 0 && summary.totalOwes === 0;

  // Helper for safe map item rendering — use a stable-ish key
  const renderPersonLine = (p: { name?: string; amount?: number }, idx: number) => (
    <li key={`${p.name ?? "unknown"}-${idx}`} className="py-2 flex items-center justify-between">
      <span>{p.name ?? "Unknown"}</span>
      <span className="font-medium">{safeFormatINR(p.amount ?? 0)}</span>
    </li>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses Dashboard</h1>
          <p className="text-gray-600">Overview across all your groups</p>
        </div>

        {/* Keep button enabled so user can open modal and see CTA or create people inline.
            If your modal requires members to exist first, handle that inside the modal. */}
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          aria-disabled={!hasAnyPeople}
          title={!hasAnyPeople ? "You currently have no members — create a group or add people first" : undefined}
        >
          Add Expense
        </button>
      </div>

      {/* loading / error / empty handling */}
      {isLoading ? (
        <div role="status" className="p-4 border rounded bg-white">Loading summary…</div>
      ) : error ? (
        <div role="alert" aria-live="polite" className="p-4 border rounded bg-red-50 text-red-700">
          {/* Friendly messages for common cases */}
          {String(error?.message ?? "Failed to load expenses summary.")}
          {String(error?.message)?.toLowerCase().includes("unauthorized") ? (
            <div className="mt-2 text-sm text-gray-700">
              You appear signed out — <Link href="/login" className="text-blue-600 underline">sign in</Link> to view your expenses.
            </div>
          ) : null}
        </div>
      ) : isEmpty ? (
        <div className="p-4 border rounded bg-white">
          <p className="text-gray-600">No expenses or members yet. Create a group and add people to start tracking expenses.</p>
          {!hasAnyPeople ? (
            <p className="mt-2 text-sm text-gray-500">Tip: Click <strong>Add Expense</strong> to open the expense modal — you will be guided to add people if required.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white">
          <div className="text-gray-500 text-sm">Total Balance</div>
          <div className="text-xl font-semibold">{safeFormatINR(summary.totalBalance)}</div>
        </div>
        <div className="p-4 border rounded bg-white">
          <div className="text-gray-500 text-sm">You Owe</div>
          <div className="text-xl font-semibold">{safeFormatINR(summary.totalOwes)}</div>
        </div>
        <div className="p-4 border rounded bg-white">
          <div className="text-gray-500 text-sm">You Are Owed</div>
          <div className="text-xl font-semibold">{safeFormatINR(summary.totalOwed)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white">
          <h2 className="text-lg font-medium mb-3">People You Owe</h2>
          {summary.owesTo.length === 0 ? (
            <p className="text-gray-500">No dues.</p>
          ) : (
            <ul className="divide-y">
              {summary.owesTo.map((p, idx) => renderPersonLine(p, idx))}
            </ul>
          )}
        </div>
        <div className="p-4 border rounded bg-white">
          <h2 className="text-lg font-medium mb-3">People Who Owe You</h2>
          {summary.owedBy.length === 0 ? (
            <p className="text-gray-500">No credits.</p>
          ) : (
            <ul className="divide-y">
              {summary.owedBy.map((p, idx) => renderPersonLine(p, idx))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-medium mb-3">Go to your groups</h2>
        <Link href="/groups" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">View Groups</Link>
      </div>

      <AddExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          try {
            await mutate(); // revalidate
          } catch (e) {
            // swallow mutation errors but log if needed
            // console.error("mutate failed", e);
          } finally {
            setOpen(false);
          }
        }}
      />
    </div>
  );
}
