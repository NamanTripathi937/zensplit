import Link from "next/link";
import { serverApiFetch } from "@/lib/serverApi";

type MemberSummary = { userId: string; name?: string | null; email?: string | null };
type GroupDetail = { group: { id: string; name: string }; members: MemberSummary[] };

async function getGroup(id: string) {
  try {
    return await serverApiFetch<GroupDetail>(`${process.env.NEXT_PUBLIC_APP_URL}/api/groups/${id}`);
  } catch {
    return null;
  }
}

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const data = await getGroup(params.id);
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <p className="text-red-600">Group not found.</p>
        <Link href="/groups" className="text-blue-600 hover:underline">Back to groups</Link>
      </div>
    );
  }
  const { group, members } = data;
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-gray-500">Group ID: {group.id}</p>
      </div>
      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-medium mb-3">Members</h2>
        <ul className="list-disc list-inside text-gray-700">
          {members?.map((m: MemberSummary) => (
            <li key={m.userId}>{m.name ?? m.email ?? m.userId}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}


