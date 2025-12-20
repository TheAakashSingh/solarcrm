import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { User, UserRole, ROLE_HIERARCHY, STATUS_LIST } from '@/types/crm';
import { canManageUser } from '@/lib/permissions';
import { Plus, Edit, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UserManagement() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.getAll();
        if (response.success && response.data) {
          const usersData = Array.isArray(response.data) ? response.data : [];
          setUsers(usersData as any[]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'salesman' as UserRole,
    workflow_status: [] as string[],
  });

  const canManage = (targetRole: UserRole) => {
    if (!currentUser) return false;
    return canManageUser(currentUser.role, targetRole);
  };

  const manageableRoles = currentUser 
    ? ROLE_HIERARCHY[currentUser.role] || []
    : [];

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      // Handle workflowStatus from backend (camelCase) or workflow_status (snake_case)
      const workflowStatus = user.workflowStatus || user.workflow_status;
      const workflowStatusArray = Array.isArray(workflowStatus)
        ? workflowStatus
        : workflowStatus
        ? (typeof workflowStatus === 'string' ? JSON.parse(workflowStatus) : [])
        : [];
      
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't show password when editing
        role: user.role,
        workflow_status: workflowStatusArray,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'salesman',
        workflow_status: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Password is required when creating a new user
    if (!editingUser && !formData.password.trim()) {
      toast.error('Password is required when creating a new user');
      return;
    }

    // Validate password length
    if (!editingUser && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const response = await usersAPI.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          workflowStatus: formData.workflow_status
        });
        
        if (response.success) {
          setUsers(users.map((u: any) => 
            u.id === editingUser.id ? response.data : u
          ));
          toast.success('User updated successfully');
        }
      } else {
        // Create new user
        const response = await usersAPI.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          workflowStatus: formData.workflow_status
        });
        
        if (response.success) {
          setUsers([...users, response.data]);
          toast.success('User created successfully');
        }
      }

      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    }
  };

  const handleDelete = async (user: any) => {
    if (!canManage(user.role)) {
      toast.error('You do not have permission to delete this user');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        const response = await usersAPI.delete(user.id);
        if (response.success) {
          setUsers(users.filter((u: any) => u.id !== user.id));
          toast.success('User deleted successfully');
        }
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter((user: any) => canManage(user.role));

  if (loading) {
    return (
      <MainLayout>
        <Header title="User Management" subtitle="Loading..." showNewEnquiry={false} />
        <div className="p-6">
          <div className="text-center py-12">Loading users...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="User Management"
        subtitle="Manage users, roles, and permissions"
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        {/* Info Card */}
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">Role Hierarchy</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.role === 'superadmin' 
                    ? 'You can manage all users including directors'
                    : currentUser?.role === 'director'
                    ? 'You can manage all users except superadmins'
                    : 'You cannot manage users'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Users</h2>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} users you can manage
            </p>
          </div>
          {manageableRoles.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser 
                      ? 'Update user information and permissions'
                      : 'Add a new user to the system'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2 scrollbar-thin">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@company.com"
                    />
                  </div>

                  {!editingUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password (min 6 characters)"
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {manageableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="capitalize">{role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a role that you have permission to assign
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Workflow Statuses</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg scrollbar-thin">
                      {STATUS_LIST.map((status) => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.workflow_status?.includes(status) || false}
                            onChange={(e) => {
                              const currentStatuses = formData.workflow_status || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  workflow_status: [...currentStatuses, status],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  workflow_status: currentStatuses.filter(s => s !== status),
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t flex-shrink-0 bg-background bottom-0 -mx-6 -mb-6 px-6 pb-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingUser(null);
                      setFormData({
                        name: '',
                        email: '',
                        password: '',
                        role: 'salesman',
                        workflow_status: [],
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex-1">
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Workflow Statuses</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const workflowStatuses = Array.isArray(user.workflowStatus)
                            ? user.workflowStatus
                            : user.workflowStatus
                            ? (typeof user.workflowStatus === 'string' ? JSON.parse(user.workflowStatus) : user.workflowStatus)
                            : [];
                          return (
                            <>
                              {workflowStatuses.slice(0, 3).map((status: string) => (
                                <Badge key={status} variant="secondary" className="text-xs">
                                  {status}
                                </Badge>
                              ))}
                              {workflowStatuses.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{workflowStatuses.length - 3}
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.createdAt || user.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(user)}
                          disabled={!canManage(user.role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          disabled={!canManage(user.role)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No users available to manage</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

