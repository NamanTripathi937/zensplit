"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type AppUser = { id: string; name: string | null; email: string | null };
type Member = { userId: string; name: string | null; email: string | null };

export default function AddMemberToGroup({ groupId, existingMembers, onAdded }: { groupId: string; existingMembers: Member[]; onAdded?: () => void }) {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ users: AppUser[] }>("/api/users");
        setAllUsers(data.users || []);
      } catch (e) {
        setError("Failed to load users");
      }
    }
    load();
  }, []);

  const existingIds = useMemo(() => new Set(existingMembers.map((m) => m.userId)), [existingMembers]);
  const candidateUsers = useMemo(() => allUsers.filter((u) => !existingIds.has(u.id)), [allUsers, existingIds]);

  async function addMember() {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/groups/${groupId}/members`, { method: "POST", json: { userId: selectedUserId } });
      setSelectedUserId("");
      onAdded?.();
    } catch (e) {
      setError("Failed to add user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-md font-medium mb-2">Add user to group</h3>
      <div className="flex gap-2 items-center">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select user</option>
          {candidateUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.email ?? u.id}</option>
          ))}
        </select>
        <button
          onClick={addMember}
          disabled={!selectedUserId || loading}
          className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}


