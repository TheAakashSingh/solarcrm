import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enquiriesAPI, clientsAPI, quotationsAPI, smtpAPI } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, Plus, Trash2, Loader2, Eye, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { downloadQuotationBOQPDF, viewQuotationBOQPDF, QuotationBOQData } from '@/lib/pdfGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BoqItem {
  id: string;
  srNo: number;
  descriptions: string;
  type: string;
  specification: string;
  lengthMm: number;
  requiredQty: number;
  totalWeight: number;
  weightPerPec: number;
  qtyPerTable: number;
  weightPerTable: number;
  unitWeight: number;
  purchaseRate?: number;
}

interface HardwareItem {
  id: string;
  srNo: number;
  descriptions: string;
  quantity: number;
  rate: number;
  amount: number;
  purchaseRate?: number;
}

export default function QuotationBOQForm() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: quotationId } = useParams<{ id?: string }>();
  const enquiryIdFromParams = searchParams.get('enquiry');
  const [enquiryId, setEnquiryId] = useState<string | null>(enquiryIdFromParams);
  const [existingEnquiry, setExistingEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(quotationId || null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);
  const [selectedSmtpConfig, setSelectedSmtpConfig] = useState<string>('');
  
  // Header fields
  const [orderNo, setOrderNo] = useState('');
  const [nosOfModule, setNosOfModule] = useState('');
  const [quotationDate, setQuotationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectCapacity, setProjectCapacity] = useState('');
  const [noOfTable, setNoOfTable] = useState(1);
  
  // BOQ Items
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  
  // BOQ Summary
  const [totalWeight, setTotalWeight] = useState(0);
  const [purchaseRate, setPurchaseRate] = useState(84);
  const [weightIncreaseAfterHDG, setWeightIncreaseAfterHDG] = useState(0);
  const [costing, setCosting] = useState(0);
  const [totalWeightAfterHotDip, setTotalWeightAfterHotDip] = useState(0);
  const [ratePerKg, setRatePerKg] = useState(100);
  const [boqGrossProfit, setBoqGrossProfit] = useState(0);
  const [boqProfitPercent, setBoqProfitPercent] = useState(0);
  const [totalBoqAmount, setTotalBoqAmount] = useState(0);
  
  // Hardware Items
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([]);
  
  // Hardware Summary
  const [totalHardwareCost, setTotalHardwareCost] = useState(0);
  const [hardwarePurchaseTotal, setHardwarePurchaseTotal] = useState(0);
  const [hardwareGrossProfit, setHardwareGrossProfit] = useState(0);
  const [totalStructurePlusHardware, setTotalStructurePlusHardware] = useState(0);
  const [gst, setGst] = useState(0);
  const [totalGrossProfit, setTotalGrossProfit] = useState(0);
  const [totalProfitPercent, setTotalProfitPercent] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If quotationId is provided, load quotation first to get enquiryId
        if (quotationId) {
          const quotationRes = await quotationsAPI.getById(quotationId);
          if (quotationRes.success && quotationRes.data) {
            const existingQuotation = quotationRes.data;
            setSavedDocumentId((existingQuotation as any).id);
            
            // Get enquiry from quotation
            const qEnquiryId = (existingQuotation as any).enquiryId || (existingQuotation as any).enquiry_id;
            if (qEnquiryId) {
              setEnquiryId(qEnquiryId); // Store enquiryId in state
              const enquiryRes = await enquiriesAPI.getById(qEnquiryId);
              if (enquiryRes.success && enquiryRes.data) {
                setExistingEnquiry(enquiryRes.data);
              }
            } else if ((existingQuotation as any).enquiry) {
              setExistingEnquiry((existingQuotation as any).enquiry);
              if ((existingQuotation as any).enquiry.id) {
                setEnquiryId((existingQuotation as any).enquiry.id); // Store enquiryId from enquiry object
              }
            }
            
            // Load existing quotation data
            if ((existingQuotation as any).orderNo) setOrderNo((existingQuotation as any).orderNo);
            if ((existingQuotation as any).nosOfModule) setNosOfModule((existingQuotation as any).nosOfModule);
            if ((existingQuotation as any).date) setQuotationDate(format(new Date((existingQuotation as any).date), 'yyyy-MM-dd'));
            if ((existingQuotation as any).projectCapacity) setProjectCapacity((existingQuotation as any).projectCapacity);
            if ((existingQuotation as any).noOfTable) setNoOfTable((existingQuotation as any).noOfTable);
            if ((existingQuotation as any).boqItems && (existingQuotation as any).boqItems.length > 0) {
              setBoqItems((existingQuotation as any).boqItems.map((item: any) => ({ ...item, id: item.id || Math.random().toString() })));
            }
            if ((existingQuotation as any).hardwareItems && (existingQuotation as any).hardwareItems.length > 0) {
              setHardwareItems((existingQuotation as any).hardwareItems.map((item: any) => ({ ...item, id: item.id || Math.random().toString() })));
            }
            // Load summary fields
            if ((existingQuotation as any).totalWeight) setTotalWeight((existingQuotation as any).totalWeight);
            if ((existingQuotation as any).purchaseRate) setPurchaseRate((existingQuotation as any).purchaseRate);
            if ((existingQuotation as any).weightIncreaseAfterHDG) setWeightIncreaseAfterHDG((existingQuotation as any).weightIncreaseAfterHDG);
            if ((existingQuotation as any).costing) setCosting((existingQuotation as any).costing);
            if ((existingQuotation as any).totalWeightAfterHotDip) setTotalWeightAfterHotDip((existingQuotation as any).totalWeightAfterHotDip);
            if ((existingQuotation as any).ratePerKg) setRatePerKg((existingQuotation as any).ratePerKg);
            if ((existingQuotation as any).boqGrossProfit) setBoqGrossProfit((existingQuotation as any).boqGrossProfit);
            if ((existingQuotation as any).boqProfitPercent) setBoqProfitPercent((existingQuotation as any).boqProfitPercent);
            if ((existingQuotation as any).totalBoqAmount) setTotalBoqAmount((existingQuotation as any).totalBoqAmount);
            if ((existingQuotation as any).totalHardwareCost) setTotalHardwareCost((existingQuotation as any).totalHardwareCost);
            if ((existingQuotation as any).hardwarePurchaseTotal) setHardwarePurchaseTotal((existingQuotation as any).hardwarePurchaseTotal);
            if ((existingQuotation as any).hardwareGrossProfit) setHardwareGrossProfit((existingQuotation as any).hardwareGrossProfit);
            if ((existingQuotation as any).totalStructurePlusHardware) setTotalStructurePlusHardware((existingQuotation as any).totalStructurePlusHardware);
            if ((existingQuotation as any).gst) setGst((existingQuotation as any).gst);
            if ((existingQuotation as any).totalGrossProfit) setTotalGrossProfit((existingQuotation as any).totalGrossProfit);
            if ((existingQuotation as any).totalProfitPercent) setTotalProfitPercent((existingQuotation as any).totalProfitPercent);
            if ((existingQuotation as any).grandTotal) setGrandTotal((existingQuotation as any).grandTotal);
            
            setLoading(false);
            return;
          }
        }
        
        if (enquiryIdFromParams) {
          setEnquiryId(enquiryIdFromParams); // Ensure state is set
          const enquiryRes = await enquiriesAPI.getById(enquiryIdFromParams);
          if (enquiryRes.success && enquiryRes.data) {
            setExistingEnquiry(enquiryRes.data);
            const enquiry = enquiryRes.data;
            
            // Check if quotation exists
            const quotationsRes = await quotationsAPI.getByEnquiry(enquiryIdFromParams);
            if (quotationsRes.success && Array.isArray(quotationsRes.data) && quotationsRes.data.length > 0) {
              // Load existing quotation data
              const existingQuotation = quotationsRes.data[0];
              setSavedDocumentId(existingQuotation.id);
              // Load existing data
              if (existingQuotation.orderNo) setOrderNo(existingQuotation.orderNo);
              if (existingQuotation.nosOfModule) setNosOfModule(existingQuotation.nosOfModule);
              if (existingQuotation.date) setQuotationDate(format(new Date(existingQuotation.date), 'yyyy-MM-dd'));
              if (existingQuotation.projectCapacity) setProjectCapacity(existingQuotation.projectCapacity);
              if (existingQuotation.noOfTable) setNoOfTable(existingQuotation.noOfTable);
              if (existingQuotation.boqItems && existingQuotation.boqItems.length > 0) {
                setBoqItems(existingQuotation.boqItems.map((item: any) => ({ ...item, id: item.id || Math.random().toString() })));
              }
              if (existingQuotation.hardwareItems && existingQuotation.hardwareItems.length > 0) {
                setHardwareItems(existingQuotation.hardwareItems.map((item: any) => ({ ...item, id: item.id || Math.random().toString() })));
              }
              // Load summary fields
              if (existingQuotation.totalWeight) setTotalWeight(existingQuotation.totalWeight);
              if (existingQuotation.purchaseRate) setPurchaseRate(existingQuotation.purchaseRate);
              if (existingQuotation.weightIncreaseAfterHDG) setWeightIncreaseAfterHDG(existingQuotation.weightIncreaseAfterHDG);
              if (existingQuotation.costing) setCosting(existingQuotation.costing);
              if (existingQuotation.totalWeightAfterHotDip) setTotalWeightAfterHotDip(existingQuotation.totalWeightAfterHotDip);
              if (existingQuotation.ratePerKg) setRatePerKg(existingQuotation.ratePerKg);
              if (existingQuotation.boqGrossProfit) setBoqGrossProfit(existingQuotation.boqGrossProfit);
              if (existingQuotation.boqProfitPercent) setBoqProfitPercent(existingQuotation.boqProfitPercent);
              if (existingQuotation.totalBoqAmount) setTotalBoqAmount(existingQuotation.totalBoqAmount);
              if (existingQuotation.totalHardwareCost) setTotalHardwareCost(existingQuotation.totalHardwareCost);
              if (existingQuotation.hardwarePurchaseTotal) setHardwarePurchaseTotal(existingQuotation.hardwarePurchaseTotal);
              if (existingQuotation.hardwareGrossProfit) setHardwareGrossProfit(existingQuotation.hardwareGrossProfit);
              if (existingQuotation.totalStructurePlusHardware) setTotalStructurePlusHardware(existingQuotation.totalStructurePlusHardware);
              if (existingQuotation.gst) setGst(existingQuotation.gst);
              if (existingQuotation.totalGrossProfit) setTotalGrossProfit(existingQuotation.totalGrossProfit);
              if (existingQuotation.totalProfitPercent) setTotalProfitPercent(existingQuotation.totalProfitPercent);
              if (existingQuotation.grandTotal) setGrandTotal(existingQuotation.grandTotal);
            } else {
              // No quotation exists yet - populate from enquiry data
              // Always use enquiry's order number (auto-generated when enquiry was created)
              const enquiryOrderNumber = (enquiry as any).orderNumber;
              if (enquiryOrderNumber) {
                setOrderNo(enquiryOrderNumber);
              } else {
                // If order number doesn't exist yet, set a placeholder (should not happen as it's auto-generated)
                setOrderNo('Order number will be generated');
              }
              // Map enquiry detail to project capacity if available (can be extracted later if needed)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load enquiry data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enquiryIdFromParams, quotationId]);

  // Fetch SMTP configs when dialog opens
  useEffect(() => {
    if (sendEmailDialogOpen) {
      const fetchSmtpConfigs = async () => {
        try {
          const response = await smtpAPI.getActive();
          if (response.success && Array.isArray(response.data)) {
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
  }, [sendEmailDialogOpen]);

  // Calculate BOQ totals
  useEffect(() => {
    const total = boqItems.reduce((sum, item) => sum + (item.totalWeight || 0), 0);
    setTotalWeight(total);
    
    const hdgIncrease = total * 0.08; // 8% increase
    setWeightIncreaseAfterHDG(hdgIncrease);
    
    const afterHotDip = total + hdgIncrease;
    setTotalWeightAfterHotDip(afterHotDip);
    
    const cost = total * purchaseRate;
    setCosting(cost);
    
    const amount = afterHotDip * ratePerKg;
    setTotalBoqAmount(amount);
    
    const profit = amount - cost;
    setBoqGrossProfit(profit);
    
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    setBoqProfitPercent(profitPercent);
  }, [boqItems, purchaseRate, ratePerKg]);

  // Calculate Hardware totals
  useEffect(() => {
    const total = hardwareItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    setTotalHardwareCost(total);
    
    const purchaseTotal = hardwareItems.reduce((sum, item) => sum + ((item.purchaseRate || 0) * item.quantity), 0);
    setHardwarePurchaseTotal(purchaseTotal);
    
    const profit = total - purchaseTotal;
    setHardwareGrossProfit(profit);
    
    const structurePlusHardware = totalBoqAmount + total;
    setTotalStructurePlusHardware(structurePlusHardware);
    
    const gstAmount = structurePlusHardware * 0.18; // 18% GST
    setGst(gstAmount);
    
    const grandTotalAmount = structurePlusHardware + gstAmount;
    setGrandTotal(grandTotalAmount);
    
    const totalProfit = boqGrossProfit + profit;
    setTotalGrossProfit(totalProfit);
    
    const totalProfitPercent = (costing + purchaseTotal) > 0 ? (totalProfit / (costing + purchaseTotal)) * 100 : 0;
    setTotalProfitPercent(totalProfitPercent);
  }, [hardwareItems, totalBoqAmount, boqGrossProfit, costing]);

  const addBoqItem = () => {
    const newItem: BoqItem = {
      id: Math.random().toString(),
      srNo: boqItems.length + 1,
      descriptions: '',
      type: '',
      specification: '',
      lengthMm: 0,
      requiredQty: 0,
      totalWeight: 0,
      weightPerPec: 0,
      qtyPerTable: 0,
      weightPerTable: 0,
      unitWeight: 0,
      purchaseRate: 0
    };
    setBoqItems([...boqItems, newItem]);
  };

  const removeBoqItem = (id: string) => {
    setBoqItems(boqItems.filter(item => item.id !== id).map((item, index) => ({ ...item, srNo: index + 1 })));
  };

  const updateBoqItem = (id: string, field: keyof BoqItem, value: any) => {
    setBoqItems(boqItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate totalWeight if requiredQty and weightPerPec are set
        if (field === 'requiredQty' || field === 'weightPerPec') {
          updated.totalWeight = (updated.requiredQty || 0) * (updated.weightPerPec || 0);
        }
        // Auto-calculate weightPerTable if qtyPerTable and weightPerPec are set
        if (field === 'qtyPerTable' || field === 'weightPerPec') {
          updated.weightPerTable = (updated.qtyPerTable || 0) * (updated.weightPerPec || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const addHardwareItem = () => {
    const newItem: HardwareItem = {
      id: Math.random().toString(),
      srNo: hardwareItems.length + 1,
      descriptions: '',
      quantity: 0,
      rate: 0,
      amount: 0,
      purchaseRate: 0
    };
    setHardwareItems([...hardwareItems, newItem]);
  };

  const removeHardwareItem = (id: string) => {
    setHardwareItems(hardwareItems.filter(item => item.id !== id).map((item, index) => ({ ...item, srNo: index + 1 })));
  };

  const updateHardwareItem = (id: string, field: keyof HardwareItem, value: any) => {
    setHardwareItems(hardwareItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate amount if quantity and rate are set
        if (field === 'quantity' || field === 'rate') {
          updated.amount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSave = async () => {
    // Get enquiryId from multiple sources
    let finalEnquiryId = enquiryId || (existingEnquiry?.id);
    
    // If we still don't have enquiryId but have savedDocumentId, fetch quotation to get it
    if (!finalEnquiryId && savedDocumentId) {
      try {
        const res = await quotationsAPI.getById(savedDocumentId);
        if (res.success && res.data) {
          finalEnquiryId = (res.data as any).enquiryId || (res.data as any).enquiry_id;
        }
      } catch (e) {
        console.error('Error fetching quotation:', e);
      }
    }

    if (!finalEnquiryId || !existingEnquiry) {
      toast.error('Enquiry information is required');
      return;
    }

    if (boqItems.length === 0) {
      toast.error('Please add at least one BOQ item');
      return;
    }

    try {
      const data = {
        enquiryId: finalEnquiryId,
        clientId: existingEnquiry.clientId || existingEnquiry.client_id,
        date: quotationDate,
        validUntil: quotationDate,
        orderNo,
        nosOfModule,
        projectCapacity,
        noOfTable,
        // Required fields for API
        subtotal: totalStructurePlusHardware,
        discount: 0,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: gst,
        grandTotal,
        notes: '',
        terms: '',
        lineItems: [], // Empty array for BOQ format
        boqItems: boqItems.map(item => ({
          srNo: item.srNo,
          descriptions: item.descriptions,
          type: item.type,
          specification: item.specification,
          lengthMm: item.lengthMm,
          requiredQty: item.requiredQty,
          totalWeight: item.totalWeight,
          weightPerPec: item.weightPerPec,
          qtyPerTable: item.qtyPerTable,
          weightPerTable: item.weightPerTable,
          unitWeight: item.unitWeight,
          purchaseRate: item.purchaseRate
        })),
        hardwareItems: hardwareItems.map(item => ({
          srNo: item.srNo,
          descriptions: item.descriptions,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          purchaseRate: item.purchaseRate
        })),
        totalWeightInKg: totalWeight,
        weightIncreaseAfterHdg: weightIncreaseAfterHDG,
        totalWeightAfterHotdip: totalWeightAfterHotDip,
        ratePerKg,
        totalAmountBoq: totalBoqAmount,
        boqPurchaseRate: purchaseRate,
        boqCosting: costing,
        boqGrossProfit,
        boqProfitPercent,
        totalHardwareCost,
        hardwarePurchaseTotal,
        totalStructurePlusHardware,
        hardwareGrossProfit,
        totalGrossProfit,
        totalProfitPercent,
        status: 'draft'
      };

      let response;
      if (savedDocumentId) {
        response = await quotationsAPI.update(savedDocumentId, data);
      } else {
        response = await quotationsAPI.create(data);
        if (response.success && response.data && typeof response.data === 'object' && 'id' in response.data) {
          setSavedDocumentId((response.data as any).id);
        }
      }

      if (response.success) {
        toast.success(savedDocumentId ? 'Quotation updated successfully' : 'Quotation saved successfully');
      } else {
        toast.error('Failed to save quotation');
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    }
  };

  const handleViewPDF = async () => {
    if (!existingEnquiry || !existingEnquiry.client) {
      toast.error('Client information is required');
      return;
    }

    const quotationData: QuotationBOQData = {
      orderNo,
      nosOfModule,
      date: quotationDate,
      projectCapacity,
      noOfTable,
      clientName: (existingEnquiry.client as any)?.clientName || existingEnquiry.client?.client_name || '',
      boqItems: boqItems.map(item => ({
        srNo: item.srNo,
        descriptions: item.descriptions,
        type: item.type,
        specification: item.specification,
        lengthMm: item.lengthMm,
        requiredQty: item.requiredQty,
        totalWeight: item.totalWeight,
        weightPerPec: item.weightPerPec,
        qtyPerTable: item.qtyPerTable,
        weightPerTable: item.weightPerTable,
        unitWeight: item.unitWeight
      })),
      totalWeight,
      purchaseRate,
      weightIncreaseAfterHDG,
      costing,
      totalWeightAfterHotDip,
      ratePerKg,
      boqGrossProfit,
      boqProfitPercent,
      totalBoqAmount,
      hardwareItems: hardwareItems.map(item => ({
        srNo: item.srNo,
        descriptions: item.descriptions,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        purchaseRate: item.purchaseRate
      })),
      totalHardwareCost,
      hardwarePurchaseTotal,
      hardwareGrossProfit,
      totalStructurePlusHardware,
      gst,
      totalGrossProfit,
      totalProfitPercent,
      grandTotal
    };

    try {
      await viewQuotationBOQPDF(quotationData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadPDF = async () => {
    if (!existingEnquiry || !existingEnquiry.client) {
      toast.error('Client information is required');
      return;
    }

    const quotationData: QuotationBOQData = {
      orderNo,
      nosOfModule,
      date: quotationDate,
      projectCapacity,
      noOfTable,
      clientName: (existingEnquiry.client as any)?.clientName || existingEnquiry.client?.client_name || '',
      boqItems: boqItems.map(item => ({
        srNo: item.srNo,
        descriptions: item.descriptions,
        type: item.type,
        specification: item.specification,
        lengthMm: item.lengthMm,
        requiredQty: item.requiredQty,
        totalWeight: item.totalWeight,
        weightPerPec: item.weightPerPec,
        qtyPerTable: item.qtyPerTable,
        weightPerTable: item.weightPerTable,
        unitWeight: item.unitWeight
      })),
      totalWeight,
      purchaseRate,
      weightIncreaseAfterHDG,
      costing,
      totalWeightAfterHotDip,
      ratePerKg,
      boqGrossProfit,
      boqProfitPercent,
      totalBoqAmount,
      hardwareItems: hardwareItems.map(item => ({
        srNo: item.srNo,
        descriptions: item.descriptions,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        purchaseRate: item.purchaseRate
      })),
      totalHardwareCost,
      hardwarePurchaseTotal,
      hardwareGrossProfit,
      totalStructurePlusHardware,
      gst,
      totalGrossProfit,
      totalProfitPercent,
      grandTotal
    };

    try {
      await downloadQuotationBOQPDF(quotationData, `Quotation-${orderNo || 'BOQ'}-${quotationDate}.pdf`);
      toast.success('Quotation PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!existingEnquiry || !existingEnquiry.client?.email) {
      toast.error('Client email not available');
      return;
    }

    // Save first if not saved
    if (!savedDocumentId) {
      await handleSave();
      // Wait a bit for save to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSendEmailDialogOpen(true);
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
      } else {
        toast.error(response.message || 'Failed to send quotation');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send quotation');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Loading..." showNewEnquiry={false} />
        <div className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Create Quotation (BOQ Format)"
        subtitle="Bill of Quantity and Hardware Details"
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Header</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Order No. {enquiryId && '(Auto-generated from Enquiry)'}</Label>
              <Input 
                value={orderNo} 
                onChange={(e) => {
                  // Don't allow manual editing if enquiry exists - always use enquiry's order number
                  if (!enquiryId) {
                    setOrderNo(e.target.value);
                  }
                }}
                readOnly={!!enquiryId}
                className={enquiryId ? 'bg-gray-50 cursor-not-allowed' : ''}
              />
              {enquiryId && (
                <p className="text-xs text-gray-500 mt-1">Order number is auto-generated when enquiry is created</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nos. of Module</Label>
              <Input value={nosOfModule} onChange={(e) => setNosOfModule(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Project Capacity (KW)</Label>
              <Input value={projectCapacity} onChange={(e) => setProjectCapacity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>No of Table</Label>
              <Input type="number" value={noOfTable} onChange={(e) => setNoOfTable(parseInt(e.target.value) || 1)} />
            </div>
          </CardContent>
        </Card>

        {/* BOQ Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>BOQ of HD Mounting Structure</CardTitle>
            <Button onClick={addBoqItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">SR.</th>
                    <th className="border p-2">DESCRIPTIONS</th>
                    <th className="border p-2">TYPE</th>
                    <th className="border p-2">SPECIFICATION</th>
                    <th className="border p-2">LENGTH (MM)</th>
                    <th className="border p-2">REQUIRED QTY.</th>
                    <th className="border p-2">TOTAL WEIGHT</th>
                    <th className="border p-2">WEIGHT / PEC</th>
                    <th className="border p-2">QTY/TABLE</th>
                    <th className="border p-2">WEIGHT / TABLE</th>
                    <th className="border p-2">UNIT WEIGHT</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.srNo}</td>
                      <td className="border p-2">
                        <Input
                          value={item.descriptions}
                          onChange={(e) => updateBoqItem(item.id, 'descriptions', e.target.value)}
                          className="min-w-[150px]"
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          value={item.type}
                          onChange={(e) => updateBoqItem(item.id, 'type', e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          value={item.specification}
                          onChange={(e) => updateBoqItem(item.id, 'specification', e.target.value)}
                          className="min-w-[150px]"
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.lengthMm}
                          onChange={(e) => updateBoqItem(item.id, 'lengthMm', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.requiredQty}
                          onChange={(e) => updateBoqItem(item.id, 'requiredQty', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">{item.totalWeight.toFixed(2)}</td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.weightPerPec}
                          onChange={(e) => updateBoqItem(item.id, 'weightPerPec', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.qtyPerTable}
                          onChange={(e) => updateBoqItem(item.id, 'qtyPerTable', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">{item.weightPerTable.toFixed(2)}</td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitWeight}
                          onChange={(e) => updateBoqItem(item.id, 'unitWeight', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBoqItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BOQ Summary */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>TOTAL WEIGHT IN KG</Label>
                <Input value={totalWeight.toFixed(1)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Purchase rate</Label>
                <Input type="number" value={purchaseRate} onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>WEIGHT INCREASE AFTER HDG@8%</Label>
                <Input value={weightIncreaseAfterHDG.toFixed(1)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Costing</Label>
                <Input value={costing.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>TOTAL WEIGHT AFTER HOTDIP</Label>
                <Input value={totalWeightAfterHotDip.toFixed(1)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>RATE PER KG</Label>
                <Input type="number" value={ratePerKg} onChange={(e) => setRatePerKg(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Gross profit</Label>
                <Input value={boqGrossProfit.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>TOTAL AMOUNT</Label>
                <Input value={totalBoqAmount.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Profit Percent</Label>
                <Input value={boqProfitPercent.toFixed(1)} readOnly className="bg-gray-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hardware Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>HARDWARES & BOS DETAILS & PRICE</CardTitle>
            <Button onClick={addHardwareItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">SR.NO.</th>
                    <th className="border p-2">DESCRIPTIONS</th>
                    <th className="border p-2">QUANTITY</th>
                    <th className="border p-2">RATE</th>
                    <th className="border p-2">AMOUNT</th>
                    <th className="border p-2">Purchase rate</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.srNo}</td>
                      <td className="border p-2">
                        <Input
                          value={item.descriptions}
                          onChange={(e) => updateHardwareItem(item.id, 'descriptions', e.target.value)}
                          className="min-w-[300px]"
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateHardwareItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateHardwareItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">{item.amount.toFixed(2)}</td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          value={item.purchaseRate || 0}
                          onChange={(e) => updateHardwareItem(item.id, 'purchaseRate', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHardwareItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hardware Summary */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>TOTAL HARDWARE COST</Label>
                <Input value={totalHardwareCost.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Total (Purchase)</Label>
                <Input value={hardwarePurchaseTotal.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>TOTAL STRUCTURE + HARDWARE COST</Label>
                <Input value={totalStructurePlusHardware.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Gross profit (Hardware)</Label>
                <Input value={hardwareGrossProfit.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>GST @ 18%</Label>
                <Input value={gst.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Total Gross Profit</Label>
                <Input value={totalGrossProfit.toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>GRAND TOTAL AMOUNT</Label>
                <Input value={grandTotal.toFixed(2)} readOnly className="bg-gray-50 font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Total Profit Percent</Label>
                <Input value={totalProfitPercent.toFixed(1)} readOnly className="bg-gray-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Quotation
          </Button>
          <Button onClick={handleViewPDF} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View PDF
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handleSendEmail} variant="outline" className="flex-1" disabled={!existingEnquiry?.client?.email}>
            <Send className="h-4 w-4 mr-2" />
            Send to Client
          </Button>
        </div>

        {/* Send Email Dialog */}
        <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Quotation via Email</DialogTitle>
              <DialogDescription>
                Send quotation to client: {(existingEnquiry?.client as any)?.clientName || existingEnquiry?.client?.client_name || 'N/A'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input 
                  value={existingEnquiry?.client?.email || ''} 
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
                    setSelectedSmtpConfig('');
                  }}
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
      </div>
    </MainLayout>
  );
}

