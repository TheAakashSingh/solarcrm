import { UserRole, ROLE_HIERARCHY } from '@/types/crm';

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  enquiries: Permission;
  quotations: Permission;
  invoices: Permission;
  clients: Permission;
  reports: Permission;
  kanban: Permission;
  tasks: Permission;
  users: Permission; // User management
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  superadmin: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    enquiries: { view: true, create: true, edit: true, delete: true },
    quotations: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    kanban: { view: true, create: true, edit: true, delete: true },
    tasks: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true }, // Can manage all users including directors
  },
  director: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    enquiries: { view: true, create: true, edit: true, delete: false },
    quotations: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    clients: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: false, edit: true, delete: false },
    users: { view: true, create: true, edit: true, delete: false }, // Can manage users except superadmin
  },
  salesman: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    enquiries: { view: true, create: true, edit: true, delete: false },
    quotations: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    clients: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: false, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
  },
  designer: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    enquiries: { view: true, create: false, edit: true, delete: false },
    quotations: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    kanban: { view: true, create: false, edit: true, delete: false },
    tasks: { view: true, create: false, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
  },
  production: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    enquiries: { view: true, create: false, edit: true, delete: false },
    quotations: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    clients: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: false, edit: true, delete: false },
    tasks: { view: true, create: false, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
  },
  purchase: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    enquiries: { view: true, create: false, edit: true, delete: false },
    quotations: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    clients: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    kanban: { view: true, create: false, edit: true, delete: false },
    tasks: { view: true, create: false, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
  },
};

// Helper functions
export const canView = (role: UserRole, resource: keyof RolePermissions): boolean => {
  return ROLE_PERMISSIONS[role]?.[resource]?.view ?? false;
};

export const canCreate = (role: UserRole, resource: keyof RolePermissions): boolean => {
  return ROLE_PERMISSIONS[role]?.[resource]?.create ?? false;
};

export const canEdit = (role: UserRole, resource: keyof RolePermissions): boolean => {
  return ROLE_PERMISSIONS[role]?.[resource]?.edit ?? false;
};

export const canDelete = (role: UserRole, resource: keyof RolePermissions): boolean => {
  return ROLE_PERMISSIONS[role]?.[resource]?.delete ?? false;
};

export const hasAccess = (role: UserRole, resource: keyof RolePermissions): boolean => {
  return canView(role, resource);
};

// Check if user can manage another user
export const canManageUser = (managerRole: UserRole, targetUserRole: UserRole): boolean => {
  return ROLE_HIERARCHY[managerRole]?.includes(targetUserRole) ?? false;
};

// Navigation items visibility based on role
export const getVisibleNavItems = (role: UserRole) => {
  const visibleItems: string[] = [];
  
  if (canView(role, 'dashboard')) visibleItems.push('dashboard');
  if (canView(role, 'kanban')) visibleItems.push('kanban');
  if (canView(role, 'tasks')) visibleItems.push('tasks');
  if (canView(role, 'enquiries')) visibleItems.push('enquiries');
  if (canView(role, 'quotations')) visibleItems.push('quotations');
  if (canView(role, 'invoices')) visibleItems.push('invoices');
  if (canView(role, 'clients')) visibleItems.push('clients');
  if (canView(role, 'reports')) visibleItems.push('reports');
  if (canView(role, 'users')) visibleItems.push('users');
  // Designer tasks only for designers
  // if (role === 'designer') visibleItems.push('designer-tasks');
  // SMTP settings only for superadmin
  if (role === 'superadmin') visibleItems.push('smtp');
  
  return visibleItems;
};

