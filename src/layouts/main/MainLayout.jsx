import { Outlet } from "react-router-dom";
import { useState } from "react";
import Navbar from "../../components/navigations/Navigation";

export const MainLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="w-full overflow-x-hidden min-h-screen bg-[#f3f4f6]">
      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onSidebarExpandChange={setIsSidebarExpanded}
      />
      <div className={`pt-16 transition-all duration-500 ease-in-out ${isSidebarExpanded ? "lg:pl-64" : "lg:pl-20"}`}>
        <div className="p-2 sm:p-4">
        <Outlet />
        </div>
      </div>
    </div>
  );
};
