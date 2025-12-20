import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { onNotification } from '@/lib/socket';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Notification {
  id?: string;
  type: string;
  title: string;
  message: string;
  enquiryId?: string;
  enquiryNum?: string;
  timestamp: string;
  read?: boolean;
}

export function NotificationBell() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await notificationsAPI.getAll();
        if (response.success && response.data) {
          const notifs = Array.isArray(response.data) ? response.data : [];
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Listen for real-time notifications
    const cleanup = onNotification((notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
        action: notification.enquiryId ? {
          label: 'View',
          onClick: () => window.location.href = `/enquiries/${notification.enquiryId}`
        } : undefined
      });
    });

    return cleanup;
  }, [currentUser?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await notificationsAPI.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await notificationsAPI.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.enquiryId) {
      return `/enquiries/${notification.enquiryId}`;
    }
    return '#';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return '📋';
      case 'status_change':
        return '🔄';
      case 'enquiry_created':
        return '✨';
      case 'design_completed':
        return '🎨';
      case 'production_completed':
        return '🏭';
      case 'quotation_created':
        return '📄';
      default:
        return '🔔';
    }
  };

  if (!currentUser) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id || notification.timestamp}
                  to={getNotificationLink(notification)}
                  onClick={() => {
                    if (notification.id && !notification.read) {
                      markAsRead(notification.id);
                    }
                    setIsOpen(false);
                  }}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.timestamp), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
