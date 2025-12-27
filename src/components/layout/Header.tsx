import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showNewEnquiry?: boolean;
}

export function Header({ title, subtitle, showNewEnquiry = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="flex h-14 md:h-16 items-center justify-between pl-11 md:pl-6 pr-3 sm:pr-4 md:pr-6 gap-2 md:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search enquiries..."
              className="w-48 xl:w-64 pl-9 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <NotificationBell />

          {showNewEnquiry && (
            <Button 
              asChild 
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap text-xs sm:text-sm h-8 md:h-9 px-2 sm:px-3 md:px-4"
            >
              <Link to="/enquiries/new">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:mr-2" />
                <span className="hidden sm:inline">New Enquiry</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
