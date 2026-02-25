import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import $api from "../../http/api";

export const DeliveryCalculator = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId = user?.companyId?._id || user?.companyId || "";
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) return;
    setSelectedCompanyId(String(actorCompanyId || ""));
  }, [isSuperAdmin, actorCompanyId]);

  async function fetchCompanies() {
    const endpoints = ["/company/all", "/companies/all", "/company/get/all"];
    for (const endpoint of endpoints) {
      try {
        const { data } = await $api.get(endpoint);
        const list = data?.data || data?.companies || [];
        setCompanies(list);
        if (!selectedCompanyId && list?.[0]?._id) {
          setSelectedCompanyId(list[0]._id);
        }
        return;
      } catch {
        // try next endpoint
      }
    }
    setCompanies([]);
  }

  const frameSrc = useMemo(() => {
    const base = "https://home.courierexe.ru/245/calculator";
    const companyId = selectedCompanyId || (isSuperAdmin ? "" : actorCompanyId);
    if (!companyId) return base;
    return `${base}?companyId=${encodeURIComponent(companyId)}`;
  }, [selectedCompanyId, isSuperAdmin, actorCompanyId]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-3 sm:p-5 lg:p-6 rounded-2xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        {isSuperAdmin && (
          <div className="mb-3 max-w-sm">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Kompaniya tanlang
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">Kompaniya tanlang</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name || company.company_name || company._id}
                </option>
              ))}
            </select>
          </div>
        )}

        <iframe
          id="frame"
          src={frameSrc}
          title="Delivery Calculator"
          className="w-full h-[calc(100vh-8.5rem)] border-none block rounded-xl"
          scrolling="auto"
        />
      </div>
    </div>
  );
};
