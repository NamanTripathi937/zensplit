import CreateGroupForm from "@/components/groups/CreateGroupForm";
import GroupList from "@/components/groups/GroupList";

export default function GroupsPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="text-gray-600">Create a group and start splitting expenses.</p>
      </div>
      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-medium mb-3">Create a new group</h2>
        <CreateGroupForm />
      </div>
      <div className="p-4 border rounded bg-white">
        <h2 className="text-lg font-medium mb-3">Your groups</h2>
        <GroupList />
      </div>
    </div>
  );
}


