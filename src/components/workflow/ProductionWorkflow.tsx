import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Enquiry, ProductionWorkflow, ProductionTask, ProductionStep } from '@/types/crm';
import { 
  CheckCircle2, 
  Clock, 
  Loader2,
  Package,
  Wrench,
  Hammer,
  Factory,
  ShieldCheck,
  Box,
  List,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { productionAPI, usersAPI } from '@/lib/api';

interface ProductionWorkflowProps {
  enquiry: Enquiry;
  productionWorkflow?: ProductionWorkflow;
  onComplete: () => void;
  onRefresh?: () => void;
  readOnly?: boolean; // If true, show notes as read-only (for salesperson view)
}

const STEP_LABELS: Record<string, string> = {
  cutting: 'Cutting',
  welding: 'Welding',
  fabrication: 'Fabrication',
  assembly: 'Assembly',
  quality_check: 'Quality Check',
  packaging: 'Packaging'
};

const STEP_ICONS: Record<string, typeof Package> = {
  cutting: Package,
  welding: Wrench,
  fabrication: Hammer,
  assembly: Factory,
  quality_check: ShieldCheck,
  packaging: Box
};

export function ProductionWorkflowComponent({
  enquiry,
  productionWorkflow,
  onComplete,
  onRefresh,
  readOnly = false
}: ProductionWorkflowProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [productionUsers, setProductionUsers] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({
    step: '' as ProductionStep | '',
    assignedTo: '',
    notes: ''
  });

  // Load notes from workflow when component mounts or workflow changes
  useEffect(() => {
    if (productionWorkflow) {
      const workflowNotes = (productionWorkflow as any).notes || 
                           (productionWorkflow as any).productionNotes || 
                           '';
      setNotes(workflowNotes);
    }
  }, [productionWorkflow]);

  // Handle both camelCase and snake_case task data from backend
  const tasks = (productionWorkflow?.tasks || []).map((task: any) => ({
    ...task,
    id: task.id,
    step: task.step,
    status: task.status,
    assigned_to: task.assignedTo || task.assigned_to,
    assigned_to_name: task.assigned_to_name || task.assignee?.name,
    notes: task.notes || '',
    completed_at: task.completedAt || task.completed_at,
    started_at: task.startedAt || task.started_at
  }));
  
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');
  const pendingTasks = tasks.filter((t: any) => t.status !== 'completed');
  const allCompleted = tasks.length > 0 && tasks.every((t: any) => t.status === 'completed');
  const workflowCompleted = productionWorkflow?.status === 'completed';

  // Fetch production users for task assignment
  useEffect(() => {
    const fetchProductionUsers = async () => {
      try {
        const response = await usersAPI.getByRole('production');
        if (response.success && response.data) {
          setProductionUsers(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Error fetching production users:', error);
      }
    };
    fetchProductionUsers();
  }, []);

  const handleAddTask = async () => {
    if (!newTask.step || !newTask.assignedTo || !productionWorkflow?.id) {
      toast.error('Please select a step and assign to a team member');
      return;
    }

    setIsCreatingTask(true);
    try {
      const response = await productionAPI.createTask(productionWorkflow.id, {
        enquiryId: enquiry.id,
        step: newTask.step,
        assignedTo: newTask.assignedTo,
        notes: newTask.notes || ''
      });

      if (response.success) {
        toast.success('Production task created successfully');
        setIsAddTaskDialogOpen(false);
        setNewTask({ step: '', assignedTo: '', notes: '' });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(response.message || 'Failed to create task');
      }
    } catch (error: any) {
      console.error('Error creating production task:', error);
      toast.error(error?.message || 'Failed to create production task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!productionWorkflow?.id) {
      toast.error('Production workflow not found');
      return;
    }

    setIsSavingNotes(true);
    try {
      const response = await productionAPI.updateNotes(productionWorkflow.id, notes);
      
      if (response.success) {
        toast.success('Production notes saved successfully');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(response.message || 'Failed to save notes');
      }
    } catch (error: any) {
      console.error('Error saving production notes:', error);
      toast.error(error?.message || 'Failed to save production notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete();
      toast.success('Production work completed. Task returned to salesperson.');
    } catch (error) {
      toast.error('Failed to complete production work');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-accent" />
            <span>Production Work</span>
          </div>
          {workflowCompleted && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Create and manage production tasks. Mark tasks as in progress and complete them. Once all tasks are done, mark workflow as complete to return to salesperson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Production Tasks List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Production Tasks</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {completedTasks.length} / {tasks.length} Completed
              </Badge>
              {!workflowCompleted && productionWorkflow && !readOnly && (
                <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Production Task</DialogTitle>
                      <DialogDescription>
                        Create a new production task for this order
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Production Step *</Label>
                        <Select
                          value={newTask.step}
                          onValueChange={(value) => setNewTask({ ...newTask, step: value as ProductionStep })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select production step" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cutting">Cutting</SelectItem>
                            <SelectItem value="welding">Welding</SelectItem>
                            <SelectItem value="fabrication">Fabrication</SelectItem>
                            <SelectItem value="assembly">Assembly</SelectItem>
                            <SelectItem value="quality_check">Quality Check</SelectItem>
                            <SelectItem value="packaging">Packaging</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Assign To *</Label>
                        <Select
                          value={newTask.assignedTo}
                          onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {productionUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          placeholder="Add any notes or instructions for this task..."
                          value={newTask.notes}
                          onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddTaskDialogOpen(false);
                            setNewTask({ step: '', assignedTo: '', notes: '' });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddTask}
                          disabled={isCreatingTask || !newTask.step || !newTask.assignedTo}
                        >
                          {isCreatingTask ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Task
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No production tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const Icon = STEP_ICONS[task.step] || Package;
                const isCompleted = task.status === 'completed';
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg ${
                      isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          isCompleted ? 'bg-green-100' : 'bg-muted'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isCompleted ? 'text-green-700' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{STEP_LABELS[task.step] || task.step}</h4>
                            {isCompleted && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            {task.status === 'in_progress' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                          {((task as any).assigned_to_name || (task as any).assignee?.name) && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Assigned to: {(task as any).assigned_to_name || (task as any).assignee?.name}
                            </p>
                          )}
                          {task.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {task.notes}
                            </p>
                          )}
                          {isCompleted && (() => {
                            const completedAt = (task as any).completedAt || task.completed_at;
                            if (completedAt) {
                              try {
                                const date = new Date(completedAt);
                                if (!isNaN(date.getTime())) {
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Completed on {format(date, 'dd MMM yyyy, HH:mm')}
                                    </p>
                                  );
                                }
                              } catch (error) {
                                console.warn('Invalid completed_at date:', completedAt);
                              }
                            }
                            return null;
                          })()}
                        </div>
                          {!isCompleted && !readOnly && (
                          <div className="flex gap-2 mt-3">
                            {task.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const response = await productionAPI.updateTask(task.id, {
                                      status: 'in_progress'
                                    });
                                    if (response.success) {
                                      toast.success('Task marked as in progress');
                                      if (onRefresh) onRefresh();
                                    } else {
                                      toast.error(response.message || 'Failed to update task');
                                    }
                                  } catch (error: any) {
                                    console.error('Error updating task:', error);
                                    toast.error(error?.message || 'Failed to update task');
                                  }
                                }}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}
                            {(task.status === 'pending' || task.status === 'in_progress') && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await productionAPI.updateTask(task.id, {
                                      status: 'completed'
                                    });
                                    if (response.success) {
                                      toast.success('Task marked as completed');
                                      if (onRefresh) onRefresh();
                                    } else {
                                      toast.error(response.message || 'Failed to complete task');
                                    }
                                  } catch (error: any) {
                                    console.error('Error completing task:', error);
                                    toast.error(error?.message || 'Failed to complete task');
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Work Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="production-notes">
              Production Notes & Logs
              {readOnly && <span className="text-xs text-muted-foreground ml-2">(View Only)</span>}
            </Label>
            {!workflowCompleted && !readOnly && (
              <Button
                onClick={handleSaveNotes}
                size="sm"
                variant="outline"
                disabled={isSavingNotes}
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-2" />
                    Save Notes
                  </>
                )}
              </Button>
            )}
          </div>
          <Textarea
            id="production-notes"
            placeholder={readOnly 
              ? "Production notes will appear here once added by production team..."
              : "Add notes about production progress, issues encountered, observations, or updates. Salesperson will see these notes..."
            }
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            disabled={workflowCompleted || readOnly}
            className="font-mono text-sm"
            readOnly={readOnly}
          />
          {!readOnly && (
            <p className="text-xs text-muted-foreground">
              💡 Tip: Add daily progress updates, issues, or any important information. These notes are visible to the salesperson.
            </p>
          )}
          {readOnly && notes && (
            <p className="text-xs text-muted-foreground mt-1">
              These notes are updated by the production team. Check back regularly for updates.
            </p>
          )}
        </div>

        {workflowCompleted && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Production workflow completed on{' '}
              {(() => {
                const completedAt = productionWorkflow ? ((productionWorkflow as any).completedAt || productionWorkflow.completed_at) : null;
                if (completedAt) {
                  try {
                    const date = new Date(completedAt);
                    if (!isNaN(date.getTime())) {
                      return format(date, 'dd MMM yyyy, HH:mm');
                    }
                  } catch (error) {
                    console.warn('Invalid completed_at date:', completedAt);
                  }
                }
                return 'N/A';
              })()}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Task has been returned to salesperson for next steps.
            </p>
          </div>
        )}

        {!workflowCompleted && allCompleted && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleComplete}
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Production as Complete & Return to Salesperson
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              This will mark all production work as complete and return the task to the salesperson
            </p>
          </div>
        )}

        {!allCompleted && tasks.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Complete all production tasks before marking as complete.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
