import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { enquiriesAPI, usersAPI } from '@/lib/api';
import { onStatusChanged, onAssignmentChanged } from '@/lib/socket';
import { Enquiry, EnquiryStatus, STATUS_LIST, ROLE_STATUS_MAPPING, UserRole } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  User, 
  IndianRupee, 
  Calendar,
  Eye,
  FileText,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function KanbanBoard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [usersByStatus, setUsersByStatus] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isDirector = currentUser?.role === 'director';
  const isSalesperson = currentUser?.role === 'salesman';
  const isAdminOrDirector = isSuperAdmin || isDirector;

  // Fetch enquiries
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await enquiriesAPI.getAll({ limit: 1000 });
        if (response.success && response.data) {
          setEnquiries(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Error fetching enquiries:', error);
        toast.error('Failed to load enquiries');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for real-time updates
    const handleStatusChange = (data: any) => {
      if (data?.enquiry?.id) {
        setEnquiries(prev => prev.map((e: any) => 
          e.id === data.enquiry.id ? data.enquiry : e
        ));
      }
    };

    const handleAssignmentChange = (data: any) => {
      if (data?.enquiry?.id) {
        setEnquiries(prev => prev.map((e: any) => 
          e.id === data.enquiry.id ? data.enquiry : e
        ));
      }
    };

    const cleanup1 = onStatusChanged(handleStatusChange);
    const cleanup2 = onAssignmentChanged(handleAssignmentChange);

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  // Fetch users by status for assignment dropdowns
  useEffect(() => {
    const fetchUsersForStatuses = async () => {
      const statusUsers: Record<string, any[]> = {};
      for (const status of STATUS_LIST) {
        try {
          const response = await usersAPI.getByStatus(status);
          if (response.success && response.data) {
            statusUsers[status] = Array.isArray(response.data) ? response.data : [];
          }
        } catch (error) {
          console.error(`Error fetching users for ${status}:`, error);
        }
      }
      setUsersByStatus(statusUsers);
    };

    if (currentUser && (isSalesperson || isAdminOrDirector)) {
      fetchUsersForStatuses();
    }
  }, [currentUser, isSalesperson, isAdminOrDirector]);

  // Map status to roles that should be shown for assignment
  const getRolesForStatus = (status: EnquiryStatus): UserRole[] => {
    switch (status) {
      case 'Enquiry':
        return ['salesman'];
      case 'Design':
        return ['designer'];
      case 'BOQ':
        return ['salesman'];
      case 'ReadyForProduction':
        return ['production'];
      case 'PurchaseWaiting':
        return ['purchase'];
      case 'InProduction':
        return ['production'];
      case 'ProductionComplete':
        return ['production'];
      case 'Hotdip':
        return ['production'];
      case 'ReadyForDispatch':
        return ['salesman'];
      case 'Dispatched':
        return ['salesman'];
      default:
        return [];
    }
  };

  const getUsersByStatus = (status: string): any[] => {
    const users = usersByStatus[status] || [];
    // Filter by role - only show relevant roles for this status
    const allowedRoles = getRolesForStatus(status as EnquiryStatus);
    // For admin/director, show all users; for others, filter by role
    if (isAdminOrDirector) {
      return users;
    }
    return users.filter((user: any) => allowedRoles.includes(user.role));
  };

  // Get allowed statuses for current user
  const getAllowedStatuses = (): EnquiryStatus[] => {
    if (!currentUser) return [];
    // Director, Superadmin, and Salesperson have access to all statuses
    if (currentUser.role === 'director' || currentUser.role === 'superadmin' || currentUser.role === 'salesman') {
      return STATUS_LIST;
    }
    return ROLE_STATUS_MAPPING[currentUser.role] || [];
  };

  const allowedStatuses = getAllowedStatuses();

  // Check if user can drag and drop (only salesperson, director, superadmin)
  const canDragDrop = currentUser?.role === 'salesman' || 
                      currentUser?.role === 'director' || 
                      currentUser?.role === 'superadmin';

  // Workers can drag to return statuses (to send back to salesperson)
  const canReturnToSalesperson = currentUser?.role === 'designer' || 
                                  currentUser?.role === 'production' || 
                                  currentUser?.role === 'purchase';

  // Get return statuses for workers (statuses that return to salesperson)
  const getReturnStatuses = (): EnquiryStatus[] => {
    if (!currentUser) return [];
    if (currentUser.role === 'designer') return ['BOQ']; // Designer returns to BOQ
    if (currentUser.role === 'production') return ['ReadyForDispatch']; // Production returns to ReadyForDispatch
    if (currentUser.role === 'purchase') return ['ReadyForProduction']; // Purchase returns to ReadyForProduction
    return [];
  };

  const returnStatuses = getReturnStatuses();

  // Get all statuses to show (allowed + return statuses for workers)
  const statusesToShow = canReturnToSalesperson 
    ? [...allowedStatuses, ...returnStatuses].filter((v, i, a) => a.indexOf(v) === i)
    : allowedStatuses;

  // Group enquiries by status
  const columns = statusesToShow.reduce((acc, status) => {
    // Filter enquiries by status
    let filtered = enquiries.filter((e: any) => e.status === status);
    
    // For workers, only show enquiries assigned to them in their workflow status
    // But show all enquiries in return statuses (so they can see where to drag)
    if (canReturnToSalesperson && !returnStatuses.includes(status)) {
      filtered = filtered.filter((e: any) => 
        (e.current_assigned_person === currentUser?.id || e.currentAssignedPerson === currentUser?.id)
      );
    }
    // For return statuses, show all enquiries (so workers can see the destination)
    // But for better UX, we could filter to only show enquiries from the current worker
    // For now, show all to allow dragging
    
    acc[status] = filtered;
    return acc;
  }, {} as Record<EnquiryStatus, any[]>);

  if (loading) {
    return (
      <MainLayout>
        <Header title="Task Board" subtitle="Loading..." />
        <div className="p-6">
          <div className="text-center py-12">Loading tasks...</div>
        </div>
      </MainLayout>
    );
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as EnquiryStatus;
    const enquiry = enquiries.find((e: any) => e.id === draggableId);

    if (!enquiry) return;

    try {
      // If worker is dragging to return status, assign back to salesperson (and complete workflow if needed)
      if (canReturnToSalesperson && returnStatuses.includes(newStatus)) {
        // For production role: if dragging to ReadyForDispatch, complete the production workflow
        // This already handles status update and assignment back to salesperson
        if (currentUser?.role === 'production' && newStatus === 'ReadyForDispatch') {
          try {
            const { productionAPI } = await import('@/lib/api');
            const workflowRes = await productionAPI.getByEnquiry(draggableId);
            if (workflowRes.success && workflowRes.data && typeof workflowRes.data === 'object' && 'id' in workflowRes.data) {
              const workflowId = (workflowRes.data as any).id;
              const completeRes = await productionAPI.complete(workflowId);
              
              if (completeRes.success && completeRes.data && typeof completeRes.data === 'object' && 'enquiry' in completeRes.data) {
                // Update the enquiry in state with the returned data
                const enquiryData = (completeRes.data as any).enquiry;
                setEnquiries(prev => prev.map((e: any) => 
                  e.id === draggableId ? enquiryData : e
                ));
                toast.success('Production completed! Task returned to salesperson.');
              } else {
                throw new Error(completeRes.message || 'Failed to complete production');
              }
            } else {
              throw new Error('Production workflow not found');
            }
          } catch (workflowError: any) {
            console.error('Error completing production workflow:', workflowError);
            toast.error(workflowError?.message || 'Failed to complete production workflow');
          }
          return;
        }
        
        // For other roles (designer, purchase), use normal status update
        const salespersonId = enquiry.enquiryBy || enquiry.enquiry_by;
        const response = await enquiriesAPI.updateStatus(
          draggableId,
          newStatus,
          salespersonId,
          `Task returned to salesperson`
        );
        
        if (response.success) {
          setEnquiries(prev => prev.map((e: any) => 
            e.id === draggableId ? response.data : e
          ));
          toast.success(`Task returned to salesperson (${newStatus.replace(/([A-Z])/g, ' $1').trim()})`);
        }
        return;
      }

      // For production role: handle status changes within production workflow
      if (currentUser?.role === 'production' && canReturnToSalesperson) {
        // Production can move between: ReadyForProduction → InProduction → ProductionComplete
        const currentAssignedPerson = enquiry.currentAssignedPerson || enquiry.current_assigned_person;
        if (currentAssignedPerson === currentUser.id) {
          // Start production workflow if moving to InProduction
          if (newStatus === 'InProduction' && enquiry.status !== 'InProduction') {
            try {
              const { productionAPI } = await import('@/lib/api');
              const workflowRes = await productionAPI.getByEnquiry(draggableId);
              if (workflowRes.success && workflowRes.data && typeof workflowRes.data === 'object' && 'id' in workflowRes.data) {
                const workflowId = (workflowRes.data as any).id;
                await productionAPI.start(workflowId);
              }
            } catch (workflowError) {
              console.error('Error starting production workflow:', workflowError);
            }
          }
          
          const response = await enquiriesAPI.updateStatus(
            draggableId,
            newStatus,
            currentAssignedPerson,
            `Status changed to ${newStatus}`
          );
          
          if (response.success) {
            setEnquiries(prev => prev.map((e: any) => 
              e.id === draggableId ? response.data : e
            ));
            toast.success(`Moved to ${newStatus.replace(/([A-Z])/g, ' $1').trim()}`);
          }
          return;
        }
      }

      // For salesperson/admin/director - normal assignment
      if (canDragDrop) {
        // Get users who can handle this status
        const assignableUsers = getUsersByStatus(newStatus);
        const assignedUserId = assignableUsers[0]?.id || enquiry.currentAssignedPerson || enquiry.current_assigned_person;
        
        const response = await enquiriesAPI.updateStatus(
          draggableId,
          newStatus,
          assignedUserId,
          `Status changed to ${newStatus}`
        );
        
        if (response.success) {
          setEnquiries(prev => prev.map((e: any) => 
            e.id === draggableId ? response.data : e
          ));
          toast.success(`Moved to ${newStatus.replace(/([A-Z])/g, ' $1').trim()}`);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignChange = async (enquiryId: string, userId: string) => {
    try {
      const response = await enquiriesAPI.assign(enquiryId, userId);
      if (response.success) {
        setEnquiries(prev => prev.map((e: any) => 
          e.id === enquiryId ? response.data : e
        ));
        toast.success('Assignment updated');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

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
        title="Task Board"
        subtitle={
          canDragDrop 
            ? "Drag and drop to update status" 
            : canReturnToSalesperson 
            ? "Drag completed tasks to return to salesperson" 
            : "View your assigned tasks"
        }
      />

      <div className="p-6">
        {enquiries.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tasks available</h3>
              <p className="text-muted-foreground">
                {currentUser?.role === 'salesman' 
                  ? "You don't have any enquiries assigned to you yet."
                  : "You don't have any tasks assigned to you at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (canDragDrop || canReturnToSalesperson) ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {statusesToShow.map((status) => (
                <div key={status} className="flex-shrink-0 w-80">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4 px-2 py-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} size="sm" />
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {columns[status]?.length || 0}
                        </span>
                      </div>
                      {canReturnToSalesperson && returnStatuses.includes(status) && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">Return to Sales</span>
                      )}
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "min-h-[300px] space-y-3 transition-colors rounded-lg p-2",
                            snapshot.isDraggingOver && "bg-orange-50/50 border-2 border-dashed border-orange-300"
                          )}
                        >
                          {columns[status]?.map((enquiry, index) => {
                            // For workers, allow dragging if task is assigned to them and in their workflow status
                            const isWorkerTask = canReturnToSalesperson && (enquiry.current_assigned_person === currentUser?.id || enquiry.currentAssignedPerson === currentUser?.id);
                            const isInWorkerStatus = isWorkerTask && allowedStatuses.includes(enquiry.status);
                            // Workers can drag their assigned tasks (they can drag to return statuses)
                            const canDragThis = canDragDrop || (isWorkerTask && isInWorkerStatus);
                            
                            return (
                            <Draggable 
                              key={enquiry.id} 
                              draggableId={enquiry.id} 
                              index={index}
                              isDragDisabled={!canDragThis}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(canDragThis ? provided.dragHandleProps : {})}
                                  className={cn(
                                    "bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group",
                                    canDragThis && "cursor-grab active:cursor-grabbing",
                                    !canDragThis && "cursor-pointer",
                                    snapshot.isDragging && "shadow-xl ring-2 ring-orange-500/20 rotate-1 scale-[1.02] z-50"
                                  )}
                                  onClick={(e) => {
                                    // Allow clicking the card to navigate, but not when dragging
                                    if (!snapshot.isDragging && !canDragThis) {
                                      navigate(`/enquiries/${enquiry.id}`);
                                    }
                                  }}
                                >
                                  <CardContent className="p-4">
                                    {/* Header with Actions */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-semibold text-gray-500 mb-1">
                                          {enquiry.enquiryNum || enquiry.enquiry_num}
                                        </p>
                                        <p className="font-semibold text-sm text-gray-900 line-clamp-1 mb-1">
                                          {(enquiry.client as any)?.clientName || enquiry.client?.client_name}
                                        </p>
                                        {(enquiry.orderNumber || enquiry.order_number) && (
                                          <p className="font-mono text-xs text-gray-400 mt-0.5">
                                            Order: {enquiry.orderNumber || enquiry.order_number}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 hover:bg-gray-100" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/enquiries/${enquiry.id}`);
                                          }}
                                        >
                                          <Eye className="h-3.5 w-3.5 text-gray-600" />
                                        </Button>
                                        {(canDragDrop || isAdminOrDirector) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 hover:bg-gray-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/quotations/new?enquiry=${enquiry.id}`);
                                            }}
                                          >
                                            <FileText className="h-3.5 w-3.5 text-gray-600" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Description */}
                                    {enquiry.enquiryDetail || enquiry.enquiry_detail ? (
                                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                                        {enquiry.enquiryDetail || enquiry.enquiry_detail}
                                      </p>
                                    ) : null}

                                    {/* Quick Stats */}
                                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                                      <span className="flex items-center gap-1 font-medium">
                                        <IndianRupee className="h-3.5 w-3.5 text-orange-600" />
                                        {formatCurrency(enquiry.enquiryAmount || enquiry.enquiry_amount)}
                                      </span>
                                      {(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date) && (
                                        <span className="flex items-center gap-1 text-gray-500">
                                          <Calendar className="h-3.5 w-3.5" />
                                          {format(new Date(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date), 'dd MMM')}
                                        </span>
                                      )}
                                    </div>

                                    {/* Material Badge */}
                                    <div className="mb-3">
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                        {enquiry.materialType || enquiry.material_type}
                                      </span>
                                    </div>

                                    {/* Assignee Select - Only for salesperson/admin/director */}
                                    {canDragDrop ? (
                                      <div className="pt-3 border-t border-gray-100">
                                        <Select
                                          value={enquiry.currentAssignedPerson || enquiry.current_assigned_person}
                                          onValueChange={(v) => {
                                            handleAssignChange(enquiry.id, v);
                                          }}
                                        >
                                          <SelectTrigger 
                                            className="h-8 text-xs border-gray-200 hover:border-gray-300"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-5 w-5">
                                                <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                                                  {(enquiry.assignedUser?.name || enquiry.assigned_user?.name)?.charAt(0)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="truncate text-gray-700 font-medium">
                                                {enquiry.assignedUser?.name || enquiry.assigned_user?.name}
                                              </span>
                                            </div>
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getUsersByStatus(status).map((user: any) => (
                                              <SelectItem key={user.id} value={user.id}>
                                                <div className="flex items-center gap-2">
                                                  <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                                                      {user.name.charAt(0)}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <span className="font-medium">{user.name}</span>
                                                  <span className="text-xs text-gray-500 capitalize">
                                                    ({user.role})
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : (
                                      <div className="pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-xs">
                                          <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
                                            <User className="h-3 w-3 text-orange-600" />
                                          </div>
                                          <span className="text-gray-500">Assigned to:</span>
                                          <span className="font-medium text-gray-900">{enquiry.assignedUser?.name || enquiry.assigned_user?.name || 'Unassigned'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                            );
                          })}
                       
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
              ))}
            </div>
          </DragDropContext>
        ) : (
          // Read-only view for non-salesperson roles
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {allowedStatuses.map((status) => (
              <div key={status} className="flex-shrink-0 w-80">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} size="sm" />
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {columns[status].length}
                      </span>
                    </div>
                  </div>

                  {/* Read-only Task List */}
                  <div className="min-h-[300px] space-y-3 rounded-lg p-2">
                    {columns[status].map((enquiry) => (
                      <Card
                        key={enquiry.id}
                        className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group cursor-pointer"
                      >
                        <CardContent className="p-4">
                          {/* Header with Actions */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs font-semibold text-gray-500 mb-1">
                                {enquiry.enquiryNum || enquiry.enquiry_num}
                              </p>
                              <p className="font-semibold text-sm text-gray-900 line-clamp-1 mb-1">
                                {enquiry.client?.clientName || enquiry.client?.client_name}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/enquiries/${enquiry.id}`);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-600" />
                              </Button>
                              {(canDragDrop || isAdminOrDirector) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/quotations/new?enquiry=${enquiry.id}`);
                                  }}
                                >
                                  <FileText className="h-3.5 w-3.5 text-gray-600" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {enquiry.enquiryDetail || enquiry.enquiry_detail ? (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {enquiry.enquiryDetail || enquiry.enquiry_detail}
                            </p>
                          ) : null}

                          {/* Quick Stats */}
                          <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1 font-medium">
                              <IndianRupee className="h-3.5 w-3.5 text-orange-600" />
                              {formatCurrency(enquiry.enquiryAmount || enquiry.enquiry_amount)}
                            </span>
                            {(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date) && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(enquiry.expectedDispatchDate || enquiry.expected_dispatch_date), 'dd MMM')}
                              </span>
                            )}
                          </div>

                          {/* Material Badge */}
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {enquiry.materialType || enquiry.material_type}
                            </span>
                          </div>

                          {/* Assigned User - Read-only */}
                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-orange-600" />
                              </div>
                              <span className="text-gray-500">Assigned to:</span>
                              <span className="font-medium text-gray-900">{enquiry.assignedUser?.name || enquiry.assigned_user?.name || 'Unassigned'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {columns[status].length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                        No tasks in this stage
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
