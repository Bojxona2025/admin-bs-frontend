export const normalizeRole = (role) =>
  String(role || "").toLowerCase().replace(/[_\s]/g, "");

export const getRoleLabelUz = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === "user") return "Foydalanuvchi";
  if (normalized === "employee") return "Xodim";
  if (normalized === "admin") return "Administrator";
  if (normalized === "superadmin") return "Super administrator";
  return role || "-";
};

