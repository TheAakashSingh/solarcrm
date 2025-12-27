import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Enquiry, DesignWork, DesignAttachment } from '@/types/crm';
import { Upload, File, X, CheckCircle2, Loader2, Save, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { designAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface DesignerWorkProps {
  enquiry: Enquiry;
  designWork?: DesignWork;
  attachments?: DesignAttachment[];
  onComplete: (designWork: Partial<DesignWork>, attachments: File[]) => void;
  onUpdate: (designWork: Partial<DesignWork>) => void;
  onUploadFiles?: (files: File[]) => Promise<void>;
}

export function DesignerWork({ 
  enquiry, 
  designWork, 
  attachments = [], 
  onComplete,
  onUpdate,
  onUploadFiles
}: DesignerWorkProps) {
  const { currentUser } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File select triggered', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('Files selected:', newFiles.map(f => f.name));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) selected`);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!designWork?.id) {
      toast.error('Design work not found. Please refresh the page.');
      return;
    }

    setIsSaving(true);
    try {
      // Upload files first if any
      if (selectedFiles && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            
            await designAPI.uploadAttachment({
              enquiryId: enquiry.id,
              fileName: file.name,
              fileUrl: base64,
              fileType: file.type
            });
          } catch (fileError: any) {
            console.error('Error uploading file:', fileError);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      // Save design work without completing (no fields to save, just trigger update)
      await designAPI.save(designWork.id, {});

      setSelectedFiles([]);
      toast.success('Design work saved successfully');
      
      if (onUpdate) {
        await onUpdate({});
      }
    } catch (error: any) {
      console.error('Error saving design work:', error);
      toast.error(error?.message || 'Failed to save design work');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToSales = async () => {
    if (!designWork?.id) {
      toast.error('Design work not found. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload files first if any
      if (selectedFiles && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            
            await designAPI.uploadAttachment({
              enquiryId: enquiry.id,
              fileName: file.name,
              fileUrl: base64,
              fileType: file.type
            });
          } catch (fileError: any) {
            console.error('Error uploading file:', fileError);
            toast.error(`Failed to upload ${file.name} - continuing anyway`);
          }
        }
      }

      // Save design work first (no fields to save)
      await designAPI.save(designWork.id, {});

      // Return to sales with note
      await designAPI.returnToSales(designWork.id, returnNote || undefined);

      setSelectedFiles([]);
      setReturnNote('');
      setShowReturnDialog(false);
      toast.success('Design work completed and returned to salesperson');
      
      if (onComplete) {
        await onComplete({
          design_status: 'completed',
          completed_at: new Date().toISOString()
        }, []);
      }
    } catch (error: any) {
      console.error('Error returning design work:', error);
      toast.error(error?.message || 'Failed to return design work');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    console.log('Complete button clicked', { 
      selectedFiles: selectedFiles.length,
      designWorkId: designWork?.id,
      enquiryId: enquiry.id
    });

    if (!enquiry?.id) {
      toast.error('Enquiry ID is missing. Please refresh the page.');
      console.error('Enquiry ID is missing:', enquiry);
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 0: Get or create design work ID
      let designWorkId = designWork?.id;
      if (!designWorkId) {
        console.log('Design work ID not in state, fetching from API...');
        const designRes = await designAPI.getByEnquiry(enquiry.id);
        if (designRes.success && designRes.data && typeof designRes.data === 'object' && 'id' in designRes.data) {
          designWorkId = (designRes.data as any).id;
          console.log('Fetched design work ID:', designWorkId);
        } else {
          // Design work doesn't exist - create it using assign endpoint (it uses upsert)
          console.log('Design work not found, creating it...');
          if (!currentUser?.id) {
            throw new Error('User ID is missing. Please refresh the page.');
          }
          
          const assignRes = await designAPI.assign(enquiry.id, currentUser.id, '');
          if (assignRes.success && assignRes.data && typeof assignRes.data === 'object') {
            const assignData = assignRes.data as any;
            if (assignData.designWork && assignData.designWork.id) {
              designWorkId = assignData.designWork.id;
              console.log('Created design work with ID:', designWorkId);
            } else if (assignData.id) {
              designWorkId = assignData.id;
              console.log('Created design work with ID (alternative path):', designWorkId);
            } else {
              // Try fetching again after assignment
              const fetchRes = await designAPI.getByEnquiry(enquiry.id);
              if (fetchRes.success && fetchRes.data && typeof fetchRes.data === 'object' && 'id' in fetchRes.data) {
                designWorkId = (fetchRes.data as any).id;
                console.log('Fetched design work ID after creation:', designWorkId);
              }
            }
          } else {
            throw new Error(assignRes.message || 'Failed to create design work. Please ensure the task is assigned to you.');
          }
        }
      }

      if (!designWorkId) {
        throw new Error('Design work ID is missing. Please refresh the page and try again.');
      }

      console.log('Starting design work completion - uploading files first...', {
        designWorkId,
        enquiryId: enquiry.id,
        filesCount: selectedFiles.length
      });
      
      // Step 1: Upload attachments first (convert to base64)
      if (selectedFiles && selectedFiles.length > 0) {
        console.log(`Uploading ${selectedFiles.length} file(s)...`);
        for (const file of selectedFiles) {
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
              enquiryId: enquiry.id,
              fileName: file.name,
              fileUrl: base64,
              fileType: file.type
            });
            
            if (!uploadResponse.success) {
              throw new Error(uploadResponse.message || 'Failed to upload file');
            }
            
            console.log('File uploaded successfully:', file.name);
            toast.success(`File ${file.name} uploaded successfully`);
          } catch (fileError: any) {
            console.error('Error uploading file:', fileError);
            toast.error(`Failed to upload ${file.name} - continuing anyway`);
            // Continue with other files and completion
          }
        }
      }
      
      // Step 2: Update design work to completed - this will auto-assign back to salesperson
      console.log('Updating design work status to completed...', {
        designWorkId
      });
      
      const updateResponse = await designAPI.update(designWorkId, {
        design_status: 'completed'
      });
      
      console.log('Update response:', updateResponse);
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.message || 'Failed to update design work');
      }
      
      console.log('Design work marked as completed successfully');
      toast.success('Design work completed. Task returned to salesperson.');
      
      // Step 3: Clear selected files
      setSelectedFiles([]);
      
      // Step 4: Call parent callback if provided (for refresh/cleanup)
      if (onComplete) {
        console.log('Calling parent onComplete callback...');
        try {
          await onComplete({
            design_status: 'completed',
            completed_at: new Date().toISOString()
          }, []);
        } catch (callbackError) {
          console.warn('Error in parent onComplete callback (non-critical):', callbackError);
          // Don't fail the whole operation if callback fails
        }
      }
    } catch (error: any) {
      console.error('Error completing design work:', error);
      toast.error(error?.message || 'Failed to complete design work');
      throw error; // Re-throw so parent can handle if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = designWork?.design_status === 'completed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Design Work</span>
          {isCompleted && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Complete the design work assigned by salesperson. Once done, task will return to salesperson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Design Files & Attachments</Label>
            {!isCompleted && (
              <div className="relative">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="design-files"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Upload Files button clicked');
                    const fileInput = document.getElementById('design-files') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    } else {
                      console.error('File input not found');
                      toast.error('File input not found. Please refresh the page.');
                    }
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Previously Attached Files:</p>
              {attachments.map((attachment) => {
                // Handle both camelCase and snake_case property names
                const uploadedAt = (attachment as any).uploadedAt || attachment.uploaded_at;
                const fileName = (attachment as any).fileName || attachment.file_name;
                const fileUrl = (attachment as any).fileUrl || attachment.file_url;
                
                // Safely format date
                let formattedDate = 'Unknown date';
                if (uploadedAt) {
                  try {
                    const date = new Date(uploadedAt);
                    if (!isNaN(date.getTime())) {
                      formattedDate = format(date, 'dd MMM yyyy, HH:mm');
                    }
                  } catch (error) {
                    console.warn('Invalid date for attachment:', uploadedAt);
                  }
                }
                
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {formattedDate}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(fileUrl, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Files to Upload ({selectedFiles.length}):
              </p>
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    disabled={isCompleted || isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isCompleted && (
          <>
            <Separator />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving || isSubmitting}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowReturnDialog(true)}
                disabled={isSaving || isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Return to Salesperson
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Save your work anytime. Return to salesperson when design is complete.
            </p>
          </>
        )}

        {/* Return to Sales Dialog */}
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return to Salesperson</DialogTitle>
              <DialogDescription>
                Add a note (optional) before returning this design to the salesperson.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="return-note">Note (Optional)</Label>
                <Textarea
                  id="return-note"
                  placeholder="Add any notes or comments for the salesperson..."
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReturnDialog(false);
                  setReturnNote('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturnToSales}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Returning...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Return to Salesperson
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isCompleted && designWork && (() => {
          // Handle both camelCase and snake_case property names
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
  );
}

