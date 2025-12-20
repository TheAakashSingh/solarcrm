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
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { smtpAPI } from '@/lib/api';
import { Plus, Edit, Trash2, Mail, CheckCircle, XCircle, TestTube, Star } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SmtpManagement() {
  const { currentUser } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 465,
    secure: true,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
    isDefault: false,
    isActive: true,
  });

  useEffect(() => {
    if (currentUser?.role !== 'superadmin') {
      toast.error('Access denied. Only superadmin can manage SMTP configurations.');
      return;
    }
    fetchConfigs();
  }, [currentUser]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await smtpAPI.getAll();
      if (response.success && response.data) {
        setConfigs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching SMTP configs:', error);
      toast.error('Failed to load SMTP configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config?: any) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name || '',
        host: config.host || '',
        port: config.port || 465,
        secure: config.secure !== false,
        user: config.user || '',
        password: '', // Don't pre-fill password
        fromEmail: config.fromEmail || '',
        fromName: config.fromName || '',
        isDefault: config.isDefault || false,
        isActive: config.isActive !== false,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: '',
        host: '',
        port: 465,
        secure: true,
        user: '',
        password: '',
        fromEmail: '',
        fromName: '',
        isDefault: false,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.host || !formData.user || !formData.password || !formData.fromEmail || !formData.fromName) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingConfig) {
        const updateData: any = {
          name: formData.name,
          host: formData.host,
          port: formData.port,
          secure: formData.secure,
          user: formData.user,
          fromEmail: formData.fromEmail,
          fromName: formData.fromName,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
        };
        // Only update password if provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        const response = await smtpAPI.update(editingConfig.id, updateData);
        if (response.success) {
          toast.success('SMTP configuration updated successfully');
          setIsDialogOpen(false);
          fetchConfigs();
        }
      } else {
        const response = await smtpAPI.create({
          name: formData.name,
          host: formData.host,
          port: formData.port,
          secure: formData.secure,
          user: formData.user,
          password: formData.password,
          fromEmail: formData.fromEmail,
          fromName: formData.fromName,
          isDefault: formData.isDefault,
        });
        if (response.success) {
          toast.success('SMTP configuration created successfully');
          setIsDialogOpen(false);
          fetchConfigs();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save SMTP configuration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SMTP configuration?')) {
      return;
    }

    try {
      const response = await smtpAPI.delete(id);
      if (response.success) {
        toast.success('SMTP configuration deleted successfully');
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete SMTP configuration');
    }
  };

  const handleTest = async (id: string) => {
    setTestingConfig(id);
    try {
      const response = await smtpAPI.test(id);
      if (response.success) {
        toast.success('Test email sent successfully! Check your inbox.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setTestingConfig(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await smtpAPI.setDefault(id);
      if (response.success) {
        toast.success('Default SMTP configuration updated');
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default configuration');
    }
  };

  if (currentUser?.role !== 'superadmin') {
    return (
      <MainLayout>
        <Header title="SMTP Management" subtitle="Access Denied" showNewEnquiry={false} />
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Only superadmin can access SMTP management.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="SMTP Configuration"
        subtitle="Manage email server settings for sending quotations"
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">SMTP Configurations</h2>
            <p className="text-sm text-gray-500 mt-1">Configure email servers for sending quotations to clients</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add SMTP Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingConfig ? 'Edit' : 'Add'} SMTP Configuration</DialogTitle>
                <DialogDescription>
                  Configure your SMTP server settings for sending emails
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Configuration Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Gmail SMTP, Company Email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name *</Label>
                    <Input
                      id="fromName"
                      value={formData.fromName}
                      onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                      placeholder="e.g., SolarSync Solutions"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Host *</Label>
                    <Input
                      id="host"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="e.g., smtp.gmail.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port *</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 465 })}
                      required
                    />
                    <p className="text-xs text-gray-500">Common ports: 465 (SSL), 587 (TLS), 25</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="user">SMTP Username/Email *</Label>
                    <Input
                      id="user"
                      type="email"
                      value={formData.user}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                      placeholder="your-email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      SMTP Password {editingConfig ? '(leave empty to keep current)' : '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="App password or SMTP password"
                      required={!editingConfig}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email *</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                    placeholder="noreply@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500">Email address that will appear as sender</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="secure"
                      checked={formData.secure}
                      onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
                    />
                    <Label htmlFor="secure">Use Secure Connection (SSL/TLS)</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                    />
                    <Label htmlFor="isDefault">Set as Default</Label>
                  </div>

                  {editingConfig && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingConfig ? 'Update' : 'Create'} Configuration
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              Loading SMTP configurations...
            </CardContent>
          </Card>
        ) : configs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No SMTP configurations found</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>From Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>{config.host}</TableCell>
                    <TableCell>{config.port}</TableCell>
                    <TableCell>{config.fromEmail}</TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {config.isDefault ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTest(config.id)}
                          disabled={testingConfig === config.id}
                          title="Test Configuration"
                        >
                          <TestTube className={`h-4 w-4 ${testingConfig === config.id ? 'animate-spin' : ''}`} />
                        </Button>
                        {!config.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetDefault(config.id)}
                            title="Set as Default"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(config)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!config.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(config.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

