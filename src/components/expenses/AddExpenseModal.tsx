"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/apiClient";

const schema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  paidBy: z.string().uuid(),
  // participants removed because split is done server-side
});

type FormValues = z.infer<typeof schema>;
type Group = { id: string; name: string };
type Member = { userId: string; name?: string | null; email?: string | null };
type AppUser = { id: string; name: string | null; email: string | null };

export default function AddExpenseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { groupId: "", amount: 0, description: "", paidBy: "" },
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedGroupId = watch("groupId");

  useEffect(() => {
    async function loadGroups() {
      try {
        const data = await apiFetch<{ groups: Group[] }>("/api/groups");
        setGroups(data.groups || []);
      } catch (err) {
        console.error("Failed to load groups", err);
      }
    }
    async function loadUsers() {
      try {
        const data = await apiFetch<{ users: AppUser[] }>("/api/users");
        setAllUsers(data.users || []);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    }
    if (open) {
      loadGroups();
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    async function loadMembers() {
      if (!selectedGroupId) {
        setMembers([]);
        setValue("paidBy", "");
        return;
      }
      try {
        const data = await apiFetch<{ group: Group; members: Member[] }>(`/api/groups/${selectedGroupId}`);
        const fetched = data.members || [];
        setMembers(fetched);

        // Default paidBy to first member of the group (if any)
        if (fetched.length > 0) {
          setValue("paidBy", fetched[0].userId);
        } else {
          setValue("paidBy", "");
        }
      } catch (err) {
        console.error("Failed to load group members", err);
        setMembers([]);
        setValue("paidBy", "");
      }
    }
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setLoading(true);
    try {
      // No participants payload — backend should split among group members equally.
      await apiFetch("/api/expenses", {
        method: "POST",
        json: {
          groupId: values.groupId,
          amount: values.amount,
          description: values.description,
          paidBy: values.paidBy,
        },
      });

      reset();
      onCreated?.();
      onClose();
      alert("Expense created successfully.");
    } catch (err) {
      console.error("Failed to create expense", err);
      alert("Failed to create expense. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Group</label>
            <select {...register("groupId")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="">Select group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {errors.groupId && <p className="mt-1 text-sm text-red-600">Select a group</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input {...register("description")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paid by</label>
            <select {...register("paidBy")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="">Select payer</option>
              {(members.length > 0 ? members.map((m) => ({ id: m.userId, label: m.name ?? m.email ?? m.userId })) : allUsers.map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id }))).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            {errors.paidBy && <p className="mt-1 text-sm text-red-600">{errors.paidBy.message}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
