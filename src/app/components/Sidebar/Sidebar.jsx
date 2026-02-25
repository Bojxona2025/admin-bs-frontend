"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const categories = [
    { name: "Apple Notebooklar", href: "#" },
    { name: "Lenovo Notebooklar", href: "#" },
    { name: "HP Notebooklar", href: "#" },
    { name: "MSI Notebooklar", href: "#" },
    { name: "Acer Notebooklar", href: "#" },
    { name: "ASUS Notebooklar", href: "#" },
    { name: "Dell Notebooklar", href: "#" },
    { name: "Razer Notebooklar", href: "#" },
    { name: "Samsung Notebooklar", href: "#" },
    { name: "LG Notebooklar", href: "#" },
    { name: "Microsoft Surface", href: "#" },
    { name: "Hyper X Kompyuterlar", href: "#" },
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">Notebooklar</h3>
      <ul className="space-y-2 text-sm">
        {categories
          .slice(0, isExpanded ? categories.length : 5)
          .map((category, index) => (
            <li key={index}>
              <a
                href={category.href}
                className="block rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-[#249B73]  transition-colors"
                aria-label={`Kategoriya: ${category.name}`}
              >
                {category.name}
              </a>
            </li>
          ))}
        <li className="flex items-center justify-between">
          <button
            onClick={toggleExpand}
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-[#249B73]  transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Ro‘yxatni yig‘ish" : "Ro‘yxatni ochish"}
          >
            <span>{isExpanded ? "Yig‘ish" : "Ko‘proq ko‘rish"}</span>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </li>
      </ul>
    </div>
  );
}
