"use client";
import React, { useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Checkbox } from "@radix-ui/react-checkbox";
import {
  TagIcon,
  SparklesIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

const filters = [
  {
    id: "sotuvda",
    label: "Sotuvda mavjud",
    count: 50461,
    icon: ShoppingBagIcon,
  },
  { id: "chegirma", label: "Chegirmali", count: 6354, icon: TagIcon },
  { id: "yangi", label: "Yangi mahsulot", count: 92789, icon: SparklesIcon },
];

export default function CheckboxFilters() {
  const [checked, setChecked] = useState([]);
  const [inStock, setInStock] = useState(false);
  const [newProducts, setNewProducts] = useState(false);
  const [discounted, setDiscounted] = useState(false);

  const toggleFilter = (id) => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Switch Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-green-50">
          <span className="text-sm font-medium text-gray-700">
            Borda mavjud
          </span>
          <Switch
            checked={inStock}
            onCheckedChange={setInStock}
            className="data-[state=checked]:bg-[#249B73]  rounded-full transition-colors"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-green-50">
          <span className="text-sm font-medium text-gray-700">
            Yangi mahsulotlar
          </span>
          <Switch
            checked={newProducts}
            onCheckedChange={setNewProducts}
            className="data-[state=checked]:bg-[#249B73]  rounded-full transition-colors"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-green-50">
          <span className="text-sm font-medium text-gray-700">
            Chegirmali mahsulot
          </span>
          <Switch
            checked={discounted}
            onCheckedChange={setDiscounted}
            className="data-[state=checked]:bg-[#249B73]  rounded-full transition-colors"
          />
        </div>
      </div>

      {/* Checkbox Filters */}
      <div className="space-y-2">
        {filters.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-50"
          >
            <Checkbox
              id={filter.id}
              checked={checked.includes(filter.id)}
              onCheckedChange={() => toggleFilter(filter.id)}
              className="h-5 w-5 rounded border-gray-300 text-[#249B73]  focus:ring-green-500"
            />
            <filter.icon className="h-5 w-5 text-gray-500" />
            <label
              htmlFor={filter.id}
              className="flex-1 cursor-pointer text-sm font-medium text-gray-700"
            >
              {filter.label}
            </label>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {filter.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
