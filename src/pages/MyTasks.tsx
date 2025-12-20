import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EnquiryTable } from '@/components/enquiry/EnquiryTable';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, designAPI } from '@/lib/api';
import { onStatusChanged, onAssignmentChanged } from '@/lib/socket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ClipboardCheck, Filter, History, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function MyTasks() {
  const { currentUser } = useAuth();
  const [tasksData, setTasksData] = useState<any>(null);
  const [completedWork, setCompletedWork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isDesigner = currentUser?.role === 'designer';

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const [tasksResponse, completedResponse] = await Promise.all([
          tasksAPI.getMyTasks(),
          isDesigner ? designAPI.getMyCompleted().catch(() => ({ success: true, data: [], count: 0 })) : Promise.resolve({ success: true, data: [], count: 0 })
        ]);
        
        if (tasksResponse.success && tasksResponse.data) {
          setTasksData(tasksResponse.data);
        }
        
        if (completedResponse.success && completedResponse.data) {
          setCompletedWork(Array.isArray(completedResponse.data) ? completedResponse.data : []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Listen for real-time updates
    const handleStatusChange = () => {
      fetchTasks();
    };

    const handleAssignmentChange = () => {
      fetchTasks();
    };

    const cleanup1 = onStatusChanged(handleStatusChange);
    const cleanup2 = onAssignmentChanged(handleAssignmentChange);

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <Header title="My Tasks" subtitle="Loading..." />
        <div className="p-6">
          <div className="text-center py-12">Loading tasks...</div>
        </div>
      </MainLayout>
    );
  }

  const myTasks = tasksData?.tasks || [];
  const tasksByStatus = tasksData?.tasksByStatus || {};
  const workflowStatuses = tasksData?.user?.workflowStatus || currentUser?.workflowStatus || [];

  return (
    <MainLayout>
      <Header 
        title="My Tasks"
        subtitle={`Tasks assigned to you based on your workflow (${currentUser?.role})`}
      />

      <div className="p-6 space-y-6">
        {/* User Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <ClipboardCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentUser?.name}</CardTitle>
                  <CardDescription className="capitalize">{currentUser?.role}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isDesigner && (
                  <Badge variant="outline" className="text-lg px-4 py-1 bg-green-50 text-green-700 border-green-300">
                    <History className="h-4 w-4 mr-1" />
                    {completedWork.length} Completed
                  </Badge>
                )}
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {myTasks.length} Active Tasks
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-2">Your workflow stages:</span>
              {workflowStatuses.map((status: string) => (
                <StatusBadge key={status} status={status as any} size="sm" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Active and Completed (Designers only) */}
        {isDesigner ? (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active Tasks ({myTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed Work ({completedWork.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6 mt-6">
              {/* Active Tasks by Status */}
              {Object.entries(tasksByStatus).map(([status, tasks]: [string, any]) => (
                <div key={status}>
                  <div className="flex items-center gap-3 mb-4">
                    <StatusBadge status={status as any} />
                    <span className="text-sm text-muted-foreground">
                      {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <EnquiryTable enquiries={tasks} />
                </div>
              ))}

              {myTasks.length === 0 && (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No active tasks</h3>
                    <p className="text-muted-foreground">
                      You don't have any tasks assigned to you at the moment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedWork.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No completed work yet</h3>
                    <p className="text-muted-foreground">
                      Your completed design work will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedWork.map((work: any) => {
                    const enquiry = work.enquiry;
                    const completedAt = work.completedAt || work.completed_at;
                    return (
                      <Card key={work.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                  <ClipboardCheck className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                                <span className="text-sm font-mono text-muted-foreground">
                                  {enquiry?.enquiryNum || enquiry?.enquiry_num}
                                </span>
                                {(enquiry?.orderNumber || enquiry?.order_number) && (
                                  <span className="text-xs font-mono text-muted-foreground/70">
                                    | Order: {enquiry?.orderNumber || enquiry?.order_number}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium mb-1">
                                {(enquiry?.client as any)?.clientName || enquiry?.client?.client_name || 'Unknown Client'}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {enquiry?.enquiryDetail || enquiry?.enquiry_detail}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {completedAt && (
                                  <span>
                                    Completed: {format(new Date(completedAt), 'dd MMM yyyy, HH:mm')}
                                  </span>
                                )}
                                {enquiry?.enquiryByUser && (
                                  <span>
                                    Salesperson: {enquiry.enquiryByUser.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/enquiries/${enquiry?.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* Tasks by Status - For non-designers */}
            {Object.entries(tasksByStatus).map(([status, tasks]: [string, any]) => (
              <div key={status}>
                <div className="flex items-center gap-3 mb-4">
                  <StatusBadge status={status as any} />
                  <span className="text-sm text-muted-foreground">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <EnquiryTable enquiries={tasks} />
              </div>
            ))}

            {myTasks.length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No active tasks</h3>
                  <p className="text-muted-foreground">
                    You don't have any tasks assigned to you at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
