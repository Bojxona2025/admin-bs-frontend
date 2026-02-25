import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, totalItems, rowsPerPage, onPageChange }) => {
  console.log(currentPage)
  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  // Sahifalarni chiqarish (max 5 dona ko‘rsatamiz)
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      start = 1;
      end = Math.min(5, totalPages);
    }
    
    if (currentPage >= totalPages - 2) {
      start = Math.max(totalPages - 4, 1);
      end = totalPages;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-8 sm:mt-12 px-2 sm:px-6 py-4 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-100 gap-4 sm:gap-0">
      {/* Jami ma'lumot */}
      <div className="text-xs sm:text-sm text-slate-600 font-medium text-center sm:text-left">
        Jami <span className="font-bold text-slate-900">{totalItems}</span> ta mahsulotdan{" "}
        <span className="font-bold text-slate-900">{startItem}-{endItem}</span> ko'rsatilmoqda
      </div>

      {/* Pagination tugmalari */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer   border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
        </button>

        {getPageNumbers().map((number) => (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`px-3 cursor-pointer sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border font-semibold transition-all duration-200 hover:scale-105 text-sm ${
              number === currentPage
                ? "bg-gradient-to-r from-[#2db789] to-[#2db789] text-white border-transparent shadow-lg"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {number}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 sm:p-3 rounded-lg sm:rounded-xl cursor-pointer border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
        >
          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;