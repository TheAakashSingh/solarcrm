import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  enquiriesAPI, 
  clientsAPI, 
  usersAPI 
} from '@/lib/api';
import { STATUS_LIST, MATERIAL_TYPES, EnquiryStatus, MaterialType } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';

export default function EnquiryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const isEdit = !!id;

  const [clients, setClients] = useState<any[]>([]);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingEnquiry, setExistingEnquiry] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    material_type: '' as MaterialType,
    enquiry_detail: '',
    enquiry_by: currentUser?.id || '',
    enquiry_amount: '',
    purchase_detail: '',
    expected_dispatch_date: '',
    delivery_address: '',
    status: 'Enquiry' as EnquiryStatus,
    current_assigned_person: currentUser?.id || '',
    note: ''
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, salesRes] = await Promise.all([
          clientsAPI.getAll(),
          usersAPI.getByRole('salesman')
        ]);

        if (clientsRes.success) setClients(clientsRes.data || []);
        if (salesRes.success) setSalesUsers(salesRes.data || []);

        // Fetch existing enquiry if editing
        if (id) {
          const enquiryRes = await enquiriesAPI.getById(id);
          if (enquiryRes.success && enquiryRes.data) {
            const enquiry = enquiryRes.data;
            setExistingEnquiry(enquiry);
            setFormData({
              client_id: enquiry.clientId || enquiry.client_id || '',
              material_type: enquiry.materialType || enquiry.material_type || '' as MaterialType,
              enquiry_detail: enquiry.enquiryDetail || enquiry.enquiry_detail || '',
              enquiry_by: enquiry.enquiryBy || enquiry.enquiry_by || currentUser?.id || '',
              enquiry_amount: (enquiry.enquiryAmount || enquiry.enquiry_amount || 0).toString(),
              purchase_detail: enquiry.purchaseDetail || enquiry.purchase_detail || '',
              expected_dispatch_date: enquiry.expectedDispatchDate 
                ? new Date(enquiry.expectedDispatchDate).toISOString().split('T')[0]
                : enquiry.expected_dispatch_date?.split('T')[0] || '',
              delivery_address: enquiry.deliveryAddress || enquiry.delivery_address || '',
              status: enquiry.status || 'Enquiry' as EnquiryStatus,
              current_assigned_person: enquiry.currentAssignedPerson || enquiry.current_assigned_person || currentUser?.id || '',
              note: ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser]);

  // Fetch assignable users when status changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (formData.status) {
        try {
          const response = await usersAPI.getByStatus(formData.status);
          if (response.success) {
            setAssignableUsers(Array.isArray(response.data) ? response.data : []);
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      }
    };
    fetchUsers();
  }, [formData.status]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    // If status changes, reset assigned person if they can't handle new status
    if (field === 'status') {
      setFormData(prev => ({ ...prev, status: value as EnquiryStatus }));
      // Users will be fetched in useEffect
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.material_type || !formData.enquiry_detail || !formData.delivery_address) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isEdit && id) {
        // Update existing enquiry
        const updateData: any = {
          clientId: formData.client_id,
          materialType: formData.material_type,
          enquiryDetail: formData.enquiry_detail,
          enquiryAmount: parseFloat(formData.enquiry_amount) || 0,
          purchaseDetail: formData.purchase_detail || null,
          expectedDispatchDate: formData.expected_dispatch_date || null,
          deliveryAddress: formData.delivery_address
        };

        const response = await enquiriesAPI.update(id, updateData);
        
        if (response.success) {
          // If status changed, update status
          if (formData.status !== existingEnquiry?.status) {
            await enquiriesAPI.updateStatus(id, formData.status, formData.current_assigned_person, formData.note);
          }
          
          toast.success('Enquiry updated successfully');
          navigate(`/enquiries/${id}`);
        }
      } else {
        // Create new enquiry
        const response = await enquiriesAPI.create({
          clientId: formData.client_id,
          materialType: formData.material_type,
          enquiryDetail: formData.enquiry_detail,
          enquiryAmount: parseFloat(formData.enquiry_amount) || 0,
          purchaseDetail: formData.purchase_detail || null,
          expectedDispatchDate: formData.expected_dispatch_date || null,
          deliveryAddress: formData.delivery_address
        });

        if (response.success) {
          toast.success('Enquiry created successfully');
          navigate('/enquiries');
        }
      }
    } catch (error) {
      console.error('Error saving enquiry:', error);
      toast.error('Failed to save enquiry');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title={isEdit ? 'Edit Enquiry' : 'New Enquiry'} subtitle="Loading..." />
        <div className="p-6">
          <div className="text-center py-12">Loading form...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title={isEdit ? `Edit Enquiry ${existingEnquiry?.enquiry_num}` : 'New Enquiry'}
        subtitle={isEdit ? 'Update enquiry details and status' : 'Create a new order enquiry'}
        showNewEnquiry={false}
      />

      <div className="p-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Client & Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-accent" />
                  Enquiry Details
                </CardTitle>
                <CardDescription>Basic order information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={(v) => handleChange('client_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {(client as any).clientName || client.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material_type">Material Type *</Label>
                  <Select 
                    value={formData.material_type} 
                    onValueChange={(v) => handleChange('material_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enquiry_by">Enquiry By</Label>
                  <Select 
                    value={formData.enquiry_by} 
                    onValueChange={(v) => handleChange('enquiry_by', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enquiry_amount">Order Amount (₹)</Label>
                  <Input
                    id="enquiry_amount"
                    type="number"
                    value={formData.enquiry_amount}
                    onChange={(e) => handleChange('enquiry_amount', e.target.value)}
                    placeholder="Enter amount"
                    className="input-focus"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_dispatch_date">Expected Dispatch Date</Label>
                  <Input
                    id="expected_dispatch_date"
                    type="date"
                    value={formData.expected_dispatch_date}
                    onChange={(e) => handleChange('expected_dispatch_date', e.target.value)}
                    className="input-focus"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Assignment</CardTitle>
                <CardDescription>Workflow management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_LIST.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/([A-Z])/g, ' $1').trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_assigned_person">Assign To</Label>
                  <Select 
                    value={formData.current_assigned_person} 
                    onValueChange={(v) => handleChange('current_assigned_person', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Showing users who handle "{formData.status}" status
                  </p>
                </div>

                {isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="note">Status Change Note</Label>
                    <Textarea
                      id="note"
                      value={formData.note}
                      onChange={(e) => handleChange('note', e.target.value)}
                      placeholder="Add a note for this status change..."
                      rows={3}
                      className="input-focus"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="purchase_detail">Purchase Details</Label>
                  <Textarea
                    id="purchase_detail"
                    value={formData.purchase_detail}
                    onChange={(e) => handleChange('purchase_detail', e.target.value)}
                    placeholder="Enter materials to be purchased..."
                    rows={3}
                    className="input-focus"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Specification</CardTitle>
              <CardDescription>Detailed order information and delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enquiry_detail">Order Details *</Label>
                <Textarea
                  id="enquiry_detail"
                  value={formData.enquiry_detail}
                  onChange={(e) => handleChange('enquiry_detail', e.target.value)}
                  placeholder="Enter detailed order specifications..."
                  rows={4}
                  className="input-focus"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleChange('delivery_address', e.target.value)}
                  placeholder="Enter delivery address..."
                  rows={2}
                  className="input-focus"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Enquiry' : 'Create Enquiry'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
