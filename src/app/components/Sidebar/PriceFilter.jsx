"use client";

import { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function PriceFilter({ min = 0, max = 1000000 }) {
  const [range, setRange] = useState([min, max]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  const handleMinChange = (e) => {
    const value = Math.min(parseInt(e.target.value) || min, range[1]);
    setRange([value, range[1]]);
  };

  const handleMaxChange = (e) => {
    const value = Math.max(parseInt(e.target.value) || max, range[0]);
    setRange([range[0], value]);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Narx diapazoni</h3>
      <div className="flex items-center justify-between mb-4">
        <input
          type="number"
          value={range[0]}
          onChange={handleMinChange}
          min={min}
          max={range[1]}
          aria-label="Minimal narx"
          className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <span className="mx-2 text-gray-500">—</span>
        <input
          type="number"
          value={range[1]}
          onChange={handleMaxChange}
          min={range[0]}
          max={max}
          aria-label="Maksimal narx"
          className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>
      <div className="px-2">
        <Slider
          range
          min={min}
          max={max}
          step={10000}
          value={range}
          onChange={handleRangeChange}
          trackStyle={{ backgroundColor: "#4f46e5", height: 6 }}
          handleStyle={{
            borderColor: "#4f46e5",
            backgroundColor: "#ffffff",
            height: 16,
            width: 16,
            marginTop: -5,
          }}
          railStyle={{ backgroundColor: "#e5e7eb", height: 6 }}
          className="my-4"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{range[0].toLocaleString()} so‘m</span>
        <span>{range[1].toLocaleString()} so‘m</span>
      </div>
    </div>
  );
}