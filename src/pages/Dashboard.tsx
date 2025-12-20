import { 
  ClipboardList, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Package,
  Truck,
  AlertCircle,
  IndianRupee,
  FileText,
  ArrowRight,
  Users,
  Activity,
  Shield,
  Download,
  Filter,
  Calendar as CalendarIcon,
  BarChart2,
  UserCheck,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/common/MetricCard';
import { EnquiryTable } from '@/components/enquiry/EnquiryTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI, enquiriesAPI, clientsAPI, usersAPI, designAPI } from '@/lib/api';
import { onNotification } from '@/lib/socket';
import { STATUS_LIST, EnquiryStatus } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/common/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [completedWorkCount, setCompletedWorkCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isDirector = currentUser?.role === 'director';
  const isSalesperson = currentUser?.role === 'salesman';
  const isDesigner = currentUser?.role === 'designer';
  const isProduction = currentUser?.role === 'production';
  const isPurchase = currentUser?.role === 'purchase';
  const isAdminOrDirector = isSuperAdmin || isDirector;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const promises: any[] = [
          dashboardAPI.getStats(),
          enquiriesAPI.getAll({ limit: 100 }),
          clientsAPI.getAll(),
          usersAPI.getAll(),
          isDesigner ? designAPI.getMyCompleted().catch(() => ({ success: true, data: [], count: 0 })) : Promise.resolve({ success: true, data: [], count: 0 })
        ];

        // Add analytics for admin/director
        if (isAdminOrDirector) {
          promises.push(dashboardAPI.getAnalytics(analyticsPeriod));
        }

        const results = await Promise.all(promises);
        const [statsRes, enquiriesRes, clientsRes, usersRes, completedRes, analyticsRes] = results;

        if (statsRes.success) setStats(statsRes.data);
        if (enquiriesRes.success) setEnquiries(Array.isArray(enquiriesRes.data) ? enquiriesRes.data : []);
        if (clientsRes.success) setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
        if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        if (completedRes.success && 'count' in completedRes) {
          setCompletedWorkCount(completedRes.count || (Array.isArray(completedRes.data) ? completedRes.data.length : 0));
        }
        if (analyticsRes?.success) {
          setAnalytics(analyticsRes.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for real-time notifications
    const handleNotification = () => {
      fetchData();
    };

    const cleanup = onNotification(handleNotification);

    return () => {
      cleanup();
    };
  }, [analyticsPeriod, isAdminOrDirector]);

  if (loading) {
    return (
      <MainLayout>
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="p-6">
          <div className="text-center py-12">Loading dashboard...</div>
        </div>
      </MainLayout>
    );
  }

  // Calculate metrics from stats - use backend stats first, fallback to frontend calculations
  const totalEnquiries = stats?.totalEnquiries || enquiries.length;
  const totalValue = stats?.totalValue || enquiries.reduce((sum: number, e: any) => sum + ((e.enquiryAmount || e.enquiry_amount) || 0), 0);
  const pendingEnquiries = stats?.pendingEnquiries || stats?.pendingTasks || enquiries.filter((e: any) => 
    !['Dispatched'].includes(e.status)
  ).length;
  const dispatchedThisMonth = stats?.dispatchedThisMonth || enquiries.filter((e: any) => 
    e.status === 'Dispatched'
  ).length;
  const confirmedOrders = stats?.confirmedOrders || enquiries.filter((e: any) => (e.orderNumber || e.order_number) !== null).length;
  const conversionRate = stats?.conversionRate !== undefined 
    ? stats.conversionRate.toString() 
    : (totalEnquiries > 0 ? (confirmedOrders / totalEnquiries * 100).toFixed(1) : '0');
  
  // User-specific enquiries
  const myEnquiries = isAdminOrDirector ? enquiries : enquiries.filter((e: any) => 
    (e.enquiryBy === currentUser?.id || e.enquiry_by === currentUser?.id) || 
    (e.currentAssignedPerson === currentUser?.id || e.current_assigned_person === currentUser?.id)
  );
  const myTotalValue = stats?.myTotalValue || myEnquiries.reduce((sum: number, e: any) => sum + ((e.enquiryAmount || e.enquiry_amount) || 0), 0);
  
  // Designer's active tasks
  const myTasks = isDesigner ? enquiries.filter((e: any) => 
    e.currentAssignedPerson === currentUser?.id && e.status === 'Design'
  ) : [];

  // Status distribution - ensure all values are numbers, default to 0
  const statusCounts = stats?.enquiriesByStatus?.reduce((acc: any, item: any) => {
    acc[item.status] = item.count || 0;
    return acc;
  }, {} as Record<EnquiryStatus, number>) || STATUS_LIST.reduce((acc, status) => {
    acc[status] = enquiries.filter((e: any) => e.status === status).length || 0;
    return acc;
  }, {} as Record<EnquiryStatus, number>);

  // Ensure all status counts have default values
  STATUS_LIST.forEach(status => {
    if (!statusCounts[status]) {
      statusCounts[status] = 0;
    }
  });

  // Recent enquiries (last 5) - use from stats if available
  const recentEnquiries = stats?.recentEnquiries || enquiries
    .sort((a: any, b: any) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime())
    .slice(0, 5);

  // Recent activity (for superadmin/director) - use from stats if available
  const recentActivity = stats?.recentActivity || (isAdminOrDirector ? enquiries
    .sort((a: any, b: any) => new Date(b.workAssignedDate || b.work_assigned_date).getTime() - new Date(a.workAssignedDate || a.work_assigned_date).getTime())
    .slice(0, 5) : []);

  // Salesperson-specific: enquiries needing attention - use from stats if available
  const needsAttention = isSalesperson ? enquiries.filter((e: any) => 
    (e.status === 'BOQ' || e.status === 'Enquiry') && (e.enquiryBy === currentUser?.id || e.enquiry_by === currentUser?.id)
  ) : [];
  const needsAttentionCount = stats?.needsAttention || needsAttention.length;

  // Workflow progress - use from backend stats if available, otherwise calculate
  const workflowStages = stats?.workflowStages ? [
    { name: 'New', count: stats.workflowStages.new || 0, color: 'bg-blue-500' },
    { name: 'Production', count: stats.workflowStages.production || 0, color: 'bg-amber-500' },
    { name: 'Finishing', count: stats.workflowStages.finishing || 0, color: 'bg-purple-500' },
    { name: 'Ready', count: stats.workflowStages.ready || 0, color: 'bg-green-500' },
  ] : [
    { name: 'New', count: (statusCounts['Enquiry'] || 0) + (statusCounts['Design'] || 0) + (statusCounts['BOQ'] || 0), color: 'bg-blue-500' },
    { name: 'Production', count: (statusCounts['ReadyForProduction'] || 0) + (statusCounts['PurchaseWaiting'] || 0) + (statusCounts['InProduction'] || 0), color: 'bg-amber-500' },
    { name: 'Finishing', count: (statusCounts['ProductionComplete'] || 0) + (statusCounts['Hotdip'] || 0), color: 'bg-purple-500' },
    { name: 'Ready', count: (statusCounts['ReadyForDispatch'] || 0) + (statusCounts['Dispatched'] || 0), color: 'bg-green-500' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(amount);
  };

  return (
    <MainLayout>
      <Header 
        title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'User'}!`}
        subtitle="Here's what's happening with your orders today."
      />

      <div className="p-6 space-y-6">
        {/* Filters & Export Bar - Only for Admin/Director */}
        {isAdminOrDirector && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Statuses" />
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
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isDesigner ? (
            <>
              <MetricCard
                title="Active Tasks"
                value={myTasks.length}
                subtitle="Currently assigned"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <MetricCard
                title="Completed Work"
                value={completedWorkCount}
                subtitle="Total completed"
                icon={<CheckCircle2 className="h-5 w-5" />}
                trend={{ value: completedWorkCount, isPositive: true }}
              />
              <MetricCard
                title="My Tasks"
                value={myTasks.length}
                subtitle="In progress"
                icon={<Clock className="h-5 w-5" />}
              />
            </>
          ) : (
            <>
              <MetricCard
                title={isAdminOrDirector ? "Total Enquiries" : "My Enquiries"}
                value={isAdminOrDirector ? totalEnquiries : myEnquiries.length}
                subtitle={isAdminOrDirector ? "All time" : "Assigned to me"}
                icon={<ClipboardList className="h-5 w-5" />}
                trend={isAdminOrDirector ? { value: 12, isPositive: true } : undefined}
              />
              <MetricCard
                title={isAdminOrDirector ? "Total Order Value" : "My Order Value"}
                value={formatCurrency(isAdminOrDirector ? totalValue : myTotalValue)}
                subtitle={isAdminOrDirector ? "Pipeline value" : "My pipeline"}
                icon={<TrendingUp className="h-5 w-5" />}
                trend={isAdminOrDirector ? { value: 8, isPositive: true } : undefined}
              />
              {isAdminOrDirector && (
                <MetricCard
                  title="Conversion Rate"
                  value={`${conversionRate}%`}
                  subtitle={`${confirmedOrders} confirmed`}
                  icon={<Activity className="h-5 w-5" />}
                  trend={{ value: parseFloat(conversionRate), isPositive: parseFloat(conversionRate) > 60 }}
                />
              )}
              <MetricCard
                title={isAdminOrDirector ? "In Progress" : "Pending Actions"}
                value={isAdminOrDirector ? pendingEnquiries : needsAttentionCount}
                subtitle={isAdminOrDirector ? "Active orders" : "Need attention"}
                icon={<Clock className="h-5 w-5" />}
              />
              <MetricCard
                title="Dispatched"
                value={dispatchedThisMonth}
                subtitle="This month"
                icon={<CheckCircle2 className="h-5 w-5" />}
                trend={{ value: 5, isPositive: true }}
              />
            </>
          )}
        </div>

        {/* Super Admin, Director & Salesperson Enhanced Info */}
        {(isAdminOrDirector || isSalesperson) && (
          <div className="grid gap-6 lg:grid-cols-3">
            {isAdminOrDirector && (
              <>
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                      <Shield className="h-5 w-5 text-orange-600" />
                      System Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Total Clients</span>
                      <Badge className="text-base bg-gray-100 text-gray-700 border-gray-200">{clients.length}</Badge>
                    </div>
                    <Separator className="bg-gray-200" />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <Badge className="text-base bg-gray-100 text-gray-700 border-gray-200">{users.length}</Badge>
                    </div>
                    <Separator className="bg-gray-200" />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Confirmed Orders</span>
                      <Badge className="text-base bg-gray-100 text-gray-700 border-gray-200">{confirmedOrders}</Badge>
                    </div>
                    <Separator className="bg-gray-200" />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Avg Order Value</span>
                      <Badge className="text-base bg-gray-100 text-gray-700 border-gray-200">
                        {formatCurrency(stats?.avgOrderValue || (totalEnquiries > 0 ? totalValue / totalEnquiries : 0))}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                      <Activity className="h-5 w-5 text-orange-600" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription className="text-gray-500">Latest status changes and assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentActivity.map((enquiry: any) => (
                        <div key={enquiry.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={enquiry.status} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{(enquiry as any).enquiryNum || enquiry.enquiry_num}</p>
                              <p className="text-xs text-gray-500">{(enquiry.client as any)?.clientName || enquiry.client?.client_name}</p>
                              {(enquiry.orderNumber || enquiry.order_number) && (
                                <p className="text-xs text-gray-400 font-mono mt-0.5">Order: {enquiry.orderNumber || enquiry.order_number}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {format(new Date(enquiry.workAssignedDate || enquiry.work_assigned_date), 'MMM dd, HH:mm')}
                            </p>
                            <p className="text-xs font-medium text-gray-700">{(enquiry as any).assignedUser?.name || enquiry.assigned_user?.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {isSalesperson && needsAttention.length > 0 && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Enquiries Needing Your Attention
                  </CardTitle>
                  <CardDescription>Follow up required on these enquiries</CardDescription>
                </CardHeader>
                <CardContent>
                  <EnquiryTable enquiries={needsAttention.slice(0, 5)} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions & Pipeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/enquiries/new">
                  <ClipboardList className="h-4 w-4 mr-3" />
                  New Enquiry
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/invoices/new?type=quotation">
                  <FileText className="h-4 w-4 mr-3" />
                  Create Quotation
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/invoices/new?type=invoice">
                  <IndianRupee className="h-4 w-4 mr-3" />
                  Generate Invoice
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/kanban">
                  <Package className="h-4 w-4 mr-3" />
                  Task Board
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Workflow Pipeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Order Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowStages.map((stage) => (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.count} orders</span>
                    </div>
                    <Progress 
                      value={totalEnquiries > 0 ? (stage.count / totalEnquiries) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {STATUS_LIST.map((status) => (
                    <div 
                      key={status}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50"
                    >
                      <StatusBadge status={status} size="sm" />
                      <span className="text-sm font-medium">{statusCounts[status]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Recent */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900">2 orders due today</p>
                  <p className="text-xs text-orange-700">Dispatch pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">3 in production</p>
                  <p className="text-xs text-blue-700">On schedule</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                <Truck className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-900">1 ready for dispatch</p>
                  <p className="text-xs text-purple-700">Awaiting logistics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Enquiries */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Enquiries</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/enquiries">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <EnquiryTable enquiries={recentEnquiries} />
          </div>
        </div>

        {/* Comprehensive Analytics Section - For Directors/Admins */}
        {isAdminOrDirector && analytics && (
          <div className="space-y-6 mt-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                    <BarChart2 className="h-6 w-6 text-orange-600" />
                    Comprehensive Analytics & Team Performance
                  </CardTitle>
                  <Select value={analyticsPeriod} onValueChange={(v: 'week' | 'month' | 'year') => setAnalyticsPeriod(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Breakdown */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Weekly Performance</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1">
                            {analytics.periodBreakdown?.week?.workDone || 0}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {analytics.periodBreakdown?.week?.enquiries || 0} enquiries
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Monthly Performance</p>
                          <p className="text-2xl font-bold text-green-900 mt-1">
                            {analytics.periodBreakdown?.month?.workDone || 0}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {analytics.periodBreakdown?.month?.enquiries || 0} enquiries
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700">Yearly Performance</p>
                          <p className="text-2xl font-bold text-purple-900 mt-1">
                            {analytics.periodBreakdown?.year?.workDone || 0}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            {analytics.periodBreakdown?.year?.enquiries || 0} enquiries
                          </p>
                        </div>
                        <BarChart2 className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Members & Summary */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        Active Team Members ({analytics.activeMembersCount || 0}/{analytics.totalMembers || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {analytics.activeMembers?.slice(0, 10).map((member: any) => (
                          <div key={member.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  member.name?.charAt(0) || 'U'
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{member.workDoneCount} tasks</p>
                              <p className="text-xs text-gray-500">
                                {member.lastActivity && formatDistanceToNow(new Date(member.lastActivity), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-orange-600" />
                        Performance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Total Work Done</span>
                        <Badge className="text-base bg-blue-100 text-blue-700">{analytics.summary?.totalWorkDone || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Total Enquiries</span>
                        <Badge className="text-base bg-green-100 text-green-700">{analytics.summary?.totalEnquiries || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Total Value</span>
                        <Badge className="text-base bg-purple-100 text-purple-700">
                          {formatCurrency(analytics.summary?.totalValue || 0)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Avg Work/Member</span>
                        <Badge className="text-base bg-orange-100 text-orange-700">
                          {analytics.summary?.averageWorkPerMember || 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topPerformers?.slice(0, 5).map((member: any, index: number) => (
                        <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold">
                              {index + 1}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  member.name?.charAt(0) || 'U'
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">{member.workDoneCount}</p>
                            <p className="text-xs text-gray-500">tasks completed</p>
                            <p className="text-xs font-medium text-green-600 mt-1">
                              {formatCurrency(member.workValue || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Role Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Statistics by Role
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(analytics.roleStats || {}).map(([role, stats]: [string, any]) => (
                        <div key={role} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold capitalize">{role}</h4>
                            <Badge variant="outline">{stats.count} members</Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active:</span>
                              <span className="font-medium text-green-600">{stats.activeCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Work Done:</span>
                              <span className="font-medium">{stats.totalWorkDone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Enquiries:</span>
                              <span className="font-medium">{stats.totalEnquiries}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-300">
                              <span className="text-gray-600">Value:</span>
                              <span className="font-bold text-orange-600">{formatCurrency(stats.totalValue || 0)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
