import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { enquiriesAPI, clientsAPI, quotationsAPI, invoicesAPI, smtpAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { downloadQuotationPDF, viewQuotationPDF, QuotationData } from '@/lib/pdfGenerator';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Download, 
  Send,
  FileText,
  Building2,
  Calculator,
  Eye,
  Loader2
} from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

type DocumentType = 'quotation' | 'invoice';

export default function InvoiceQuotation() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const enquiryId = searchParams.get('enquiry');
  const [existingEnquiry, setExistingEnquiry] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, enquiryRes, existingQuotationsRes] = await Promise.all([
          clientsAPI.getAll(),
          enquiryId ? enquiriesAPI.getById(enquiryId).catch(() => ({ success: false, data: null })) : Promise.resolve({ success: false, data: null }),
          enquiryId && docType === 'quotation' ? quotationsAPI.getByEnquiry(enquiryId).catch(() => ({ success: true, data: [] })) : Promise.resolve({ success: true, data: [] })
        ]);

        if (clientsRes.success && Array.isArray(clientsRes.data)) setClients(clientsRes.data);
        if (enquiryRes.success) setExistingEnquiry(enquiryRes.data);
        
        // If quotation exists for this enquiry, load it (only for quotation type, which is the default)
        if (existingQuotationsRes.success && Array.isArray(existingQuotationsRes.data) && existingQuotationsRes.data.length > 0) {
          const existingQuotation = existingQuotationsRes.data[0]; // Use the most recent one
          setSavedDocumentId(existingQuotation.id);
          // Optionally populate form with existing quotation data
          if (existingQuotation.date) setDocDate(format(new Date(existingQuotation.date), 'yyyy-MM-dd'));
          if (existingQuotation.validUntil) setValidUntil(format(new Date(existingQuotation.validUntil), 'yyyy-MM-dd'));
          if (existingQuotation.notes) setNotes(existingQuotation.notes);
          if (existingQuotation.terms) setTerms(existingQuotation.terms);
          if (existingQuotation.lineItems && existingQuotation.lineItems.length > 0) {
            setLineItems(existingQuotation.lineItems.map((item: any, index: number) => ({
              id: item.id || (index + 1).toString(),
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              amount: item.amount
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enquiryId]); // Removed docType from dependencies to avoid using before declaration

  // Only salesperson, director, and superadmin can create quotations/invoices
  const canCreate = currentUser?.role === 'salesman' || 
                    currentUser?.role === 'director' || 
                    currentUser?.role === 'superadmin';

  const [docType, setDocType] = useState<DocumentType>('quotation');
  const [selectedClient, setSelectedClient] = useState('');
  const [docNumber, setDocNumber] = useState(
    docType === 'quotation' ? `QUO-${Date.now().toString().slice(-6)}` : `INV-${Date.now().toString().slice(-6)}`
  );
  const [docDate, setDocDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    '1. Payment terms: 50% advance, 50% before dispatch.\n2. Delivery: Ex-works.\n3. GST extra as applicable.\n4. Validity: 15 days from date of quotation.'
  );
  
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);
  const [selectedSmtpConfig, setSelectedSmtpConfig] = useState<string>('');

  // Auto-populate client when enquiry is loaded
  useEffect(() => {
    if (existingEnquiry) {
      const enquiryClientId = existingEnquiry.clientId || existingEnquiry.client_id;
      if (enquiryClientId) {
        setSelectedClient(enquiryClientId);
      }
    }
  }, [existingEnquiry]);

  // Auto-populate line items when enquiry is loaded (separate effect to avoid dependency issues)
  useEffect(() => {
    if (existingEnquiry && existingEnquiry.enquiryDetail && lineItems.length === 0) {
      setLineItems([{
        id: '1',
        description: existingEnquiry.enquiryDetail || existingEnquiry.enquiry_detail || '',
        quantity: 1,
        unit: 'Set',
        rate: existingEnquiry.enquiryAmount || existingEnquiry.enquiry_amount || 0,
        amount: existingEnquiry.enquiryAmount || existingEnquiry.enquiry_amount || 0
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEnquiry]);

  const client = clients.find((c: any) => c.id === selectedClient);

  // Redirect if user doesn't have permission
  if (!canCreate) {
    return (
      <MainLayout>
        <Header title="Access Denied" showNewEnquiry={false} />
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have permission to create {docType === 'quotation' ? 'quotations' : 'invoices'}.
                Only salesperson and above can create {docType === 'quotation' ? 'quotations' : 'invoices'}.
              </p>
              <Button onClick={() => navigate(docType === 'quotation' ? '/quotations' : '/invoices')} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      amount: 0
    }]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleSave = async () => {
    // When enquiryId is present, use enquiry's clientId, otherwise use selectedClient
    const finalClientId = enquiryId && existingEnquiry 
      ? (existingEnquiry.clientId || existingEnquiry.client_id) 
      : selectedClient;
    
    if (!finalClientId) {
      toast.error('Please select a client');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (enquiryId && !existingEnquiry) {
      toast.error('Enquiry not found');
      return;
    }

    try {
      const data = {
        ...(enquiryId && { enquiryId }),
        clientId: finalClientId,
        date: docDate,
        validUntil: docType === 'quotation' ? validUntil : undefined,
        dueDate: docType === 'invoice' ? validUntil : undefined,
        status: 'draft',
        subtotal,
        discount,
        discountAmount,
        taxRate,
        taxAmount,
        grandTotal,
        notes,
        terms,
        lineItems: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount
        }))
      };

      if (docType === 'quotation') {
        let response;
        // If quotation already exists (savedDocumentId is set), update it
        if (savedDocumentId) {
          response = await quotationsAPI.update(savedDocumentId, data);
        } else if (enquiryId) {
          // Check if quotation already exists for this enquiry
          const existingQuotationsRes = await quotationsAPI.getByEnquiry(enquiryId);
          if (existingQuotationsRes.success && Array.isArray(existingQuotationsRes.data) && existingQuotationsRes.data.length > 0) {
            // Update the existing quotation instead of creating new one
            const existingQuotation = existingQuotationsRes.data[0];
            response = await quotationsAPI.update(existingQuotation.id, data);
            setSavedDocumentId(existingQuotation.id);
          } else {
            // Create new quotation
            response = await quotationsAPI.create(data);
            if (response.success && response.data) {
              setSavedDocumentId(response.data.id);
            }
          }
        } else {
          // Create new quotation (no enquiry linked and no existing ID)
          response = await quotationsAPI.create(data);
          if (response.success && response.data) {
            setSavedDocumentId(response.data.id);
          }
        }

        if (response.success) {
          toast.success(savedDocumentId ? 'Quotation updated successfully' : 'Quotation saved successfully');
          if (!sendEmailDialogOpen) {
            navigate('/quotations');
          }
        }
      } else {
        const response = await invoicesAPI.create(data);
        if (response.success && response.data && typeof response.data === 'object' && 'id' in response.data) {
          setSavedDocumentId((response.data as any).id);
          toast.success('Invoice saved successfully');
          if (!sendEmailDialogOpen) {
            navigate('/invoices');
          }
        }
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(`Failed to save ${docType}`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedClient || !client) {
      toast.error('Please select a client');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    const quotationData: QuotationData = {
      quotationNumber: docNumber.replace('QUO-', '').replace('INV-', ''),
      date: docDate,
      validUntil: validUntil || docDate,
      client: {
        name: (client as any).clientName || client.client_name,
        contactPerson: (client as any).contactPerson || client.contact_person,
        address: client.address,
        email: client.email,
        contactNo: (client as any).contactNo || client.contact_no,
      },
      company: {
        name: 'SolarSync Solutions',
        address: '123 Industrial Area, Solar City, India - 302001',
        email: 'info@solarsync.com',
        phone: '+91 98765 43210',
        gstin: '29ABCDE1234F1Z5',
      },
      items: lineItems,
      subtotal,
      discount,
      discountAmount,
      taxRate,
      taxAmount,
      grandTotal,
      notes: notes || undefined,
      terms: terms || undefined,
    };

    try {
      await downloadQuotationPDF(quotationData, `${docType === 'quotation' ? 'Quotation' : 'Invoice'}-${docNumber}.pdf`);
      toast.success(`${docType === 'quotation' ? 'Quotation' : 'Invoice'} PDF downloaded successfully`);
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  const handleViewPDF = async () => {
    if (!selectedClient || !client) {
      toast.error('Please select a client');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    const quotationData: QuotationData = {
      quotationNumber: docNumber.replace('QUO-', '').replace('INV-', ''),
      date: docDate,
      validUntil: validUntil || docDate,
      client: {
        name: (client as any).clientName || client.client_name,
        contactPerson: (client as any).contactPerson || client.contact_person,
        address: client.address,
        email: client.email,
        contactNo: (client as any).contactNo || client.contact_no,
      },
      company: {
        name: 'SolarSync Solutions',
        address: '123 Industrial Area, Solar City, India - 302001',
        email: 'info@solarsync.com',
        phone: '+91 98765 43210',
        gstin: '29ABCDE1234F1Z5',
      },
      items: lineItems,
      subtotal,
      discount,
      discountAmount,
      taxRate,
      taxAmount,
      grandTotal,
      notes: notes || undefined,
      terms: terms || undefined,
    };

    try {
      await viewQuotationPDF(quotationData);
      toast.success(`Opening ${docType === 'quotation' ? 'Quotation' : 'Invoice'} in new window`);
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  // Fetch SMTP configs when dialog opens
  useEffect(() => {
    if (sendEmailDialogOpen && docType === 'quotation') {
      const fetchSmtpConfigs = async () => {
        try {
          const response = await smtpAPI.getActive();
          if (response.success && response.data && Array.isArray(response.data)) {
            setSmtpConfigs(response.data);
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
  }, [sendEmailDialogOpen, docType]);

  const handleSendEmail = async () => {
    if (!client?.email) {
      toast.error('Client email not available');
      return;
    }

    if (docType !== 'quotation') {
      toast.error('Email sending is currently only available for quotations');
      return;
    }

    try {
      setSendingEmail(true);
      const finalClientId = enquiryId && existingEnquiry 
        ? (existingEnquiry.clientId || existingEnquiry.client_id) 
        : selectedClient;
      
      if (!finalClientId || lineItems.length === 0) {
        toast.error('Please fill in all required fields');
        setSendingEmail(false);
        return;
      }

      const data = {
        ...(enquiryId && { enquiryId }),
        clientId: finalClientId,
        date: docDate,
        validUntil: validUntil,
        status: savedDocumentId ? 'draft' : 'draft', // Keep existing status if updating
        subtotal,
        discount,
        discountAmount,
        taxRate,
        taxAmount,
        grandTotal,
        notes,
        terms,
        lineItems: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount
        }))
      };

      let response;
      // If quotation already exists for this enquiry, update it; otherwise create new
      if (savedDocumentId) {
        // Update existing quotation
        response = await quotationsAPI.update(savedDocumentId, data);
      } else {
        // Check if quotation already exists for this enquiry
        if (enquiryId) {
          const existingQuotationsRes = await quotationsAPI.getByEnquiry(enquiryId);
          if (existingQuotationsRes.success && Array.isArray(existingQuotationsRes.data) && existingQuotationsRes.data.length > 0) {
            // Update the existing quotation instead of creating new one
            const existingQuotation = existingQuotationsRes.data[0] as any;
            response = await quotationsAPI.update(existingQuotation.id, data);
            setSavedDocumentId(existingQuotation.id);
          } else {
            // Create new quotation
            response = await quotationsAPI.create(data);
            if (response.success && response.data && typeof response.data === 'object' && 'id' in response.data) {
              setSavedDocumentId((response.data as any).id);
            }
          }
        } else {
          // Create new quotation (no enquiry linked)
          response = await quotationsAPI.create(data);
          if (response.success && response.data && typeof response.data === 'object' && 'id' in response.data) {
            setSavedDocumentId((response.data as any).id);
          }
        }
      }

      if (response.success) {
        setSendEmailDialogOpen(true);
      } else {
        toast.error('Failed to save quotation');
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendEmailConfirm = async () => {
    if (!savedDocumentId || !selectedSmtpConfig) {
      toast.error('Please select SMTP configuration');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await quotationsAPI.sendEmail(savedDocumentId, selectedSmtpConfig);
      
      if (response.success) {
        toast.success('Quotation sent successfully!');
        setSendEmailDialogOpen(false);
        navigate('/quotations');
      } else {
        toast.error(response.message || 'Failed to send quotation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send quotation');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <MainLayout>
      <Header 
        title={docType === 'quotation' ? 'Create Quotation' : 'Create Invoice'}
        subtitle="Generate professional documents"
        showNewEnquiry={false}
      />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Type & Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Document Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={docType} onValueChange={(v: DocumentType) => setDocType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quotation">Quotation</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Document Number</Label>
                    <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{docType === 'quotation' ? 'Valid Until' : 'Due Date'}</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client {enquiryId && '(Linked to Enquiry)'}</Label>
                  {enquiryId && existingEnquiry ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="font-medium text-gray-900">
                        {(existingEnquiry.client as any)?.clientName || existingEnquiry.client?.client_name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Enquiry: {existingEnquiry.enquiryNum || existingEnquiry.enquiry_num}
                      </p>
                    </div>
                  ) : (
                    <Select value={selectedClient} onValueChange={setSelectedClient} required={!enquiryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c as any).clientName || c.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-accent" />
                    Line Items
                  </CardTitle>
                  <Button onClick={addLineItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead className="w-[10%]">Qty</TableHead>
                        <TableHead className="w-[10%]">Unit</TableHead>
                        <TableHead className="w-[15%]">Rate</TableHead>
                        <TableHead className="w-[15%]">Amount</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                              className="min-h-[60px] resize-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min={0}
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.unit} 
                              onValueChange={(v) => updateLineItem(item.id, 'unit', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nos">Nos</SelectItem>
                                <SelectItem value="Set">Set</SelectItem>
                                <SelectItem value="Kg">Kg</SelectItem>
                                <SelectItem value="Mtr">Mtr</SelectItem>
                                <SelectItem value="Sqm">Sqm</SelectItem>
                                <SelectItem value="Lot">Lot</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              min={0}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeLineItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {lineItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            No items added. Click "Add Item" to start.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">Subtotal</TableCell>
                        <TableCell colSpan={2} className="font-medium">{formatCurrency(subtotal)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} className="text-right">Discount</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={discount}
                              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                              className="w-16 h-8"
                              min={0}
                              max={100}
                            />
                            <span>%</span>
                          </div>
                        </TableCell>
                        <TableCell colSpan={2} className="text-destructive">-{formatCurrency(discountAmount)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} className="text-right">GST</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={taxRate}
                              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                              className="w-16 h-8"
                              min={0}
                            />
                            <span>%</span>
                          </div>
                        </TableCell>
                        <TableCell colSpan={2}>{formatCurrency(taxAmount)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-accent/10">
                        <TableCell colSpan={4} className="text-right font-bold text-lg">Grand Total</TableCell>
                        <TableCell colSpan={2} className="font-bold text-lg text-accent">{formatCurrency(grandTotal)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for the client..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview & Actions Sidebar */}
          <div className="space-y-6">
            {/* Client Preview */}
            {client && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-accent" />
                    Bill To
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{client.client_name}</p>
                  <p className="text-muted-foreground">{client.contact_person}</p>
                  <p className="text-muted-foreground">{client.address}</p>
                  <p className="text-muted-foreground">{client.email}</p>
                  <p className="text-muted-foreground">{client.contact_no}</p>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm opacity-80">
                  <span>Items</span>
                  <span>{lineItems.length}</span>
                </div>
                <div className="flex justify-between text-sm opacity-80">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Discount ({discount}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm opacity-80">
                  <span>GST ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <Separator className="bg-primary-foreground/20" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button onClick={handleSave} className="w-full">
                Save {docType === 'quotation' ? 'Quotation' : 'Invoice'}
              </Button>
              <Button onClick={handleViewPDF} variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View PDF
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {docType === 'quotation' && (
                <Button 
                  onClick={handleSendEmail} 
                  variant="outline" 
                  className="w-full"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Client
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Send Email Dialog */}
        {docType === 'quotation' && (
          <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Quotation via Email</DialogTitle>
                <DialogDescription>
                  Send quotation to client: {client?.clientName || client?.client_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Client Email</Label>
                  <Input 
                    value={client?.email || ''} 
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
                    <p className="text-sm text-red-600">
                      No active SMTP configuration found. Please configure SMTP settings first.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSendEmailDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendEmailConfirm}
                    disabled={!selectedSmtpConfig || sendingEmail}
                  >
                    {sendingEmail ? (
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
        )}
      </div>
    </MainLayout>
  );
}
