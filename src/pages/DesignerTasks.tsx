import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { designAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Eye, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function DesignerTasks() {
  const { currentUser } = useAuth();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'all-tasks'>('my-tasks');

  useEffect(() => {
    if (currentUser?.role !== 'designer') {
      toast.error('Only designers can access this page');
      return;
    }

    fetchTasks();
  }, [currentUser]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch my tasks (pending and in_progress)
      const myTasksResponse = await designAPI.getMyTasks('pending');
      const inProgressResponse = await designAPI.getMyTasks('in_progress');
      
      if (myTasksResponse.success && myTasksResponse.data) {
        const pending = Array.isArray(myTasksResponse.data) ? myTasksResponse.data : [];
        const inProgress = inProgressResponse.success && inProgressResponse.data 
          ? (Array.isArray(inProgressResponse.data) ? inProgressResponse.data : [])
          : [];
        setMyTasks([...inProgress, ...pending]);
      }

      // Fetch all tasks (including completed)
      const allTasksResponse = await designAPI.getMyTasks();
      if (allTasksResponse.success && allTasksResponse.data) {
        setAllTasks(Array.isArray(allTasksResponse.data) ? allTasksResponse.data : []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTaskCard = (designWork: any) => {
    const enquiry = designWork.enquiry || {};
    const client = enquiry.client || {};
    const enquiryBy = enquiry.enquiryByUser || {};
    
    return (
      <Card key={designWork.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">
                <Link 
                  to={`/enquiries/${enquiry.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {enquiry.enquiryNum || 'N/A'}
                </Link>
                {enquiry.orderNumber && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    (Order: {enquiry.orderNumber})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.clientName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {enquiry.enquiryDate 
                        ? format(new Date(enquiry.enquiryDate), 'dd MMM yyyy')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(designWork.designStatus)}
              <StatusBadge status={enquiry.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Sales Person:</p>
              <p className="text-sm">{enquiryBy.name || 'N/A'}</p>
            </div>
            {designWork.clientRequirements && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Requirements:</p>
                <p className="text-sm line-clamp-2">{designWork.clientRequirements}</p>
              </div>
            )}
            {designWork.designerNotes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">My Notes:</p>
                <p className="text-sm line-clamp-2">{designWork.designerNotes}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {designWork.updatedAt 
                  ? `Updated: ${format(new Date(designWork.updatedAt), 'dd MMM yyyy, HH:mm')}`
                  : ''}
              </div>
              <Link to={`/enquiries/${enquiry.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (currentUser?.role !== 'designer') {
    return (
      <MainLayout>
        <Header />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Only designers can access this page.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Designer Tasks</h1>
          <p className="text-muted-foreground">Manage your design tasks and view all completed work</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="my-tasks">
              My Tasks ({myTasks.length})
            </TabsTrigger>
            <TabsTrigger value="all-tasks">
              All Tasks ({allTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-tasks">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No tasks assigned to you yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {myTasks.map(renderTaskCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-tasks">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : allTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No tasks found.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {allTasks.map(renderTaskCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

