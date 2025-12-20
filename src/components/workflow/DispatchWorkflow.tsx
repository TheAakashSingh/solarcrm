import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Enquiry, DispatchWork } from '@/types/crm';
import { Truck, CheckCircle2, Package, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DispatchWorkflowProps {
  enquiry: Enquiry;
  dispatchWork?: DispatchWork;
  onUpdate: (dispatchWork: Partial<DispatchWork>) => void;
  onComplete: () => void;
}

export function DispatchWorkflow({
  enquiry,
  dispatchWork,
  onUpdate,
  onComplete
}: DispatchWorkflowProps) {
  const [trackingNumber, setTrackingNumber] = useState(dispatchWork?.trackingNumber || dispatchWork?.tracking_number || '');
  const [dispatchDate, setDispatchDate] = useState(
    dispatchWork?.dispatchDate?.split('T')[0] || dispatchWork?.dispatch_date?.split('T')[0] || ''
  );
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    dispatchWork?.estimatedDeliveryDate?.split('T')[0] || dispatchWork?.estimated_delivery_date?.split('T')[0] || ''
  );
  const [notes, setNotes] = useState(dispatchWork?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate({
        trackingNumber: trackingNumber || null,
        dispatchDate: dispatchDate || null,
        estimatedDeliveryDate: estimatedDeliveryDate || null,
        notes: notes,
        status: dispatchDate ? 'dispatched' : 'pending'
      });
      toast.success('Dispatch information updated');
    } catch (error) {
      toast.error('Failed to update dispatch information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter tracking number');
      return;
    }

    if (!dispatchDate) {
      toast.error('Please enter dispatch date');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        trackingNumber: trackingNumber,
        dispatchDate: dispatchDate,
        estimatedDeliveryDate: estimatedDeliveryDate || null,
        notes: notes,
        status: 'dispatched'
      });
      await onComplete();
      toast.success('Dispatch completed');
    } catch (error) {
      toast.error('Failed to complete dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = dispatchWork?.status === 'dispatched' || dispatchWork?.status === 'delivered';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-accent" />
            <span>Dispatch Workflow</span>
          </div>
          {isCompleted && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {dispatchWork?.status === 'delivered' ? 'Delivered' : 'Dispatched'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Manage dispatch and delivery information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <Label className="text-sm font-medium">Delivery Address</Label>
                <p className="text-sm mt-1">{enquiry.deliveryAddress || enquiry.delivery_address}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={isCompleted}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispatch-date">Dispatch Date</Label>
              <Input
                id="dispatch-date"
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                disabled={isCompleted}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-date">Estimated Delivery Date</Label>
              <Input
                id="delivery-date"
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                disabled={isCompleted}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Dispatch Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about dispatch, packaging, special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={isCompleted}
            />
          </div>
        </div>

        {dispatchWork?.dispatch_date && (
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-700" />
              <p className="font-medium text-blue-900">Dispatch Information</p>
            </div>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                <span className="font-medium">Dispatched:</span>{' '}
                {(() => {
                  const dispatchDate = (dispatchWork as any).dispatchDate || dispatchWork.dispatch_date;
                  if (dispatchDate) {
                    try {
                      const date = new Date(dispatchDate);
                      if (!isNaN(date.getTime())) {
                        return format(date, 'dd MMM yyyy');
                      }
                    } catch (error) {
                      console.warn('Invalid dispatch_date:', dispatchDate);
                    }
                  }
                  return '—';
                })()}
              </p>
              {(dispatchWork.trackingNumber || dispatchWork.tracking_number) && (
                <p>
                  <span className="font-medium">Tracking:</span> {dispatchWork.trackingNumber || dispatchWork.tracking_number}
                </p>
              )}
              {(dispatchWork.estimatedDeliveryDate || dispatchWork.estimated_delivery_date) && (
                <p>
                  <span className="font-medium">Estimated Delivery:</span>{' '}
                  {(() => {
                    const estimatedDate = (dispatchWork as any).estimatedDeliveryDate || dispatchWork.estimated_delivery_date;
                    if (estimatedDate) {
                      try {
                        const date = new Date(estimatedDate);
                        if (!isNaN(date.getTime())) {
                          return format(date, 'dd MMM yyyy');
                        }
                      } catch (error) {
                        console.warn('Invalid estimated_delivery_date:', estimatedDate);
                      }
                    }
                    return '—';
                  })()}
                </p>
              )}
            </div>
          </div>
        )}

        {!isCompleted && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Information'
              )}
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isSubmitting || !trackingNumber.trim() || !dispatchDate}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Dispatch
                </>
              )}
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="pt-4 border-t">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Dispatch completed successfully
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

