import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { enquiriesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_LIST, EnquiryStatus } from '@/types/crm';

export default function ActivityHistory() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        // Get all enquiries the user has worked on
        const response = await enquiriesAPI.getMyWorkedEnquiries({ limit: 1000 });
        
        if (response.success && response.data) {
          // Get history for each enquiry
          const allHistories = [];
          for (const enquiry of response.data) {
            try {
              const historyRes = await enquiriesAPI.getHistory(enquiry.id);
              if (historyRes.success && historyRes.data) {
                const histories = Array.isArray(historyRes.data) ? historyRes.data : [];
                allHistories.push(...histories.map((h: any) => ({
                  ...h,
                  enquiry: enquiry
                })));
              }
            } catch (error) {
              console.error(`Error fetching history for enquiry ${enquiry.id}:`, error);
            }
          }
          
          // Sort by date (newest first)
          allHistories.sort((a, b) => {
            const dateA = new Date(a.statusChangedDateTime || a.status_changed_date_time).getTime();
            const dateB = new Date(b.statusChangedDateTime || b.status_changed_date_time).getTime();
            return dateB - dateA;
          });
          
          setActivities(allHistories);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast.error('Failed to load activity history');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const enquiryNum = (activity.enquiry?.enquiryNum || activity.enquiry?.enquiry_num || '').toLowerCase();
      const clientName = ((activity.enquiry?.client as any)?.clientName || activity.enquiry?.client?.client_name || '').toLowerCase();
      const note = (activity.note || '').toLowerCase();
      const userName = (activity.assignedPersonUser?.name || activity.assigned_person_name || '').toLowerCase();
      
      if (!enquiryNum.includes(searchLower) && 
          !clientName.includes(searchLower) && 
          !note.includes(searchLower) &&
          !userName.includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && activity.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const activityDate = new Date(activity.statusChangedDateTime || activity.status_changed_date_time);
      const now = new Date();
      const diffTime = now.getTime() - activityDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (dateFilter === 'today' && diffDays >= 1) return false;
      if (dateFilter === 'week' && diffDays >= 7) return false;
      if (dateFilter === 'month' && diffDays >= 30) return false;
    }

    return true;
  });

  const getActivityIcon = (status: EnquiryStatus) => {
    return <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Activity History" subtitle="Loading..." showNewEnquiry={false} />
        <div className="p-6">
          <div className="text-center py-12">Loading activity history...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Activity History" 
        subtitle={`${filteredActivities.length} activities`}
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by enquiry, client, note, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_LIST.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/([A-Z])/g, ' $1').trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Your activity history will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredActivities.map((activity, index) => {
              const enquiry = activity.enquiry;
              const activityDate = new Date(activity.statusChangedDateTime || activity.status_changed_date_time);
              
              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 border-2 border-orange-200">
                          {getActivityIcon(activity.status)}
                        </div>
                        {index < filteredActivities.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-gray-200 mt-2" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={activity.status} size="sm" />
                              <span className="text-sm font-medium text-gray-900">
                                {activity.enquiry?.enquiryNum || activity.enquiry?.enquiry_num || 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>{(enquiry?.client as any)?.clientName || enquiry?.client?.client_name || 'Unknown Client'}</strong>
                            </p>
                            {activity.note && (
                              <p className="text-sm text-gray-500 mt-1">{activity.note}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3.5 w-3.5" />
                              {format(activityDate, 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs">
                              {format(activityDate, 'HH:mm')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>
                              {activity.assignedPersonUser?.name || activity.assigned_person_name || 'Unknown'}
                            </span>
                          </div>
                          {enquiry?.id && (
                            <Link
                              to={`/enquiries/${enquiry.id}`}
                              className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              View Enquiry
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}

