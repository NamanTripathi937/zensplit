"use client";

import useSWR from "swr";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

type GroupSummary = {
  id: string;
  name: string;
  createdAt: string; // ISO string from API
};

const fetcher = (url: string) => apiFetch<{ groups: GroupSummary[] }>(url);

export default function GroupList() {
  const { data, error, isLoading } = useSWR<{ groups: GroupSummary[] }>("/api/groups", fetcher);

  if (isLoading) return <p className="text-gray-500">Loading groups...</p>;
  if (error) return <p className="text-red-600">Failed to load groups</p>;

  const groups: GroupSummary[] = data?.groups ?? [];

  return (
    <div className="space-y-2">
      {groups.length === 0 && <p className="text-gray-500">No groups yet.</p>}
      {groups.map((g: GroupSummary) => (
        <Link key={g.id} href={`/groups/${g.id}`} className="block p-3 border rounded hover:bg-gray-50">
          <div className="font-medium">{g.name}</div>
          <div className="text-sm text-gray-500">Created {new Date(g.createdAt).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  );
}


