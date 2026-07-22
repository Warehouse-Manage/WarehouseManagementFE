export const ROLES = {
  SUPER_ADMIN: 'Admin',
  COMPANY_ADMIN: 'admin company',
  ACCOUNTANT: 'accountant',
} as const;

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function isCompanyAdmin(role: string | null | undefined): boolean {
  return role === ROLES.COMPANY_ADMIN;
}

export function isAccountant(role: string | null | undefined): boolean {
  return role === ROLES.ACCOUNTANT;
}

/** Quyền quản trị trong phạm vi công ty (hoặc toàn hệ thống với Super Admin). */
export function hasCompanyAdminPrivileges(role: string | null | undefined): boolean {
  return isSuperAdmin(role) || isCompanyAdmin(role);
}

/** Quyền truy cập các module kế toán / quản trị như Admin cũ. */
export function canAccessAccounting(role: string | null | undefined): boolean {
  return hasCompanyAdminPrivileges(role) || isAccountant(role);
}

/** Tạo user trong công ty đang đăng nhập (Super Admin hoặc admin company). */
export function canManageCompanyUsers(role: string | null | undefined): boolean {
  return hasCompanyAdminPrivileges(role);
}

/** Xem toàn bộ sổ quỹ — kế toán chỉ thấy phiếu do mình tạo. */
export function canSeeAllFunds(role: string | null | undefined): boolean {
  return hasCompanyAdminPrivileges(role);
}
