import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, User, Calendar, ArrowRight, CheckCircle2, AlertCircle, FileText, Building2, IndianRupee, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';

interface TaskNotificationModalProps {
  task: {
    id: string;
    enquiryId?: string;
    enquiryNum?: string;
    status: string;
    enquiry?: any;
    client?: any;
    assignedBy?: string;
    assignedDate?: string;
    expectedDispatchDate?: string;
    enquiryAmount?: number;
    enquiry_amount?: number;
    materialType?: string;
    material_type?: string;
    enquiryDetail?: string;
    enquiry_detail?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  isLoginPrompt?: boolean;
}

export function TaskNotificationModal({ 
  task, 
  isOpen, 
  onClose, 
  isLoginPrompt = false 
}: TaskNotificationModalProps) {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const handleViewTask = () => {
    if (task.enquiryId) {
      navigate(`/enquiries/${task.enquiryId}`);
    } else {
      navigate('/my-tasks');
    }
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const clientName = (task.client as any)?.clientName || task.client?.client_name || 'N/A';
  const enquiryAmount = task.enquiryAmount || task.enquiry_amount || 0;
  const expectedDate = task.expectedDispatchDate 
    ? new Date(task.expectedDispatchDate) 
    : null;

  const isUrgent = expectedDate && isToday(expectedDate);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        isAnimating && "animate-in fade-in-0 duration-300"
      )}
      onClick={onClose}
    >
      <Card 
        className={cn(
          "relative w-full max-w-2xl mx-4 shadow-2xl border-2",
          isAnimating && "animate-in zoom-in-95 slide-in-from-bottom-4 duration-500",
          isUrgent && "border-orange-500 shadow-orange-500/20"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-4 -right-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white shadow-lg hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardHeader className={cn(
          "pb-3",
          isUrgent && "bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center",
              isUrgent 
                ? "bg-orange-100 animate-pulse" 
                : "bg-blue-100",
              isAnimating && "animate-bounce"
            )}>
              {isUrgent ? (
                <AlertCircle className="h-6 w-6 text-orange-600" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                {isLoginPrompt ? "📋 Today's Tasks" : "🎯 New Task Assigned!"}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {isLoginPrompt 
                  ? "You have pending tasks for today"
                  : "A new task has been assigned to you"
                }
              </p>
            </div>
            <StatusBadge status={task.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Task Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Enquiry ID</span>
              </div>
              <span className="font-mono font-semibold text-gray-900">
                {task.enquiryNum || task.enquiry?.enquiryNum || task.enquiry?.enquiry_num || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Client</span>
              </div>
              <span className="font-medium text-gray-900">{clientName}</span>
            </div>

            {enquiryAmount > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Order Value</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(enquiryAmount)}</span>
              </div>
            )}

            {(task.materialType || task.material_type) && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Material Type</span>
                </div>
                <Badge variant="outline">{task.materialType || task.material_type}</Badge>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          {expectedDate && (
            <div className={cn(
              "p-4 rounded-lg border-2",
              isUrgent 
                ? "bg-orange-50 border-orange-200" 
                : "bg-blue-50 border-blue-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={cn(
                  "h-5 w-5",
                  isUrgent ? "text-orange-600" : "text-blue-600"
                )} />
                <h4 className={cn(
                  "font-semibold",
                  isUrgent ? "text-orange-900" : "text-blue-900"
                )}>
                  Expected Dispatch Date
                </h4>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn(
                    "text-lg font-bold",
                    isUrgent ? "text-orange-700" : "text-blue-700"
                  )}>
                    {format(expectedDate, 'dd MMM yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isUrgent 
                      ? '⚠️ Due today!' 
                      : formatDistanceToNow(expectedDate, { addSuffix: true })
                    }
                  </p>
                </div>
                {isUrgent && (
                  <Badge className="bg-orange-600 text-white animate-pulse">
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Task Description */}
          {(task.enquiryDetail || task.enquiry_detail) && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Order Details</h4>
              <p className="text-sm text-gray-600 line-clamp-3">
                {task.enquiryDetail || task.enquiry_detail}
              </p>
            </div>
          )}

          {/* Assigned By */}
          {task.assignedBy && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>Assigned by: <span className="font-medium">{task.assignedBy}</span></span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {isLoginPrompt ? 'View Later' : 'Dismiss'}
            </Button>
            <Button
              onClick={handleViewTask}
              className={cn(
                "flex-1",
                isUrgent && "bg-orange-600 hover:bg-orange-700"
              )}
            >
              View Task
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

