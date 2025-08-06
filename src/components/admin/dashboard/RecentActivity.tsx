"use client";

export function RecentActivity() {
  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
        <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Recent Activity</div>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Check-in Activity – 1 day ago
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Request Approved – 2 days ago
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Equipment Added – 3 days ago
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            User Registered – 4 days ago
          </li>
        </ul>
      </div>
    </div>
  );
}
