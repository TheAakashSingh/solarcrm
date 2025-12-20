import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { invoicesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Search, Plus, Eye, Download, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const params: any = { limit: 1000 };
        if (searchTerm) params.search = searchTerm;
        
        const response = await invoicesAPI.getAll(params);
        if (response.success && response.data) {
          setInvoices(response.data);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [searchTerm]);

  const filteredInvoices = invoices.filter((inv: any) =>
    (inv.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((inv.client as any)?.clientName || inv.client?.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={cn('capitalize', styles[status] || styles.draft)}>
        {status}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <Header 
        title="Invoices"
        subtitle={`${loading ? 'Loading...' : filteredInvoices.length + ' invoices'}`}
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button asChild>
                <Link to="/invoices/new?type=invoice">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice, index) => (
                <TableRow 
                  key={invoice.id}
                  className={cn(
                    'animate-fade-up',
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-mono font-medium">
                    {invoice.number}
                  </TableCell>
                  <TableCell>{(invoice.client as any)?.clientName || invoice.client?.client_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {invoice.enquiry?.orderNumber || invoice.enquiry?.order_number || invoice.enquiry?.enquiryNum || invoice.enquiry?.enquiry_num}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    {invoice.dueDate || invoice.due_date ? format(new Date(invoice.dueDate || invoice.due_date), 'dd MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.grandTotal || invoice.amount)}
                  </TableCell>
                  <TableCell className={cn(
                    'font-medium',
                    'text-muted-foreground'
                  )}>
                    {/* Paid amount would come from payment tracking - not in current schema */}
                    —
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
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
