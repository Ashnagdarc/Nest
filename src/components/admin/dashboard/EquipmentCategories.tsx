"use client";

import { Gear } from "@/types/dashboard";

interface EquipmentCategoriesProps {
  gears: Gear[];
}

export function EquipmentCategories({ gears }: EquipmentCategoriesProps) {
  const categoriesMap: Record<string, number> = {};
  gears.forEach((g: Gear) => {
    if (!g.category) return;
    categoriesMap[g.category] = (categoriesMap[g.category] || 0) + 1;
  });
  const categories = Object.entries(categoriesMap).map(([name, count]) => ({ name, count }));

  return (
    <div className="sm:col-span-2 lg:col-span-6">
      <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent">
        <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Equipment Categories</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div key={cat.name} className="border border-gray-300 dark:border-gray-700 rounded-xl p-3 sm:p-4 bg-white dark:bg-transparent flex flex-col items-center text-center">
              <span className="text-sm sm:text-base font-semibold text-black dark:text-white truncate w-full">{cat.name}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-500 mt-2">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
