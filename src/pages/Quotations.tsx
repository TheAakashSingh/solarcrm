import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { quotationsAPI, smtpAPI } from '@/lib/api';
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
import { Search, Plus, Eye, Download, Send, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadQuotationPDF, viewQuotationPDF, QuotationData, downloadQuotationBOQPDF, viewQuotationBOQPDF, QuotationBOQData } from '@/lib/pdfGenerator';
import { useAuth } from '@/contexts/AuthContext';
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
import { Label } from '@/components/ui/label';

export default function Quotations() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);
  const [selectedSmtpConfig, setSelectedSmtpConfig] = useState<string>('');
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  
  // Only salesperson, director, and superadmin can create quotations
  const canCreateQuotation = currentUser?.role === 'salesman' || 
                             currentUser?.role === 'director' || 
                             currentUser?.role === 'superadmin';

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setLoading(true);
        const params: any = {
          limit: 1000
        };
        if (searchTerm) params.search = searchTerm;

        const response = await quotationsAPI.getAll(params);
        if (response.success && response.data && Array.isArray(response.data)) {
          setQuotations(response.data);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
        toast.error('Failed to load quotations');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, [searchTerm]);

  // Fetch SMTP configs when dialog opens
  useEffect(() => {
    if (sendEmailDialogOpen) {
      const fetchSmtpConfigs = async () => {
        try {
          const response = await smtpAPI.getActive();
          if (response.success && response.data && Array.isArray(response.data)) {
            setSmtpConfigs(response.data);
            // Set default if available
            const defaultConfig = response.data.find((c: any) => c.isDefault);
            if (defaultConfig) {
              setSelectedSmtpConfig(defaultConfig.id);
            } else if (response.data.length > 0) {
              setSelectedSmtpConfig(response.data[0].id);
            }
          }
        } catch (error) {
          console.error('Error fetching SMTP configs:', error);
          toast.error('Failed to load SMTP configurations');
        }
      };
      fetchSmtpConfigs();
    }
  }, [sendEmailDialogOpen]);

  const handleSendEmailConfirm = async () => {
    if (!selectedQuotation || !selectedSmtpConfig) {
      toast.error('Please select SMTP configuration');
      return;
    }

    if (!selectedQuotation.client?.email) {
      toast.error('Client email not available');
      return;
    }

    setSendingEmail(selectedQuotation.id);
    try {
      const response = await quotationsAPI.sendEmail(selectedQuotation.id, selectedSmtpConfig);
      
      if (response.success) {
        toast.success('Quotation sent successfully!');
        setSendEmailDialogOpen(false);
        setSelectedQuotation(null);
        setSelectedSmtpConfig('');
      } else {
        toast.error(response.message || 'Failed to send quotation');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send quotation');
    } finally {
      setSendingEmail(null);
    }
  };

  const filteredQuotations = quotations;

  const handleViewPDF = async (quotation: any) => {
    if (!quotation.client) return;
    
    // Check if this is a BOQ format quotation
    const isBOQ = quotation.orderNo || quotation.order_no || (quotation.boqItems && quotation.boqItems.length > 0);
    
    if (isBOQ) {
      // Use BOQ format
      const boqData: QuotationBOQData = {
        quotationNumber: quotation.number || '',
        orderNo: quotation.orderNo || quotation.order_no || '',
        nosOfModule: quotation.nosOfModule || quotation.nos_of_module || '',
        date: quotation.date ? format(new Date(quotation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        projectCapacity: quotation.projectCapacity || quotation.project_capacity || '',
        noOfTable: quotation.noOfTable || quotation.no_of_table || 1,
        clientName: (quotation.client as any).clientName || quotation.client.client_name || '',
        boqItems: (quotation.boqItems || []).map((item: any) => ({
          srNo: item.srNo || item.sr_no || 0,
          descriptions: item.descriptions || '',
          type: item.type || '',
          specification: item.specification || '',
          lengthMm: item.lengthMm || item.length_mm || 0,
          requiredQty: item.requiredQty || item.required_qty || 0,
          totalWeight: item.totalWeight || item.total_weight || 0,
          weightPerPec: item.weightPerPec || item.weight_per_pec || 0,
          qtyPerTable: item.qtyPerTable || item.qty_per_table || 0,
          weightPerTable: item.weightPerTable || item.weight_per_table || 0,
          unitWeight: item.unitWeight || item.unit_weight || 0,
        })),
        totalWeight: quotation.totalWeight || quotation.total_weight || 0,
        purchaseRate: quotation.purchaseRate || quotation.purchase_rate || 0,
        weightIncreaseAfterHDG: quotation.weightIncreaseAfterHDG || quotation.weight_increase_after_hdg || 0,
        costing: quotation.costing || 0,
        totalWeightAfterHotDip: quotation.totalWeightAfterHotDip || quotation.total_weight_after_hot_dip || 0,
        ratePerKg: quotation.ratePerKg || quotation.rate_per_kg || 0,
        boqGrossProfit: quotation.boqGrossProfit || quotation.boq_gross_profit || 0,
        boqProfitPercent: quotation.boqProfitPercent || quotation.boq_profit_percent || 0,
        totalBoqAmount: quotation.totalBoqAmount || quotation.total_boq_amount || 0,
        hardwareItems: (quotation.hardwareItems || []).map((item: any) => ({
          srNo: item.srNo || item.sr_no || 0,
          descriptions: item.descriptions || '',
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          purchaseRate: item.purchaseRate || item.purchase_rate,
        })),
        totalHardwareCost: quotation.totalHardwareCost || quotation.total_hardware_cost || 0,
        hardwarePurchaseTotal: quotation.hardwarePurchaseTotal || quotation.hardware_purchase_total || 0,
        hardwareGrossProfit: quotation.hardwareGrossProfit || quotation.hardware_gross_profit || 0,
        totalStructurePlusHardware: quotation.totalStructurePlusHardware || quotation.total_structure_plus_hardware || 0,
        gst: quotation.gst || 0,
        totalGrossProfit: quotation.totalGrossProfit || quotation.total_gross_profit || 0,
        totalProfitPercent: quotation.totalProfitPercent || quotation.total_profit_percent || 0,
        grandTotal: quotation.grandTotal || quotation.grand_total || quotation.amount || 0,
      };
      
      await viewQuotationBOQPDF(boqData);
    } else {
      // Use legacy format
      const quotationData: QuotationData = {
        quotationNumber: (quotation.number || '').replace('QUO-', '').replace('INV-', ''),
        date: quotation.date ? format(new Date(quotation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        validUntil: quotation.validUntil ? format(new Date(quotation.validUntil), 'yyyy-MM-dd') : quotation.valid_until ? format(new Date(quotation.valid_until), 'yyyy-MM-dd') : '',
        client: {
          name: (quotation.client as any).clientName || quotation.client.client_name || '',
          contactPerson: (quotation.client as any).contactPerson || quotation.client.contact_person || '',
          address: quotation.client.address || '',
          email: quotation.client.email || '',
          contactNo: (quotation.client as any).contactNo || quotation.client.contact_no || '',
        },
        company: {
          name: 'SolarSync Solutions',
          address: '123 Industrial Area, Solar City, India - 302001',
          email: 'info@solarsync.com',
          phone: '+91 98765 43210',
          gstin: '29ABCDE1234F1Z5',
        },
        items: quotation.lineItems ? quotation.lineItems.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
        })) : (quotation.enquiry ? [{
          description: quotation.enquiry.enquiryDetail || quotation.enquiry.enquiry_detail || '',
          quantity: 1,
          unit: 'Set',
          rate: quotation.grandTotal || quotation.amount || 0,
          amount: quotation.grandTotal || quotation.amount || 0,
        }] : []),
        subtotal: quotation.subtotal || 0,
        discount: quotation.discount || 0,
        discountAmount: quotation.discountAmount || quotation.discount_amount || 0,
        taxRate: quotation.taxRate || quotation.tax_rate || 18,
        taxAmount: quotation.taxAmount || quotation.tax_amount || 0,
        grandTotal: quotation.grandTotal || quotation.grand_total || quotation.amount || 0,
      };

      await viewQuotationPDF(quotationData);
    }
  };

  const handleDownloadPDF = async (quotation: any) => {
    if (!quotation.client) return;
    
    // Check if this is a BOQ format quotation
    const isBOQ = quotation.orderNo || quotation.order_no || (quotation.boqItems && quotation.boqItems.length > 0);
    
    if (isBOQ) {
      // Use BOQ format
      const boqData: QuotationBOQData = {
        quotationNumber: quotation.number || '',
        orderNo: quotation.orderNo || quotation.order_no || '',
        nosOfModule: quotation.nosOfModule || quotation.nos_of_module || '',
        date: quotation.date ? format(new Date(quotation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        projectCapacity: quotation.projectCapacity || quotation.project_capacity || '',
        noOfTable: quotation.noOfTable || quotation.no_of_table || 1,
        clientName: (quotation.client as any).clientName || quotation.client.client_name || '',
        boqItems: (quotation.boqItems || []).map((item: any) => ({
          srNo: item.srNo || item.sr_no || 0,
          descriptions: item.descriptions || '',
          type: item.type || '',
          specification: item.specification || '',
          lengthMm: item.lengthMm || item.length_mm || 0,
          requiredQty: item.requiredQty || item.required_qty || 0,
          totalWeight: item.totalWeight || item.total_weight || 0,
          weightPerPec: item.weightPerPec || item.weight_per_pec || 0,
          qtyPerTable: item.qtyPerTable || item.qty_per_table || 0,
          weightPerTable: item.weightPerTable || item.weight_per_table || 0,
          unitWeight: item.unitWeight || item.unit_weight || 0,
        })),
        totalWeight: quotation.totalWeight || quotation.total_weight || 0,
        purchaseRate: quotation.purchaseRate || quotation.purchase_rate || 0,
        weightIncreaseAfterHDG: quotation.weightIncreaseAfterHDG || quotation.weight_increase_after_hdg || 0,
        costing: quotation.costing || 0,
        totalWeightAfterHotDip: quotation.totalWeightAfterHotDip || quotation.total_weight_after_hot_dip || 0,
        ratePerKg: quotation.ratePerKg || quotation.rate_per_kg || 0,
        boqGrossProfit: quotation.boqGrossProfit || quotation.boq_gross_profit || 0,
        boqProfitPercent: quotation.boqProfitPercent || quotation.boq_profit_percent || 0,
        totalBoqAmount: quotation.totalBoqAmount || quotation.total_boq_amount || 0,
        hardwareItems: (quotation.hardwareItems || []).map((item: any) => ({
          srNo: item.srNo || item.sr_no || 0,
          descriptions: item.descriptions || '',
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          purchaseRate: item.purchaseRate || item.purchase_rate,
        })),
        totalHardwareCost: quotation.totalHardwareCost || quotation.total_hardware_cost || 0,
        hardwarePurchaseTotal: quotation.hardwarePurchaseTotal || quotation.hardware_purchase_total || 0,
        hardwareGrossProfit: quotation.hardwareGrossProfit || quotation.hardware_gross_profit || 0,
        totalStructurePlusHardware: quotation.totalStructurePlusHardware || quotation.total_structure_plus_hardware || 0,
        gst: quotation.gst || 0,
        totalGrossProfit: quotation.totalGrossProfit || quotation.total_gross_profit || 0,
        totalProfitPercent: quotation.totalProfitPercent || quotation.total_profit_percent || 0,
        grandTotal: quotation.grandTotal || quotation.grand_total || quotation.amount || 0,
      };
      
      await downloadQuotationBOQPDF(boqData, `${quotation.number || 'quotation'}.pdf`);
    } else {
      // Use legacy format
      const quotationData: QuotationData = {
        quotationNumber: (quotation.number || '').replace('QUO-', '').replace('INV-', ''),
        date: quotation.date ? format(new Date(quotation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        validUntil: quotation.validUntil ? format(new Date(quotation.validUntil), 'yyyy-MM-dd') : quotation.valid_until ? format(new Date(quotation.valid_until), 'yyyy-MM-dd') : '',
        client: {
          name: (quotation.client as any).clientName || quotation.client.client_name || '',
          contactPerson: (quotation.client as any).contactPerson || quotation.client.contact_person || '',
          address: quotation.client.address || '',
          email: quotation.client.email || '',
          contactNo: (quotation.client as any).contactNo || quotation.client.contact_no || '',
        },
        company: {
          name: 'SolarSync Solutions',
          address: '123 Industrial Area, Solar City, India - 302001',
          email: 'info@solarsync.com',
          phone: '+91 98765 43210',
          gstin: '29ABCDE1234F1Z5',
        },
        items: quotation.lineItems ? quotation.lineItems.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
        })) : (quotation.enquiry ? [{
          description: quotation.enquiry.enquiryDetail || quotation.enquiry.enquiry_detail || '',
          quantity: 1,
          unit: 'Set',
          rate: quotation.grandTotal || quotation.amount || 0,
          amount: quotation.grandTotal || quotation.amount || 0,
        }] : []),
        subtotal: quotation.subtotal || 0,
        discount: quotation.discount || 0,
        discountAmount: quotation.discountAmount || quotation.discount_amount || 0,
        taxRate: quotation.taxRate || quotation.tax_rate || 18,
        taxAmount: quotation.taxAmount || quotation.tax_amount || 0,
        grandTotal: quotation.grandTotal || quotation.grand_total || quotation.amount || 0,
      };

      await downloadQuotationPDF(quotationData, `${quotation.number || 'quotation'}.pdf`);
    }
  };

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
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
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
        title="Quotations"
        subtitle={`${filteredQuotations.length} quotations`}
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canCreateQuotation && (
                <Button asChild>
                  <Link to="/quotations/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Quotation
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Quotation #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Enquiry</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map((quotation, index) => (
                <TableRow 
                  key={quotation.id}
                  className={cn(
                    'animate-fade-up',
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-mono font-medium">
                    {quotation.number}
                  </TableCell>
                  <TableCell>{(quotation.client as any)?.clientName || quotation.client?.client_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {quotation.enquiry?.enquiryNum || quotation.enquiry?.enquiry_num || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {quotation.date ? format(new Date(quotation.date), 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {quotation.validUntil ? format(new Date(quotation.validUntil), 'dd MMM yyyy') : quotation.valid_until ? format(new Date(quotation.valid_until), 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(quotation.grandTotal || quotation.grand_total || quotation.amount || 0)}
                  </TableCell>
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewPDF(quotation)}
                        title="View PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadPDF(quotation)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (!quotation.client?.email) {
                            toast.error('Client email not available');
                            return;
                          }
                          setSelectedQuotation(quotation);
                          setSendEmailDialogOpen(true);
                        }}
                        title="Send Email"
                        disabled={sendingEmail === quotation.id}
                      >
                        {sendingEmail === quotation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              Loading quotations...
            </CardContent>
          </Card>
        )}

        {!loading && filteredQuotations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No quotations found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'Create your first quotation'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Send Email Dialog */}
        <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Quotation via Email</DialogTitle>
              <DialogDescription>
                Send quotation to client: {selectedQuotation?.client ? ((selectedQuotation.client as any)?.clientName || selectedQuotation.client?.client_name || 'N/A') : 'N/A'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input 
                  value={selectedQuotation?.client?.email || ''} 
                  readOnly 
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>SMTP Configuration</Label>
                <Select value={selectedSmtpConfig} onValueChange={setSelectedSmtpConfig}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SMTP configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {smtpConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} {config.isDefault && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {smtpConfigs.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    No active SMTP configuration found. Please contact superadmin to configure SMTP settings.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSendEmailDialogOpen(false);
                    setSelectedQuotation(null);
                    setSelectedSmtpConfig('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmailConfirm}
                  disabled={!selectedSmtpConfig || !selectedQuotation || sendingEmail === selectedQuotation?.id}
                >
                  {sendingEmail === selectedQuotation?.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
