import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EnquiryTable } from '@/components/enquiry/EnquiryTable';
import { enquiriesAPI } from '@/lib/api';
import { onStatusChanged } from '@/lib/socket';
import { STATUS_LIST, MATERIAL_TYPES, EnquiryStatus, MaterialType } from '@/types/crm';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

export default function AllEnquiries() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [materialFilter, setMaterialFilter] = useState<MaterialType | 'all'>('all');
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        setLoading(true);
        const params: any = {
          limit: 1000
        };
        
        if (statusFilter !== 'all') params.status = statusFilter;
        if (materialFilter !== 'all') params.materialType = materialFilter;
        if (searchTerm) params.search = searchTerm;

        // For superadmin/director, use getAll to see ALL enquiries
        // For others, use my-worked-enquiries to show enquiries from history table
        const isAdminOrDirector = currentUser?.role === 'superadmin' || currentUser?.role === 'director';
        const response = isAdminOrDirector 
          ? await enquiriesAPI.getAll(params)
          : await enquiriesAPI.getMyWorkedEnquiries(params);
          
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

    fetchEnquiries();

    // Listen for real-time updates
    const handleStatusChange = (data: any) => {
      if (data?.enquiry?.id) {
        setEnquiries(prev => prev.map((e: any) => 
          e.id === data.enquiry.id ? data.enquiry : e
        ));
      }
    };

    const cleanup = onStatusChanged(handleStatusChange);

    return () => {
      cleanup();
    };
  }, [statusFilter, materialFilter, searchTerm, currentUser]);

  // Apply client-side search filter (for better UX)
  const filteredEnquiries = enquiries.filter((enquiry: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (enquiry.enquiryNum || enquiry.enquiry_num || '').toLowerCase().includes(searchLower) ||
      ((enquiry.client as any)?.clientName || enquiry.client?.client_name || '').toLowerCase().includes(searchLower) ||
      (enquiry.orderNumber || enquiry.order_number || '').toLowerCase().includes(searchLower) ||
      (enquiry.enquiryDetail || enquiry.enquiry_detail || '').toLowerCase().includes(searchLower)
    );
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMaterialFilter('all');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || materialFilter !== 'all';

  return (
    <MainLayout>
      <Header 
        title="All Enquiries"
        subtitle={`${filteredEnquiries.length} ${loading ? 'loading...' : 'enquiries'}`}
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search enquiries, clients, order numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 input-focus"
                />
              </div>

              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_LIST.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/([A-Z])/g, ' $1').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={materialFilter} onValueChange={(v) => setMaterialFilter(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {MATERIAL_TYPES.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enquiries Table */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              Loading enquiries...
            </CardContent>
          </Card>
        ) : (
          <EnquiryTable enquiries={filteredEnquiries} />
        )}
      </div>
    </MainLayout>
  );
}
