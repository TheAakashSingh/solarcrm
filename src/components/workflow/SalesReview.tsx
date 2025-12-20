import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Enquiry, DesignWork, DesignAttachment, CommunicationLog } from '@/types/crm';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Download,
  Plus,
  Loader2,
  Eye,
  File
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SalesReviewProps {
  enquiry: Enquiry;
  designWork?: DesignWork;
  designAttachments?: DesignAttachment[];
  communicationLogs?: CommunicationLog[];
  onAddLog: (log: Partial<CommunicationLog>) => void;
  onConfirmOrder: () => void;
  onAssignToProduction: (productionUserId: string) => void;
  productionUsers: Array<{ id: string; name: string }>;
}

export function SalesReview({
  enquiry,
  designWork,
  designAttachments = [],
  communicationLogs = [],
  onAddLog,
  onConfirmOrder,
  onAssignToProduction,
  productionUsers
}: SalesReviewProps) {
  const [logType, setLogType] = useState<'call' | 'email' | 'meeting' | 'note'>('note');
  const [logSubject, setLogSubject] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [clientResponse, setClientResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductionUser, setSelectedProductionUser] = useState('');

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

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmOrder();
      toast.success('Order confirmed');
    } catch (error) {
      toast.error('Failed to confirm order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignToProduction = async () => {
    if (!selectedProductionUser) {
      toast.error('Please select a production team member');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignToProduction(selectedProductionUser);
      toast.success('Assigned to production');
    } catch (error) {
      toast.error('Failed to assign to production');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {designWork && (
        <Card>
          <CardHeader>
            <CardTitle>Design Review</CardTitle>
            <CardDescription>
              Review the designer's work and attached files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Client Requirements (from Designer)</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{designWork.client_requirements}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Designer Notes</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{designWork.designer_notes}</p>
              </div>
            </div>

            {designAttachments.length > 0 && (
              <div className="space-y-2">
                <Label>Design Files</Label>
                <div className="space-y-2">
                  {designAttachments.map((attachment) => {
                    const fileUrl = attachment.file_url || (attachment as any).fileUrl;
                    const fileName = attachment.file_name || (attachment as any).fileName;
                    const uploadedAt = (attachment as any).uploadedAt || attachment.uploaded_at;
                    
                    const handleDownload = () => {
                      if (fileUrl.startsWith('data:')) {
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
                      if (fileUrl.startsWith('data:')) {
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
                            <FileText className="h-4 w-4 text-blue-500" />
                          ) : isPDF ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <File className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {uploadedAt ? (() => {
                                try {
                                  const date = new Date(uploadedAt);
                                  if (!isNaN(date.getTime())) {
                                    return format(date, 'dd MMM yyyy, HH:mm');
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
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {enquiry.status === 'BOQ' && (
        <Card>
          <CardHeader>
            <CardTitle>Order Confirmation</CardTitle>
            <CardDescription>
              Confirm the order and assign to production
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assign to Production Team</Label>
              <div className="grid grid-cols-2 gap-2">
                {productionUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant={selectedProductionUser === user.id ? 'default' : 'outline'}
                    onClick={() => setSelectedProductionUser(user.id)}
                  >
                    {user.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
              <Button
                onClick={handleAssignToProduction}
                disabled={isSubmitting || !selectedProductionUser}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm & Assign to Production
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

