import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ZenSplit
            </Link>
          </div>
          <nav className="flex space-x-8">
            <Link 
              href="/expenses" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Expenses
            </Link>
            <Link 
              href="/groups" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Groups
            </Link>
            <Link 
              href="/profile" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
