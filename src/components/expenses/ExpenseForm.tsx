"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/apiClient";

const schema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().max(500).optional(),
  paidBy: z.string().uuid("Select a valid payer"),
});

type FormValues = z.infer<typeof schema>;

type Member = { userId: string; name?: string | null; email?: string | null };

export default function ExpenseForm({ groupId }: { groupId: string }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await apiFetch<{ group: { id: string; name: string }, members: Member[] }>(`/api/groups/${groupId}`);
        setMembers(data.members || []);
      } catch (e) {
        console.warn("Failed to load members", e);
      }
    }
    loadMembers();
  }, [groupId]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/expenses", { method: "POST", json: { groupId, ...values } });
      reset();
    } catch (e) {
      // Use global error helper
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { toErrorMessage } = await import("@/types");
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
        <input
          {...register("amount", { valueAsNumber: true })}
          type="number"
          step="0.01"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="0.00"
        />
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <input
          {...register("description")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Dinner at hotel"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Paid by</label>
        <select
          {...register("paidBy")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select payer</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name ?? m.email ?? m.userId}
            </option>
          ))}
        </select>
        {errors.paidBy && <p className="mt-1 text-sm text-red-600">{errors.paidBy.message}</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}


