import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { clientsAPI, enquiriesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Building2, Phone, Mail, MapPin, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    clientName: '',
    contactPerson: '',
    email: '',
    contactNo: '',
    address: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, enquiriesRes] = await Promise.all([
          clientsAPI.getAll({ limit: 1000 }),
          enquiriesAPI.getAll({ limit: 1000 })
        ]);

        if (clientsRes.success) setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
        if (enquiriesRes.success) setEnquiries(Array.isArray(enquiriesRes.data) ? enquiriesRes.data : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load clients');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredClients = clients.filter((client: any) =>
    ((client as any).clientName || client.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((client as any).contactPerson || client.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get order count for each client
  const getClientOrderCount = (clientId: string) => {
    return enquiries.filter((e: any) => (e.clientId || e.client_id) === clientId).length;
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await clientsAPI.create(formData);
      if (response.success) {
        setClients([...clients, response.data]);
        toast.success('Client added successfully');
        setIsAddDialogOpen(false);
        setFormData({
          clientName: '',
          contactPerson: '',
          email: '',
          contactNo: '',
          address: ''
        });
      }
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Clients" subtitle="Loading..." showNewEnquiry={false} />
        <div className="p-6">
          <div className="text-center py-12">Loading clients...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Clients"
        subtitle={`${filteredClients.length} clients`}
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        {/* Search & Add */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 input-focus"
                />
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Enter the client details below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddClient} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Company Name</Label>
                      <Input 
                        id="client_name" 
                        placeholder="Enter company name" 
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input 
                        id="contact_person" 
                        placeholder="Enter contact person" 
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="email@example.com" 
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input 
                          id="phone" 
                          placeholder="+91 XXXXX XXXXX" 
                          value={formData.contactNo}
                          onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea 
                        id="address" 
                        placeholder="Enter full address" 
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Client</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="data-table-header">Company</TableHead>
                <TableHead className="data-table-header">Contact Person</TableHead>
                <TableHead className="data-table-header">Email</TableHead>
                <TableHead className="data-table-header">Phone</TableHead>
                <TableHead className="data-table-header">Orders</TableHead>
                <TableHead className="data-table-header text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client, index) => (
                <TableRow 
                  key={client.id}
                  className={cn(
                    'animate-fade-up',
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <Building2 className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium">{(client as any).clientName || client.client_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{(client as any).contactPerson || client.contact_person}</TableCell>
                  <TableCell>
                    <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                      {client.email}
                    </a>
                  </TableCell>
                  <TableCell>{(client as any).contactNo || client.contact_no}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                      {getClientOrderCount(client.id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{(client as any).clientName || client.client_name}</DialogTitle>
                          <DialogDescription>Client Details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="flex items-start gap-3">
                            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Contact Person</p>
                              <p className="text-muted-foreground">{(client as any).contactPerson || client.contact_person}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                                {client.email}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Phone</p>
                              <p className="text-muted-foreground">{(client as any).contactNo || client.contact_no}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Address</p>
                              <p className="text-muted-foreground">{client.address}</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
