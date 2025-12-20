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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search enquiries..."
            className="w-64 pl-9 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>

        <NotificationBell />

        {showNewEnquiry && (
          <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white">
            <Link to="/enquiries/new">
              <Plus className="mr-2 h-4 w-4" />
              New Enquiry
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
