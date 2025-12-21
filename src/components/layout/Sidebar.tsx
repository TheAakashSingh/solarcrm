import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getVisibleNavItems, canView } from '@/lib/permissions';
import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  Users,
  UserCircle,
  LogOut,
  ChevronDown,
  Kanban,
  FileText,
  Receipt,
  Settings,
  BarChart3,
  Shield,
  Activity,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
  { name: 'Enquiries', href: '/enquiries', icon: ClipboardList, key: 'enquiries' },
  { name: 'Pipeline', href: '/kanban', icon: Kanban, key: 'kanban' },
  { name: 'My Tasks', href: '/my-tasks', icon: ListTodo, key: 'tasks' },
  { name: 'Designer Tasks', href: '/designer-tasks', icon: ListTodo, key: 'designer-tasks', role: 'designer' },
  { name: 'Activity History', href: '/activity', icon: Activity, key: 'activity' },
];

const documentNavigation = [
  { name: 'Quotations', href: '/quotations', icon: FileText, key: 'quotations' },
  { name: 'Invoices', href: '/invoices', icon: Receipt, key: 'invoices' },
];

const managementNavigation = [
  { name: 'Clients', href: '/clients', icon: Users, key: 'clients' },
  { name: 'Reports', href: '/reports', icon: BarChart3, key: 'reports' },
  { name: 'User Management', href: '/users', icon: Shield, key: 'users' },
  { name: 'SMTP Settings', href: '/smtp', icon: Mail, key: 'smtp' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, login, logout } = useAuth();

  const userRole = currentUser?.role || 'salesman';
  const visibleItems = getVisibleNavItems(userRole);

  const NavSection = ({ items, title }: { items: typeof mainNavigation | typeof documentNavigation | typeof managementNavigation; title?: string }) => {
    const filteredItems = items.filter(item => {
      // Check if item is visible based on permissions
      if (!visibleItems.includes(item.key)) return false;
      // Check role-specific items
      if ((item as any).role && (item as any).role !== userRole) return false;
      return true;
    });
    
    if (filteredItems.length === 0) return null;

    return (
      <div className="space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"
              )} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
          <img 
            src="/sunshellconnect.png" 
            alt="SUNSHELL Connect" 
            className="h-10 w-auto object-contain"
          />
          <div>
            <h1 className="text-base font-semibold text-gray-900">SolarCRM</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">SUNSHELL</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <NavSection items={mainNavigation} />
          
          {documentNavigation.filter(item => visibleItems.includes(item.key)).length > 0 && (
            <>
              <div className="px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Documents</p>
              </div>
              <NavSection items={documentNavigation} />
            </>
          )}
          
          {managementNavigation.filter(item => visibleItems.includes(item.key)).length > 0 && (
            <>
              <div className="px-3 py-2 mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Management</p>
              </div>
              <NavSection items={managementNavigation} />
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <Link
            to="/profile"
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors',
              location.pathname === '/profile' && 'bg-orange-50'
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-semibold overflow-hidden">
              {currentUser?.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name || 'User'} 
                  className="h-full w-full object-cover"
                />
              ) : (
                currentUser?.name?.charAt(0) || 'G'
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.name || 'Guest'}
              </p>
              <p className="text-xs capitalize text-gray-500 truncate">
                {currentUser?.role || 'Not logged in'}
              </p>
            </div>
            <UserCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors outline-none">
                <Settings className="h-4 w-4" />
                <span className="flex-1 text-left">Settings</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  logout();
                  navigate('/login');
                }} 
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
