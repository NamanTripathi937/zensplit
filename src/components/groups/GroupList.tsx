"use client";

import useSWR from "swr";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

type GroupSummary = {
  id: string;
  name: string;
  createdAt: string; // ISO string from API
  members?: { userId: string; name: string | null; email: string | null }[];
};

const fetcher = (url: string) => apiFetch<{ groups: GroupSummary[] }>(url);

export default function GroupList() {
  const { data, error, isLoading } = useSWR<{ groups: GroupSummary[] }>("/api/groups", fetcher, {
    shouldRetryOnError: (err) => String(err?.message ?? "").toLowerCase().includes("unauthorized"),
    errorRetryCount: 2,
    errorRetryInterval: 500,
  });

  if (isLoading) return <p className="text-gray-500">Loading groups...</p>;
  if (error) {
    const msg = String(error?.message ?? "");
    const isAuth = msg.toLowerCase().includes("unauthorized");
    return (
      <p className="text-red-600">
        {isAuth ? "You appear signed out. Please log in to view groups." : "Failed to load groups"}
      </p>
    );
  }

  const groups: GroupSummary[] = data?.groups ?? [];

  return (
    <div className="space-y-2">
      {groups.length === 0 && <p className="text-gray-500">No groups yet.</p>}
      {groups.map((g: GroupSummary) => (
        <div key={g.id} className="p-3 border rounded">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{g.name}</div>
              <div className="text-sm text-gray-500">Created {new Date(g.createdAt).toLocaleString()}</div>
            </div>
            {/* <Link href={`/groups/${g.id}`} className="text-blue-600 hover:underline">Open</Link> */}
          </div>
          <div className="mt-2 text-sm">
            <div className="text-gray-600 mb-1">Members</div>
            {g.members && g.members.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {g.members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between">
                    <span>{m.name ?? m.email ?? m.userId}</span>
                    <code className="text-xs text-gray-400">{m.userId.slice(0, 8)}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No members</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


