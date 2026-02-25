import React, { useState, useRef } from "react";
import { MinLoader } from "../loader/MainLoader";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const GlobalTable = ({
  columns,
  visibleColumns,
  sampleData,
  load = false,
  onRowClick,
  // Server-side pagination props
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  useServerPagination = false, // yangi prop: server yoki client-side pagination
}) => {
  const [columnWidths, setColumnWidths] = useState({});
  const [isResizing, setIsResizing] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const tableRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Pagination ma'lumotlarini aniqlash
  const paginationData = useServerPagination
    ? {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
      }
    : {
        currentPage: clientCurrentPage,
        totalPages: Math.ceil((sampleData?.length || 0) / itemsPerPage),
        totalItems: sampleData?.length || 0,
        itemsPerPage,
      };

  const startResizing = (key, e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setActiveColumn(key);

    const startX = e.clientX;
    const startWidth = columnWidths[key] || 150;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(80, startWidth + (e.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    if (useServerPagination) {
      if (onPageChange) {
        onPageChange(pageNumber);
      }
    } else {
      if (pageNumber >= 1 && pageNumber <= paginationData.totalPages) {
        setClientCurrentPage(pageNumber);
        setSelectedRows([]); // Reset selections when changing page
      }
    }
  };

  const goToFirstPage = () => {
    handlePageChange(1);
  };

  const goToPreviousPage = () => {
    if (paginationData.currentPage > 1) {
      handlePageChange(paginationData.currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (paginationData.currentPage < paginationData.totalPages) {
      handlePageChange(paginationData.currentPage + 1);
    }
  };

  const goToLastPage = () => {
    handlePageChange(paginationData.totalPages);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const { totalPages, currentPage } = paginationData;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getVisibleColumns = () => {
    return columns.filter((col) => visibleColumns[col.key]);
  };

  // Get current page data (faqat client-side pagination uchun)
  const getCurrentPageData = () => {
    if (useServerPagination) {
      // Server-side pagination: sampleData allaqachon to'g'ri sahifa ma'lumotlari
      return sampleData || [];
    } else {
      // Client-side pagination: ma'lumotlarni bo'lamiz
      if (!sampleData) return [];
      const startIndex =
        (paginationData.currentPage - 1) * paginationData.itemsPerPage;
      const endIndex = startIndex + paginationData.itemsPerPage;
      return sampleData.slice(startIndex, endIndex);
    }
  };

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const currentIds = getCurrentPageData();
      setSelectedRows(currentIds);
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (row) => {
    setSelectedRows((prevSelected) => {
      const exists = prevSelected.some((r) => r.id === row.id);
      if (exists) {
        return prevSelected.filter((r) => r.id !== row.id);
      } else {
        return [...prevSelected, row];
      }
    });
  };

  const getColumnWidth = (key) => {
    return columnWidths[key] || 150;
  };

  // Pagination info uchun hisoblashlar
  const startItem = useServerPagination
    ? (paginationData.currentPage - 1) * paginationData.itemsPerPage + 1
    : (paginationData.currentPage - 1) * paginationData.itemsPerPage + 1;

  const endItem = useServerPagination
    ? Math.min(
        paginationData.currentPage * paginationData.itemsPerPage,
        paginationData.totalItems
      )
    : Math.min(
        paginationData.currentPage * paginationData.itemsPerPage,
        paginationData.totalItems
      );

  const currentPageData = getCurrentPageData();

  return (
    <div className="bg-white w-full rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Table Container */}
      <div className="relative">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full min-w-max border-collapse">
            <thead className="group">
              <tr className="bg-[#e6f2ed] border-b border-[#cfe3db]">
                <th className="w-8 p-2 text-left border-transparent transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={handleSelectAll}
                    checked={
                      currentPageData.length > 0 &&
                      currentPageData.every((row) =>
                        selectedRows.some((selected) => selected.id === row.id)
                      )
                    }
                  />
                </th>

                {getVisibleColumns().map((col, index) => (
                  <th
                    key={col.key}
                    className="text-left text-sm font-medium text-gray-700 border-r border-[#d9e8e1] transition-colors relative"
                    style={{
                      width: `${getColumnWidth(col.key)}px`,
                      minWidth: `${getColumnWidth(col.key)}px`,
                      maxWidth: `${getColumnWidth(col.key)}px`,
                    }}
                  >
                    <div className="flex justify-between items-center px-2 py-2 h-full relative">
                      <span className="text-[#215e4b] uppercase tracking-wide select-none truncate text-[12px] font-[700]">
                        {col.label}
                      </span>

                      <div
                        onMouseDown={(e) => startResizing(col.key, e)}
                        className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-all duration-200 ${
                          activeColumn === col.key || isResizing
                            ? "bg-[#2db789] opacity-100"
                            : "bg-gray-400 opacity-0 hover:opacity-60"
                        }`}
                        style={{
                          zIndex: 10,
                          transform: "translateX(50%)",
                        }}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {load === true ? (
                <tr>
                  <td
                    colSpan={getVisibleColumns().length + 1}
                    className="text-center py-4 text-gray-500"
                  >
                    <MinLoader />
                  </td>
                </tr>
              ) : currentPageData?.length > 0 ? (
                currentPageData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-200"
                    onClick={(e) => {
                      if (typeof onRowClick === "function") {
                        if (
                          e.target.closest("button") ||
                          e.target.type === "checkbox"
                        ) {
                          return;
                        }
                        onRowClick(row);
                      }
                    }}
                  >
                    <td className="w-8 px-2 py-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedRows.some((r) => r.id === row.id)}
                         onChange={() => handleSelectRow(row)}
                      />
                    </td>

                    {getVisibleColumns().map((col) => (
                      <td
                        key={col.key}
                        className="px-2 py-3 text-[12px] font-[600] text-gray-700"
                        style={{
                          width: `${getColumnWidth(col.key)}px`,
                          minWidth: `${getColumnWidth(col.key)}px`,
                          maxWidth: `${getColumnWidth(col.key)}px`,
                        }}
                      >
                        <div className="truncate">
                          {col.key === "setting" ? (
                            <div className="block">{row[col.key]}</div>
                          ) : (
                            row[col.key] || "-"
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={getVisibleColumns().length + 1}
                    className="text-center py-8 text-gray-500 text-[15px] font-[500]"
                  >
                    Ma'lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-t border-gray-200 bg-[#fafafa]">
          <div className="flex items-center gap-3 sm:space-x-4">
            <span className="text-sm text-gray-700">
              {paginationData.totalItems === 0
                ? "0 dan 0-0"
                : `${startItem} dan ${endItem}-${paginationData.totalItems}`}
            </span>

            {selectedRows.length > 0 && (
              <span className="text-sm text-green-600 font-medium">
                {selectedRows.length} ta tanlandi
              </span>
            )}
          </div>

          {/* Pagination buttons - faqat sahifalar mavjud bo'lsa ko'rsatiladi */}
          {paginationData.totalPages > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={goToFirstPage}
                disabled={paginationData.currentPage === 1}
                className="p-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#249B73] cursor-pointer hover:text-white hover:border-[#249B73] transition-colors"
                title="Birinchi sahifa"
              >
                <ChevronsLeft size={16} />
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={paginationData.currentPage === 1}
                className="p-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#249B73] cursor-pointer hover:text-white hover:border-[#249B73] transition-colors"
                title="Oldingi sahifa"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center space-x-1">
                {getPageNumbers().map((pageNum, index) => (
                  <React.Fragment key={index}>
                    {pageNum === "..." ? (
                      <span className="px-2 py-1 text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded border transition-colors ${
                          paginationData.currentPage === pageNum
                            ? "bg-[#249B73] text-white border-[#249B73] cursor-pointer"
                            : "border-gray-300 hover:bg-[#249B73] hover:text-white hover:border-[#249B73] cursor-pointer"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={
                  paginationData.currentPage === paginationData.totalPages
                }
                className="p-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#249B73] cursor-pointer hover:text-white hover:border-[#249B73] transition-colors"
                title="Keyingi sahifa"
              >
                <ChevronRight size={16} />
              </button>

              <button
                onClick={goToLastPage}
                disabled={
                  paginationData.currentPage === paginationData.totalPages
                }
                className="p-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#249B73] hover:text-white cursor-pointer hover:border-[#249B73] transition-colors"
                title="Oxirgi sahifa"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalTable;
