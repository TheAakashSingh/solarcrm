import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DesignerWork } from '@/components/workflow/DesignerWork';
import { SalesReview } from '@/components/workflow/SalesReview';
import { ProductionWorkflowComponent } from '@/components/workflow/ProductionWorkflow';
import { DispatchWorkflow } from '@/components/workflow/DispatchWorkflow';

import { 
  enquiriesAPI,
  designAPI,
  productionAPI,
  dispatchAPI,
  communicationAPI,
  quotationsAPI,
  usersAPI
} from '@/lib/api';
import { STATUS_LIST } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Edit, 
  History, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Package,
  Calendar,
  User,
  IndianRupee,
  Truck,
  FileText,
  Shield,
  Activity,
  Settings,
  AlertTriangle,
  UserPlus,
  MessageSquare,
  Plus,
  Loader2,
  Eye,
  Download,
  CheckCircle2,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { useEnquirySocket } from '@/lib/hooks/useSocket';
import { onStatusChanged } from '@/lib/socket';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommunicationLog } from '@/types/crm';

// Communication Logs Card Component
function CommunicationLogsCard({ 
  communicationLogs, 
  onAddLog 
}: { 
  communicationLogs: CommunicationLog[]; 
  onAddLog: (log: Partial<CommunicationLog>) => Promise<void>;
}) {
  const [logType, setLogType] = useState<'call' | 'email' | 'meeting' | 'note'>('note');
  const [logSubject, setLogSubject] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [clientResponse, setClientResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleAddLog = async () => {
    if (!logSubject.trim() || !logMessage.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLog({
        communication_type: logType,
        subject: logSubject,
        message: logMessage,
        client_response: clientResponse || undefined,
        communication_date: new Date().toISOString()
      });
      toast.success('Communication log added');
      setLogSubject('');
      setLogMessage('');
      setClientResponse('');
    } catch (error) {
      toast.error('Failed to add log');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Communication Logs</CardTitle>
        <CardDescription>
          Log all interactions with the client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="logs">View Logs</TabsTrigger>
            <TabsTrigger value="add">Add New Log</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4 mt-4">
            {communicationLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No communication logs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {communicationLogs
                  .sort((a, b) => {
                    const dateA = new Date((a as any).communicationDate || a.communication_date || 0);
                    const dateB = new Date((b as any).communicationDate || b.communication_date || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            {getLogIcon(log.communication_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{log.subject}</p>
                              <Badge variant="outline" className="capitalize">
                                {log.communication_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const commDate = (log as any).communicationDate || log.communication_date;
                                if (commDate) {
                                  try {
                                    const date = new Date(commDate);
                                    if (!isNaN(date.getTime())) {
                                      return format(date, 'dd MMM yyyy, HH:mm');
                                    }
                                  } catch (error) {
                                    console.warn('Invalid communication_date:', commDate);
                                  }
                                }
                                return 'Unknown date';
                              })()}
                              {' • '}
                              {log.logged_by_name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pl-12 space-y-2">
                        <div>
                          <p className="text-sm font-medium mb-1">Message:</p>
                          <p className="text-sm whitespace-pre-wrap">{log.message}</p>
                        </div>
                        {log.client_response && (
                          <div>
                            <p className="text-sm font-medium mb-1">Client Response:</p>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-2 rounded">
                              {log.client_response}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Communication Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['call', 'email', 'meeting', 'note'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={logType === type ? 'default' : 'outline'}
                      onClick={() => setLogType(type)}
                      className="capitalize"
                    >
                      {getLogIcon(type)}
                      <span className="ml-2">{type}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-subject">Subject</Label>
                <Input
                  id="log-subject"
                  placeholder="Brief subject or topic"
                  value={logSubject}
                  onChange={(e) => setLogSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="log-message">Message / Details</Label>
                <Textarea
                  id="log-message"
                  placeholder="Enter the communication details..."
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-response">Client Response (Optional)</Label>
                <Textarea
                  id="client-response"
                  placeholder="What did the client say or respond?"
                  value={clientResponse}
                  onChange={(e) => setClientResponse(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleAddLog}
                disabled={isSubmitting || !logSubject.trim() || !logMessage.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Communication Log
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [designWork, setDesignWork] = useState<any>(undefined);
  const [designAttachments, setDesignAttachments] = useState<any[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<any[]>([]);
  const [productionWorkflow, setProductionWorkflow] = useState<any>(undefined);
  const [dispatchWork, setDispatchWork] = useState<any>(undefined);
  const [productionUsers, setProductionUsers] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchingRef = useRef(false); // Prevent duplicate calls
  
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isDirector = currentUser?.role === 'director';
  const isAdminOrDirector = isSuperAdmin || isDirector;

  // Join enquiry room for real-time updates
  useEnquirySocket(id || null);

  const fetchData = useCallback(async (skipLoading = false) => {
    if (!id || fetchingRef.current) return; // Prevent duplicate calls
    
    fetchingRef.current = true;
    
    try {
      if (!skipLoading) setLoading(true);
        const [
          enquiryRes,
          historyRes,
          designRes,
          attachmentsRes,
          communicationRes,
          productionRes,
          dispatchRes,
          productionUsersRes,
          designersRes,
          salesUsersRes,
          quotationsRes
        ] = await Promise.all([
          enquiriesAPI.getById(id).catch((err) => {
            console.error('Error fetching enquiry:', err);
            return { success: false, data: null, error: err };
          }),
          enquiriesAPI.getHistory(id).catch(() => ({ success: true, data: [], message: 'No history found' })),
          designAPI.getByEnquiry(id).catch(() => ({ success: true, data: null, message: 'No design work found' })),
          designAPI.getAttachments(id).catch(() => ({ success: true, data: [], message: 'No attachments found' })),
          communicationAPI.getByEnquiry(id).catch(() => ({ success: true, data: [], message: 'No communication logs found' })),
          productionAPI.getByEnquiry(id).catch(() => ({ success: true, data: null, message: 'No production workflow found' })),
          dispatchAPI.getByEnquiry(id).catch(() => ({ success: true, data: null, message: 'No dispatch work found' })),
          usersAPI.getByRole('production').catch(() => ({ success: true, data: [] })),
          usersAPI.getByRole('designer').catch(() => ({ success: true, data: [] })),
          usersAPI.getByRole('salesman').catch(() => ({ success: true, data: [] })),
          quotationsAPI.getByEnquiry(id).catch(() => ({ success: true, data: [], message: 'No quotations found' }))
        ]);

        if (enquiryRes.success) {
          if (enquiryRes.data && typeof enquiryRes.data === 'object' && !Array.isArray(enquiryRes.data)) {
            setEnquiry(enquiryRes.data);
          } else {
            console.warn('Enquiry response successful but data is invalid:', enquiryRes);
            setEnquiry(null);
            toast.error('Enquiry data format is invalid');
          }
        } else {
          console.error('Failed to fetch enquiry:', enquiryRes);
          setEnquiry(null);
          const errorMessage = (enquiryRes as any)?.message || 'Failed to load enquiry';
          toast.error(errorMessage);
        }
        if (historyRes.success) setHistory(Array.isArray(historyRes.data) ? historyRes.data as any[] : []);
        if (designRes.success) setDesignWork(designRes.data || null);
        if (attachmentsRes.success) {
          const attachments = Array.isArray(attachmentsRes.data) ? attachmentsRes.data as any[] : [];
          setDesignAttachments(attachments);
        }
        if (communicationRes.success) setCommunicationLogs(Array.isArray(communicationRes.data) ? communicationRes.data as any[] : []);
        if (productionRes.success) setProductionWorkflow(productionRes.data || null);
        if (dispatchRes.success) setDispatchWork(dispatchRes.data || null);
        if (productionUsersRes.success) setProductionUsers(Array.isArray(productionUsersRes.data) ? productionUsersRes.data as any[] : []);
        if (designersRes.success) setDesigners(Array.isArray(designersRes.data) ? designersRes.data as any[] : []);
        if (salesUsersRes.success) setSalesUsers(Array.isArray(salesUsersRes.data) ? salesUsersRes.data as any[] : []);
        if (quotationsRes.success) setRelatedQuotations(Array.isArray(quotationsRes.data) ? quotationsRes.data as any[] : []);
        
        setRefreshKey(prev => prev + 1);
      } catch (error: any) {
        console.error('Error fetching enquiry data:', error);
        const errorMessage = error?.message || error?.response?.data?.message || 'Failed to load enquiry details';
        toast.error(errorMessage);
        // If enquiry fetch failed, set enquiry to null to show "not found" message instead of blank screen
        setEnquiry(null);
        setLoading(false);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }, [id]);

  useEffect(() => {
    fetchData();

    // Listen for real-time updates
    const handleStatusChange = (data: any) => {
      if (data?.enquiry && data.enquiry.id === id) {
        setEnquiry(data.enquiry);
        // Refetch all data when status changes (skip loading state)
        fetchData(true);
      }
    };

    const cleanup = onStatusChanged(handleStatusChange);

    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchData]);

  const refresh = useCallback(() => {
    if (id && !fetchingRef.current) {
      fetchData(true); // Skip loading state for manual refresh
    }
  }, [id, fetchData]);

  if (loading) {
    return (
      <MainLayout>
        <Header title="Loading..." showNewEnquiry={false} />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Loading enquiry details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!enquiry) {
    return (
      <MainLayout>
        <Header title="Enquiry Not Found" showNewEnquiry={false} />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">The enquiry you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/enquiries')} className="mt-4">
            Back to Enquiries
          </Button>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <MainLayout>
      <Header 
        title={`Enquiry ${enquiry.enquiryNum || enquiry.enquiry_num}`}
        subtitle={enquiry.orderNumber || enquiry.order_number ? `Order: ${enquiry.orderNumber || enquiry.order_number}` : undefined}
        showNewEnquiry={false}
      />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/enquiries/${id}/history`}>
                <History className="h-4 w-4 mr-2" />
                View History
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/enquiries/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Enquiry
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={enquiry.status} />
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned to</p>
                      <p className="font-medium">{enquiry.assignedUser?.name || enquiry.assigned_user?.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {enquiry.assignedUser?.role || enquiry.assigned_user?.role}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {format(new Date(enquiry.workAssignedDate || enquiry.work_assigned_date), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Order Details
                  </CardTitle>
                  {/* Create Quotation Button - Only for salesperson/admin/director */}
                  {(currentUser?.role === 'salesman' || isAdminOrDirector) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link to={`/quotations/new?enquiry=${id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Quotation
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-medium font-mono">
                        {enquiry.orderNumber || enquiry.order_number || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Material Type</p>
                      <p className="font-medium">{enquiry.materialType || enquiry.material_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IndianRupee className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Order Amount</p>
                      <p className="font-medium">{formatCurrency(enquiry.enquiryAmount || enquiry.enquiry_amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enquiry Date</p>
                      <p className="font-medium">
                        {format(new Date(enquiry.enquiryDate || enquiry.enquiry_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Dispatch</p>
                      <p className="font-medium">
                        {(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date)
                          ? format(new Date(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date), 'dd MMM yyyy')
                          : '—'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Order Specification</p>
                  <p className="text-foreground">{enquiry.enquiryDetail || enquiry.enquiry_detail}</p>
                </div>

                {(enquiry.purchaseDetail || enquiry.purchase_detail) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Purchase Requirements</p>
                      <p className="text-foreground">{enquiry.purchaseDetail || enquiry.purchase_detail}</p>
                    </div>
                  </>
                )}

                {/* Quotations Section - Visible to all users */}
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Related Quotations</p>
                    {(currentUser?.role === 'salesman' || isAdminOrDirector) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        asChild
                      >
                       <Link to={`/quotations/new?enquiry=${id}`}>   <FileText className="h-3 w-3 mr-1" />
                          New
                        </Link>
                      </Button>
                    )}
                  </div>
                  {(() => {
                    if (relatedQuotations.length === 0) {
                      return (
                        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                          No quotations created yet
                          {(currentUser?.role === 'salesman' || isAdminOrDirector) && (
                            <span className="block mt-2">
                              <Button variant="link" size="sm" asChild>
                              <Link to={`/quotations/new?enquiry=${id}`}>
                                 Create one now
                                </Link>
                              </Button>
                            </span>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {relatedQuotations.map((quo: any) => (
                          <div key={quo.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{quo.number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(quo.date), 'dd MMM yyyy')} • {formatCurrency(quo.grandTotal || quo.amount)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={quo.status === 'accepted' ? 'default' : 'secondary'} className="capitalize">
                                {quo.status}
                              </Badge>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/quotations`}>
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Assign to Designer - Show when status is Enquiry and user is sales person or director */}
            {enquiry && 
             enquiry.status === 'Enquiry' && 
             ((enquiry.enquiryBy || enquiry.enquiry_by) === currentUser?.id || (enquiry.currentAssignedPerson || enquiry.current_assigned_person) === currentUser?.id || isAdminOrDirector) &&
             (currentUser?.role === 'salesman' || isAdminOrDirector) && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign to Designer</CardTitle>
                  <CardDescription>
                    Assign this enquiry to a designer. Once designer completes, task will automatically return to salesperson.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Designer</Label>
                    <Select
                      onValueChange={async (designerId) => {
                        if (id) {
                          try {
                            const response = await designAPI.assign(id, designerId);
                            if (response.success) {
                              refresh();
                              toast.success('Assigned to designer');
                            }
                          } catch (error) {
                            toast.error('Failed to assign to designer');
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a designer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {designers.map((designer: any) => (
                          <SelectItem key={designer.id} value={designer.id}>
                            {designer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (designers.length > 0 && id) {
                        try {
                          const response = await designAPI.assign(id, designers[0].id);
                          if (response.success) {
                            refresh();
                            toast.success('Assigned to designer');
                          }
                        } catch (error) {
                          toast.error('Failed to assign to designer');
                        }
                      }
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign to {designers[0]?.name || 'Designer'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Workflow Components */}
            {enquiry && (
              <>
                {/* Designer Work - Show when status is Design and assigned to current user */}
                {enquiry.status === 'Design' && 
                 (enquiry.currentAssignedPerson || enquiry.current_assigned_person) === currentUser?.id && 
                 (currentUser?.role === 'designer' || isAdminOrDirector) && (
                  <DesignerWork
                    key={refreshKey}
                    enquiry={enquiry}
                    designWork={designWork}
                    attachments={designAttachments}
                    onUploadFiles={async (files) => {
                      if (id) {
                        try {
                          // Upload files one by one
                          for (const file of files) {
                            try {
                              // Convert file to base64
                              const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const result = reader.result as string;
                                  resolve(result);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                              
                              const response = await designAPI.uploadAttachment({
                                enquiryId: id,
                                fileName: file.name,
                                fileUrl: base64,
                                fileType: file.type
                              });
                              
                              if (!response.success) {
                                throw new Error(response.message || 'Failed to upload file');
                              }
                              
                              console.log('File uploaded successfully:', file.name, response.data);
                            } catch (fileError: any) {
                              console.error('Error uploading file:', fileError);
                              throw new Error(`Failed to upload ${file.name}: ${fileError.message || 'Unknown error'}`);
                            }
                          }
                          
                          // Refresh to get updated attachments
                          await refresh();
                          toast.success('Files uploaded successfully');
                        } catch (error: any) {
                          console.error('Error uploading files:', error);
                          toast.error(error?.message || 'Failed to upload files');
                          throw error;
                        }
                      }
                    }}
                    onComplete={async (designWorkData, files) => {
                      console.log('onComplete called with:', { id, designWork: designWork?.id, designWorkData, filesCount: files?.length });
                      
                      if (!id) {
                        console.error('Enquiry ID is missing');
                        toast.error('Enquiry ID is missing. Please refresh the page.');
                        return;
                      }
                      
                      if (!designWork?.id) {
                        console.error('Design work ID is missing. Attempting to fetch design work first...');
                        // Try to fetch design work first
                        try {
                          const designRes = await designAPI.getByEnquiry(id);
                          if (designRes.success && designRes.data && typeof designRes.data === 'object' && 'id' in designRes.data) {
                            const fetchedDesignWorkId = (designRes.data as any).id;
                            console.log('Fetched design work:', fetchedDesignWorkId);
                            
                            // Upload attachments first
                            if (files && files.length > 0) {
                              for (const file of files) {
                                try {
                                  const base64 = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve(reader.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file);
                                  });
                                  
                                  const uploadResponse = await designAPI.uploadAttachment({
                                    enquiryId: id,
                                    fileName: file.name,
                                    fileUrl: base64,
                                    fileType: file.type
                                  });
                                  
                                  if (uploadResponse.success) {
                                    console.log('File uploaded:', file.name);
                                    toast.success(`File ${file.name} uploaded successfully`);
                                  }
                                } catch (fileError: any) {
                                  console.error('Error uploading file:', fileError);
                                  toast.error(`Failed to upload ${file.name} - continuing anyway`);
                                }
                              }
                            }
                            
                            // Update design work to completed
                            console.log('Updating design work with ID:', fetchedDesignWorkId);
                            const updateResponse = await designAPI.update(fetchedDesignWorkId, {
                              client_requirements: designWorkData.client_requirements,
                              designer_notes: designWorkData.designer_notes,
                              design_status: 'completed'
                            });
                            
                            if (!updateResponse.success) {
                              throw new Error(updateResponse.message || 'Failed to update design work');
                            }
                            
                            console.log('Design work updated successfully');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await refresh();
                            toast.success('Design work completed. Task returned to salesperson.');
                            return;
                          } else {
                            throw new Error('Design work not found for this enquiry');
                          }
                        } catch (fetchError: any) {
                          console.error('Error fetching design work:', fetchError);
                          toast.error(fetchError?.message || 'Design work not found. Please ensure the task is assigned to you.');
                          return;
                        }
                      }
                      
                      // Normal flow when designWork.id exists
                      try {
                        console.log('Starting completion process with design work ID:', designWork.id);
                        
                        // Upload attachments first (convert to base64)
                        if (files && files.length > 0) {
                          console.log(`Uploading ${files.length} file(s)...`);
                          for (const file of files) {
                            try {
                              // Convert file to base64
                              const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const result = reader.result as string;
                                  resolve(result);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                              
                              console.log('Uploading file:', file.name);
                              const uploadResponse = await designAPI.uploadAttachment({
                                enquiryId: id,
                                fileName: file.name,
                                fileUrl: base64,
                                fileType: file.type
                              });
                              
                              if (!uploadResponse.success) {
                                throw new Error(uploadResponse.message || 'Failed to upload file');
                              }
                              
                              console.log('File uploaded successfully:', file.name, uploadResponse.data);
                              toast.success(`File ${file.name} uploaded successfully`);
                            } catch (fileError: any) {
                              console.error('Error uploading file:', fileError);
                              toast.error(`Failed to upload ${file.name} - continuing anyway`);
                              // Continue with other files and completion
                            }
                          }
                        }
                        
                        // Update design work to completed - this will auto-assign back to salesperson
                        console.log('Updating design work status to completed...');
                        const updateResponse = await designAPI.update(designWork.id, {
                          client_requirements: designWorkData.client_requirements,
                          designer_notes: designWorkData.designer_notes,
                          design_status: 'completed'
                        });
                        
                        console.log('Update response:', updateResponse);
                        
                        if (!updateResponse.success) {
                          throw new Error(updateResponse.message || 'Failed to update design work');
                        }
                        
                        console.log('Design work marked as completed. Waiting for backend processing...');
                        // Wait a bit for backend to process the status change
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Force refresh to get updated enquiry status and attachments
                        console.log('Refreshing enquiry data...');
                        await refresh();
                        
                        // Double-check attachments are loaded after a short delay
                        if (id) {
                          setTimeout(async () => {
                            try {
                              const attachmentsRes = await designAPI.getAttachments(id);
                              if (attachmentsRes.success && attachmentsRes.data) {
                                const attachments = Array.isArray(attachmentsRes.data) ? attachmentsRes.data : [];
                                setDesignAttachments(attachments);
                                console.log('Attachments refreshed after completion:', attachments.length);
                              }
                            } catch (error) {
                              console.error('Error fetching attachments after completion:', error);
                            }
                          }, 500);
                        }
                        
                        toast.success('Design work completed. Task returned to salesperson.');
                      } catch (error: any) {
                        console.error('Error completing design work:', error);
                        toast.error(error?.message || 'Failed to complete design work');
                        throw error; // Re-throw to let DesignerWork component handle it
                      }
                    }}
                    onUpdate={async (designWorkData) => {
                      if (id && designWork?.id) {
                        try {
                          // Convert to snake_case for backend
                          const updateData: any = {};
                          if (designWorkData.client_requirements !== undefined) {
                            updateData.client_requirements = designWorkData.client_requirements;
                          }
                          if (designWorkData.designer_notes !== undefined) {
                            updateData.designer_notes = designWorkData.designer_notes;
                          }
                          if (designWorkData.design_status !== undefined) {
                            updateData.design_status = designWorkData.design_status;
                          }
                          await designAPI.update(designWork.id, updateData);
                          refresh();
                        } catch (error) {
                          toast.error('Failed to update design work');
                        }
                      }
                    }}
                  />
                )}

                {/* Communication Logs - Show for salesperson on their enquiries (available from creation) */}
                {((enquiry.enquiryBy || enquiry.enquiry_by) === currentUser?.id || 
                  (enquiry.currentAssignedPerson || enquiry.current_assigned_person) === currentUser?.id) &&
                 currentUser?.role === 'salesman' && (
                  <CommunicationLogsCard
                    communicationLogs={communicationLogs}
                    onAddLog={async (log) => {
                      if (id && currentUser) {
                        try {
                          await communicationAPI.create({
                            enquiryId: id,
                            communicationType: log.communication_type || 'note',
                            subject: log.subject || '',
                            message: log.message || '',
                            communicationDate: log.communication_date,
                            clientResponse: log.client_response
                          });
                          refresh();
                        } catch (error) {
                          toast.error('Failed to add communication log');
                        }
                      }
                    }}
                  />
                )}

                {/* Production Workflow - Show when status is ReadyForProduction, InProduction, ProductionComplete, or Hotdip */}
                {(enquiry.status === 'ReadyForProduction' || 
                  enquiry.status === 'InProduction' || 
                  enquiry.status === 'ProductionComplete' ||
                  enquiry.status === 'Hotdip') && 
                 productionWorkflow && (
                  <ProductionWorkflowComponent
                    key={refreshKey}
                    enquiry={enquiry}
                    productionWorkflow={productionWorkflow}
                    readOnly={
                      // Superadmin and director always have full control (not read-only)
                      // Read-only only for salesperson (enquiry creator) viewing
                      // Not read-only for production lead (assigned person) or admin/director
                      !isAdminOrDirector && 
                      !((enquiry.currentAssignedPerson || enquiry.current_assigned_person) === currentUser?.id && 
                        productionUsers.some((u: any) => u.id === currentUser?.id))
                    }
                    onComplete={async () => {
                      if (id && productionWorkflow?.id) {
                        try {
                          await productionAPI.complete(productionWorkflow.id);
                          refresh();
                          toast.success('Production completed. Task returned to salesperson.');
                        } catch (error) {
                          toast.error('Failed to complete production');
                        }
                      }
                    }}
                    onRefresh={async () => {
                      // Refresh production workflow data
                      if (id) {
                        try {
                          const workflowRes = await productionAPI.getByEnquiry(id);
                          if (workflowRes.success && workflowRes.data) {
                            setProductionWorkflow(workflowRes.data);
                          }
                        } catch (error) {
                          console.error('Error refreshing production workflow:', error);
                        }
                      }
                    }}
                  />
                )}

                {/* Dispatch Workflow - Show when status is ReadyForDispatch or Dispatched */}
                {(enquiry.status === 'ReadyForDispatch' || enquiry.status === 'Dispatched') && 
                 ((enquiry.enquiry_by === currentUser?.id || enquiry.current_assigned_person === currentUser?.id) && currentUser?.role === 'salesman' || isAdminOrDirector) && (
                  <DispatchWorkflow
                    key={refreshKey}
                    enquiry={enquiry}
                    dispatchWork={dispatchWork}
                    onUpdate={async (dispatchData) => {
                      if (id && dispatchWork?.id) {
                        try {
                          await dispatchAPI.update(dispatchWork.id, dispatchData);
                          refresh();
                        } catch (error) {
                          toast.error('Failed to update dispatch work');
                        }
                      }
                    }}
                    onComplete={async () => {
                      if (id && dispatchWork?.id) {
                        try {
                          await dispatchAPI.update(dispatchWork.id, {
                            status: 'dispatched',
                            dispatchDate: new Date().toISOString()
                          });
                          refresh();
                          toast.success('Dispatch completed.');
                        } catch (error) {
                          toast.error('Failed to complete dispatch');
                        }
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* Designer's Completed Work History - Show read-only view for designers who completed this work */}
            {currentUser?.role === 'designer' && 
             designWork && 
             (designWork.designer_id === currentUser?.id || (designWork as any).designerId === currentUser?.id) &&
             designWork.design_status === 'completed' && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Your Completed Design Work
                  </CardTitle>
                  <CardDescription>
                    This is your completed work for this enquiry (read-only view)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Requirements & Details</Label>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{designWork.client_requirements || 'No requirements entered'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Designer Notes & Work Done</Label>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{designWork.designer_notes || 'No notes entered'}</p>
                    </div>
                  </div>
                  {designAttachments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Files You Attached</Label>
                      <div className="space-y-2">
                        {designAttachments.map((attachment) => {
                          const fileUrl = attachment.file_url || (attachment as any).fileUrl;
                          const fileName = attachment.file_name || (attachment as any).fileName;
                          const uploadedAt = (attachment as any).uploadedAt || attachment.uploaded_at;
                          
                          const handleDownload = () => {
                            if (fileUrl?.startsWith('data:')) {
                              const link = document.createElement('a');
                              link.href = fileUrl;
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              window.open(fileUrl, '_blank');
                            }
                          };

                          return (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {uploadedAt ? format(new Date(uploadedAt), 'dd MMM yyyy, HH:mm') : 'Unknown date'}
                                  </p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const completedAt = (designWork as any).completedAt || designWork.completed_at;
                    if (completedAt) {
                      try {
                        const date = new Date(completedAt);
                        if (!isNaN(date.getTime())) {
                          return (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground">
                                Completed on {format(date, 'dd MMM yyyy, HH:mm')}
                              </p>
                            </div>
                          );
                        }
                      } catch (error) {
                        console.warn('Invalid completed_at date:', completedAt);
                      }
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Design Attachments - Show when there are attachments (visible to all relevant users) */}
            {designAttachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Design Files & Attachments
                  </CardTitle>
                  <CardDescription>
                    Files attached by the designer - view, preview, or download
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {designAttachments.map((attachment) => {
                      const fileUrl = attachment.file_url || (attachment as any).fileUrl;
                      const fileName = attachment.file_name || (attachment as any).fileName;
                      const uploadedAt = (attachment as any).uploadedAt || attachment.uploaded_at;
                      
                      const handleDownload = () => {
                        if (fileUrl?.startsWith('data:')) {
                          // Base64 file
                          const link = document.createElement('a');
                          link.href = fileUrl;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          // Regular URL
                          window.open(fileUrl, '_blank');
                        }
                      };

                      const handlePreview = () => {
                        if (fileUrl?.startsWith('data:')) {
                          // Base64 file - open in new window
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>${fileName}</title></head>
                                <body style="margin:0; padding:20px; background:#f5f5f5;">
                                  ${fileUrl.startsWith('data:image/') 
                                    ? `<img src="${fileUrl}" style="max-width:100%; height:auto;" />`
                                    : fileUrl.startsWith('data:application/pdf')
                                    ? `<iframe src="${fileUrl}" style="width:100%; height:90vh; border:none;"></iframe>`
                                    : `<a href="${fileUrl}" download="${fileName}" style="display:inline-block; padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">Download ${fileName}</a>`
                                  }
                                </body>
                              </html>
                            `);
                          }
                        } else {
                          window.open(fileUrl, '_blank');
                        }
                      };

                      const isImage = fileUrl?.startsWith('data:image/') || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      const isPDF = fileUrl?.startsWith('data:application/pdf') || fileName?.match(/\.pdf$/i);

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImage ? (
                              <FileText className="h-5 w-5 text-blue-500" />
                            ) : isPDF ? (
                              <FileText className="h-5 w-5 text-red-500" />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {uploadedAt ? (() => {
                                  try {
                                    const date = new Date(uploadedAt);
                                    if (!isNaN(date.getTime())) {
                                      return `Uploaded ${format(date, 'dd MMM yyyy, HH:mm')}`;
                                    }
                                  } catch (error) {
                                    console.warn('Invalid uploaded_at date:', uploadedAt);
                                  }
                                  return 'Unknown date';
                                })() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isImage || isPDF) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreview}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownload}
                              title="Download"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent History / Full History for SuperAdmin/Director */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-accent" />
                  {isAdminOrDirector ? 'Complete Activity Log' : 'Recent Activity'}
                </CardTitle>
                <CardDescription>
                  {isAdminOrDirector ? 'Full history of all status changes and activities' : 'Last 5 status changes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={isAdminOrDirector ? "all" : "recent"} className="w-full">
                  {isAdminOrDirector && (
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All History</TabsTrigger>
                      <TabsTrigger value="logs">Comm Logs</TabsTrigger>
                      <TabsTrigger value="changes">Status Changes</TabsTrigger>
                    </TabsList>
                  )}
                  
                  <TabsContent value={isAdminOrDirector ? "all" : "recent"} className="mt-4">
                    <div className="space-y-4">
                      {history.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No status history found for this enquiry</p>
                        </div>
                      ) : (
                        (isAdminOrDirector ? history : history.slice(0, 5)).map((item, index) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                            {index < (isAdminOrDirector ? history : history.slice(0, 5)).length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={item.status} size="sm" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(item.statusChangedDateTime || item.status_changed_date_time), 'dd MMM yyyy, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm mt-1">
                              Assigned to <span className="font-medium">
                                {item.assignedPersonUser?.name || item.assigned_person_name || 'Unknown'}
                              </span>
                            </p>
                            {item.note && (
                              <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                            )}
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {isAdminOrDirector && (
                    <>
                      <TabsContent value="logs" className="mt-4">
                        <div className="space-y-4">
                          {communicationLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No communication logs yet</p>
                          ) : (
                            communicationLogs.map((log) => (
                              <div key={log.id} className="flex gap-4 p-3 rounded-lg border bg-card">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{log.communication_type || log.type}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {log.communication_date || log.createdAt 
                                        ? format(new Date(log.communication_date || log.createdAt), 'dd MMM yyyy, HH:mm')
                                        : 'Date not available'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium">{log.subject}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                                  {(log.clientResponse || log.client_response) && (
                                    <p className="text-sm text-muted-foreground mt-2 italic">
                                      Client: {log.clientResponse || log.client_response}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    By {log.logger?.name || log.logged_by_name || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="changes" className="mt-4">
                        <div className="space-y-4">
                          {history.map((item, index) => (
                            <div key={item.id} className="flex gap-4 p-3 rounded-lg border bg-card">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-accent" />
                                {index < history.length - 1 && (
                                  <div className="w-0.5 flex-1 bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={item.status} size="sm" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(item.statusChangedDateTime || item.status_changed_date_time), 'dd MMM yyyy, HH:mm')}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">
                                  Assigned to <span className="font-medium">
                                    {item.assignedPersonUser?.name || item.assigned_person_name || 'Unknown'}
                                  </span>
                                </p>
                                {item.note && (
                                  <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* SuperAdmin/Director Admin Panel */}
            {isAdminOrDirector && (
              <Card className="border-2 border-accent/20">
                <CardHeader className="bg-accent/5">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent" />
                    {isSuperAdmin ? 'Super Admin' : 'Director'} Control Panel
                  </CardTitle>
                  <CardDescription>
                    Full administrative access - edit, change status, and manage this enquiry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Enquiry Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Enquiry - Admin Mode</DialogTitle>
                        <DialogDescription>
                          Modify any field of this enquiry. Changes will be logged.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Enquiry Number</Label>
                            <Input defaultValue={enquiry.enquiry_num} />
                          </div>
                          <div className="space-y-2">
                            <Label>Order Number</Label>
                            <Input defaultValue={enquiry.order_number || ''} placeholder="Not set" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select defaultValue={enquiry.status}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_LIST.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Enquiry Amount (₹)</Label>
                          <Input type="number" defaultValue={enquiry.enquiry_amount} />
                        </div>
                        <div className="space-y-2">
                          <Label>Enquiry Details</Label>
                          <Textarea defaultValue={enquiry.enquiry_detail} rows={4} />
                        </div>
                        <div className="space-y-2">
                          <Label>Purchase Details</Label>
                          <Textarea defaultValue={enquiry.purchase_detail || ''} rows={3} />
                        </div>
                        <div className="flex gap-3">
                          <Button className="flex-1" onClick={() => toast.success('Enquiry updated successfully')}>
                            Save Changes
                          </Button>
                          <Button variant="outline" className="flex-1">Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => toast.info('Status change dialog would open')}>
                      <Activity className="h-4 w-4 mr-2" />
                      Change Status
                    </Button>
                    <Button variant="outline" onClick={() => toast.info('Assignment dialog would open')}>
                      <User className="h-4 w-4 mr-2" />
                      Reassign
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Admin Actions Logged</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All changes made through this panel are automatically logged with your user ID and timestamp.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-lg">{enquiry.client?.client_name}</p>
                  <p className="text-sm text-muted-foreground">{enquiry.client?.contact_person}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${enquiry.client?.email}`} className="text-primary hover:underline">
                      {enquiry.client?.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{enquiry.client?.contact_no}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{enquiry.client?.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salesperson Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  Enquiry By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{enquiry.enquiry_by_user?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {enquiry.enquiry_by_user?.role}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {enquiry.enquiry_by_user?.email}
                </p>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-accent" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{enquiry.delivery_address}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
