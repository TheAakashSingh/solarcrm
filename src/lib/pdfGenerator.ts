import jsPDF from 'jspdf';

export interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    contactPerson: string;
    address: string;
    email: string;
    contactNo: string;
  };
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
}

export async function generateQuotationPDF(data: QuotationData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const primaryColor = [32, 95, 44];
  const textColor = [17, 24, 39];
  const lightGray = [156, 163, 175];
  const borderColor = [229, 231, 235];

  const addText = (text: string, x: number, y: number, options: {
    size?: number;
    bold?: boolean;
    color?: number[];
    align?: 'left' | 'center' | 'right';
  } = {}) => {
    const { size = 10, bold = false, color = textColor, align = 'left' } = options;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const textX = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - x : x;
    doc.text(text, textX, y, { align });
  };

  // Load and add logo
  const loadLogo = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not create canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/sunshellconnect.png';
    });
  };

  // Header with logo
  const addHeader = async () => {
    try {
      const logoDataUrl = await loadLogo();
      // Add logo on the left side
      const logoWidth = 50;
      const logoHeight = 20;
      doc.addImage(logoDataUrl, 'PNG', margin, 12, logoWidth, logoHeight);
      
      // Company info on the right
      addText(data.company.name, pageWidth - margin, 20, { size: 16, bold: true, align: 'right', color: [255, 255, 255] });
      addText('Solar Structure Solutions', pageWidth - margin, 27, { size: 10, align: 'right', color: [255, 255, 255] });
      addText(data.company.address, pageWidth - margin, 34, { size: 8, align: 'right', color: [255, 255, 255] });
    } catch (error) {
      console.warn('Could not load logo, using text only:', error);
      // Fallback to text-only header
      addText(data.company.name, pageWidth / 2, 20, { size: 20, bold: true, color: [255, 255, 255], align: 'center' });
      addText('Solar Structure Solutions', pageWidth / 2, 30, { size: 12, color: [255, 255, 255], align: 'center' });
      addText(data.company.address, pageWidth / 2, 38, { size: 9, color: [255, 255, 255], align: 'center' });
    }
  };

  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add header content (logo + company info)
  await addHeader();
  
  yPos = 60;

  addText('QUOTATION', pageWidth - margin, yPos, { size: 24, bold: true, align: 'right' });
  addText(`QUO-${data.quotationNumber}`, pageWidth - margin, yPos + 8, { size: 12, align: 'right' });
  
  yPos += 25;

  const infoWidth = (pageWidth - 2 * margin) / 2;
  
  addText('From:', margin, yPos, { size: 11, bold: true });
  yPos += 6;
  addText(data.company.name, margin, yPos, { size: 10, bold: true });
  yPos += 5;
  addText(data.company.address, margin, yPos, { size: 9 });
  yPos += 4;
  addText(`Email: ${data.company.email}`, margin, yPos, { size: 9 });
  yPos += 4;
  addText(`Phone: ${data.company.phone}`, margin, yPos, { size: 9 });
  if (data.company.gstin) {
    yPos += 4;
    addText(`GSTIN: ${data.company.gstin}`, margin, yPos, { size: 9 });
  }
  
  yPos = 85;
  addText('To:', margin + infoWidth, yPos, { size: 11, bold: true });
  yPos += 6;
  addText(data.client.name, margin + infoWidth, yPos, { size: 10, bold: true });
  yPos += 5;
  addText(`Attn: ${(data.client as any).contactPerson || data.client.contact_person}`, margin + infoWidth, yPos, { size: 9 });
  yPos += 4;
  addText(data.client.address, margin + infoWidth, yPos, { size: 9 });
  yPos += 4;
  addText(`Email: ${data.client.email}`, margin + infoWidth, yPos, { size: 9 });
  yPos += 4;
  addText(`Phone: ${(data.client as any).contactNo || data.client.contact_no}`, margin + infoWidth, yPos, { size: 9 });

  yPos = 140;
  addText(`Date: ${data.date}`, margin, yPos, { size: 10 });
  addText(`Valid Until: ${data.validUntil}`, margin + infoWidth, yPos, { size: 10 });

  yPos += 15;

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const tableTop = yPos;
  const colWidths = {
    desc: (pageWidth - 2 * margin) * 0.45,
    qty: (pageWidth - 2 * margin) * 0.12,
    unit: (pageWidth - 2 * margin) * 0.12,
    rate: (pageWidth - 2 * margin) * 0.15,
    amount: (pageWidth - 2 * margin) * 0.16,
  };

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  yPos += 7;
  addText('Description', margin + 2, yPos, { size: 9, bold: true });
  addText('Qty', margin + colWidths.desc + 2, yPos, { size: 9, bold: true });
  addText('Unit', margin + colWidths.desc + colWidths.qty + 2, yPos, { size: 9, bold: true });
  addText('Rate (₹)', margin + colWidths.desc + colWidths.qty + colWidths.unit + 2, yPos, { size: 9, bold: true });
  addText('Amount (₹)', margin + colWidths.desc + colWidths.qty + colWidths.unit + colWidths.rate + 2, yPos, { size: 9, bold: true });

  yPos += 5;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 5;
  data.items.forEach((item, index) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }

    const itemHeight = Math.max(8, Math.ceil(item.description.length / 50) * 5);
    
    const descLines = doc.splitTextToSize(item.description, colWidths.desc - 4);
    doc.text(descLines, margin + 2, yPos + itemHeight / 2, { align: 'left', baseline: 'middle' });
    
    addText(item.quantity.toString(), margin + colWidths.desc + 2, yPos + itemHeight / 2, { size: 9 });
    addText(item.unit, margin + colWidths.desc + colWidths.qty + 2, yPos + itemHeight / 2, { size: 9 });
    addText(new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.rate), 
      margin + colWidths.desc + colWidths.qty + colWidths.unit + 2, yPos + itemHeight / 2, { size: 9 });
    addText(new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.amount), 
      margin + colWidths.desc + colWidths.qty + colWidths.unit + colWidths.rate + 2, yPos + itemHeight / 2, { size: 9 });

    yPos += itemHeight + 3;
    
    if (index < data.items.length - 1) {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    }
  });

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const totalsX = margin + colWidths.desc + colWidths.qty + colWidths.unit;
  const totalsWidth = pageWidth - margin - totalsX;

  addText('Subtotal:', totalsX + 5, yPos, { size: 10, align: 'right' });
  addText(`₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(data.subtotal)}`, 
    pageWidth - margin - 5, yPos, { size: 10, align: 'right' });
  yPos += 7;

  if (data.discount > 0) {
    addText(`Discount (${data.discount}%):`, totalsX + 5, yPos, { size: 10, align: 'right', color: [220, 38, 38] });
    addText(`- ₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(data.discountAmount)}`, 
      pageWidth - margin - 5, yPos, { size: 10, align: 'right', color: [220, 38, 38] });
    yPos += 7;
  }

  addText(`GST (${data.taxRate}%):`, totalsX + 5, yPos, { size: 10, align: 'right' });
  addText(`₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(data.taxAmount)}`, 
    pageWidth - margin - 5, yPos, { size: 10, align: 'right' });
  yPos += 10;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(totalsX, yPos - 5, totalsWidth, 12, 3, 3, 'F');
  addText('Grand Total:', totalsX + 5, yPos + 2, { size: 12, bold: true, align: 'right', color: [255, 255, 255] });
  addText(`₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(data.grandTotal)}`, 
    pageWidth - margin - 5, yPos + 2, { size: 12, bold: true, align: 'right', color: [255, 255, 255] });
  yPos += 20;

  if (data.notes || data.terms) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    if (data.notes) {
      addText('Notes:', margin, yPos, { size: 11, bold: true });
      yPos += 7;
      const noteLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
      noteLines.forEach((line: string) => {
        addText(line, margin, yPos, { size: 9 });
        yPos += 5;
      });
      yPos += 5;
    }

    if (data.terms) {
      addText('Terms & Conditions:', margin, yPos, { size: 11, bold: true });
      yPos += 7;
      const termLines = doc.splitTextToSize(data.terms, pageWidth - 2 * margin);
      termLines.forEach((line: string) => {
        addText(`• ${line}`, margin, yPos, { size: 9 });
        yPos += 5;
      });
    }
  }

  const footerY = pageHeight - 20;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  addText('Thank you for your business!', pageWidth / 2, footerY, { size: 10, align: 'center', color: lightGray });
  addText(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - margin - 5, pageHeight - 10, { size: 8, align: 'right', color: lightGray });

  return doc;
}

export async function downloadQuotationPDF(data: QuotationData, filename?: string): Promise<void> {
  const doc = await generateQuotationPDF(data);
  const fileName = filename || `Quotation-${data.quotationNumber}-${data.date}.pdf`;
  doc.save(fileName);
}

export async function viewQuotationPDF(data: QuotationData): Promise<void> {
  const doc = await generateQuotationPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

// BOQ Format Quotation Data Interface
export interface QuotationBOQData {
  quotationNumber?: string;
  orderNo: string;
  nosOfModule: string;
  date: string;
  projectCapacity: string;
  noOfTable: number;
  clientName: string;
  boqItems: Array<{
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
  }>;
  totalWeight: number;
  purchaseRate: number;
  weightIncreaseAfterHDG: number;
  costing: number;
  totalWeightAfterHotDip: number;
  ratePerKg: number;
  boqGrossProfit: number;
  boqProfitPercent: number;
  totalBoqAmount: number;
  hardwareItems: Array<{
    srNo: number;
    descriptions: string;
    quantity: number;
    rate: number;
    amount: number;
    purchaseRate?: number;
  }>;
  totalHardwareCost: number;
  hardwarePurchaseTotal: number;
  hardwareGrossProfit: number;
  totalStructurePlusHardware: number;
  gst: number;
  totalGrossProfit: number;
  totalProfitPercent: number;
  grandTotal: number;
}

// Generate BOQ Format Quotation PDF
export async function generateQuotationBOQPDF(data: QuotationBOQData): Promise<jsPDF> {
  const doc = new jsPDF('landscape'); // Landscape for wide table
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const primaryColor = [249, 115, 22]; // Orange color
  const textColor = [17, 24, 39];
  const lightGray = [156, 163, 175];
  const borderColor = [229, 231, 235];

  const addText = (text: string, x: number, y: number, options: {
    size?: number;
    bold?: boolean;
    color?: number[];
    align?: 'left' | 'center' | 'right';
  } = {}) => {
    const { size = 10, bold = false, color = textColor, align = 'left' } = options;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const textX = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - x : x;
    doc.text(text, textX, y, { align });
  };

  // Load and add logo
  const loadLogo = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not create canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/sunshellconnect.png';
    });
  };

  // Header
  try {
    const logoDataUrl = await loadLogo();
    doc.addImage(logoDataUrl, 'PNG', margin, 8, 40, 15);
    addText('Sunshell Connect pvt ltd', pageWidth / 2, 15, { size: 18, bold: true, align: 'center', color: primaryColor });
  } catch (error) {
    addText('Sunshell Connect pvt ltd', pageWidth / 2, 15, { size: 18, bold: true, align: 'center', color: primaryColor });
  }

  yPos = 28;

  // Client and Order Info
  addText(`CLIENT NAME : -`, margin, yPos, { size: 10, bold: true });
  addText(data.clientName, margin + 45, yPos, { size: 10 });
  addText(`ORDER NO.`, pageWidth - margin - 60, yPos, { size: 10, bold: true });
  addText(data.orderNo, pageWidth - margin, yPos, { size: 10, align: 'right' });

  yPos += 6;
  addText(`NOS. OF MODULE :-`, margin, yPos, { size: 10, bold: true });
  addText(data.nosOfModule, margin + 50, yPos, { size: 10 });
  addText(`DATE:-`, pageWidth - margin - 60, yPos, { size: 10, bold: true });
  addText(data.date, pageWidth - margin, yPos, { size: 10, align: 'right' });

  yPos += 6;
  addText(`PROJECT CAPACITY: -`, margin, yPos, { size: 10, bold: true });
  addText(data.projectCapacity, margin + 55, yPos, { size: 10 });
  addText(`NO OF TABLE:-`, pageWidth - margin - 60, yPos, { size: 10, bold: true });
  addText(data.noOfTable.toString(), pageWidth - margin, yPos, { size: 10, align: 'right' });

  yPos += 10;

  // BOQ Section Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
  addText('BOQ OF HD MOUNTING STRUCTURE 3X2=6', pageWidth / 2, yPos, { size: 12, bold: true, align: 'center', color: [255, 255, 255] });
  
  yPos += 10;

  // BOQ Table
  const colWidths = {
    sr: 12,
    desc: 50,
    type: 25,
    spec: 45,
    length: 25,
    reqQty: 20,
    totalWeight: 25,
    weightPec: 25,
    qtyTable: 20,
    weightTable: 25,
    unitWeight: 20
  };

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
  yPos += 5;
  
  let xPos = margin + 2;
  addText('SR.', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.sr;
  addText('DESCRIPTIONS', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.desc;
  addText('TYPE', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.type;
  addText('SPECIFICATION', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.spec;
  addText('LENGTH (MM)', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.length;
  addText('REQ QTY.', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.reqQty;
  addText('TOTAL WEIGHT', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.totalWeight;
  addText('WEIGHT/PEC', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.weightPec;
  addText('QTY/TABLE', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.qtyTable;
  addText('WEIGHT/TABLE', xPos, yPos, { size: 7, bold: true });
  xPos += colWidths.weightTable;
  addText('UNIT WEIGHT', xPos, yPos, { size: 7, bold: true });

  yPos += 5;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // BOQ Items
  data.boqItems.forEach((item) => {
    if (yPos > pageHeight - 40) {
      doc.addPage('landscape');
      yPos = margin;
    }

    xPos = margin + 2;
    addText(item.srNo.toString(), xPos, yPos, { size: 7 });
    xPos += colWidths.sr;
    addText(item.descriptions, xPos, yPos, { size: 7 });
    xPos += colWidths.desc;
    addText(item.type, xPos, yPos, { size: 7 });
    xPos += colWidths.type;
    addText(item.specification, xPos, yPos, { size: 7 });
    xPos += colWidths.spec;
    addText(item.lengthMm.toString(), xPos, yPos, { size: 7 });
    xPos += colWidths.length;
    addText(item.requiredQty.toString(), xPos, yPos, { size: 7 });
    xPos += colWidths.reqQty;
    addText(item.totalWeight.toFixed(2), xPos, yPos, { size: 7 });
    xPos += colWidths.totalWeight;
    addText(item.weightPerPec.toFixed(2), xPos, yPos, { size: 7 });
    xPos += colWidths.weightPec;
    addText(item.qtyPerTable.toString(), xPos, yPos, { size: 7 });
    xPos += colWidths.qtyTable;
    addText(item.weightPerTable.toFixed(2), xPos, yPos, { size: 7 });
    xPos += colWidths.weightTable;
    addText(item.unitWeight.toFixed(2), xPos, yPos, { size: 7 });

    yPos += 4;
  });

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // BOQ Summary
  const summaryX1 = margin + colWidths.sr + colWidths.desc + colWidths.type + colWidths.spec + colWidths.length;
  const summaryX2 = summaryX1 + colWidths.reqQty + colWidths.totalWeight;

  addText('TOTAL WEIGHT IN KG', summaryX1, yPos, { size: 8, bold: true });
  addText(data.totalWeight.toFixed(1), summaryX2, yPos, { size: 8, bold: true });
  addText('Purchase rate', summaryX2 + 30, yPos, { size: 8, bold: true });
  addText(data.purchaseRate.toString(), pageWidth - margin - 40, yPos, { size: 8, align: 'right' });

  yPos += 5;
  addText('WEIGHT INCREASE AFTER HDG@8%', summaryX1, yPos, { size: 8, bold: true });
  addText(data.weightIncreaseAfterHDG.toFixed(1), summaryX2, yPos, { size: 8, bold: true });
  addText('Costing', summaryX2 + 30, yPos, { size: 8, bold: true });
  addText(data.costing.toFixed(2), pageWidth - margin - 40, yPos, { size: 8, align: 'right' });

  yPos += 5;
  addText('TOTAL WEIGHT AFTER HOTDIP', summaryX1, yPos, { size: 8, bold: true });
  addText(data.totalWeightAfterHotDip.toFixed(1), summaryX2, yPos, { size: 8, bold: true });

  yPos += 5;
  addText('RATE PER KG', summaryX1, yPos, { size: 8, bold: true });
  addText(data.ratePerKg.toString(), summaryX2, yPos, { size: 8, bold: true });
  addText('Gross profit', summaryX2 + 30, yPos, { size: 8, bold: true });
  addText(data.boqGrossProfit.toFixed(2), pageWidth - margin - 40, yPos, { size: 8, align: 'right' });

  yPos += 5;
  addText('TOTAL AMOUNT', summaryX1, yPos, { size: 8, bold: true });
  addText(data.totalBoqAmount.toFixed(2), summaryX2, yPos, { size: 8, bold: true });
  addText('Profit Percent', summaryX2 + 30, yPos, { size: 8, bold: true });
  addText(data.boqProfitPercent.toFixed(1), pageWidth - margin - 40, yPos, { size: 8, align: 'right' });

  yPos += 10;

  // Hardware Section Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
  addText('HARDWARES & BOS DETAILS & PRICE', margin + 5, yPos, { size: 12, bold: true });
  addText('hardware & bos', pageWidth - margin - 40, yPos, { size: 9, align: 'right' });
  
  yPos += 10;

  // Hardware Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
  yPos += 5;

  const hwColWidths = {
    sr: 15,
    desc: 120,
    qty: 25,
    rate: 30,
    amount: 35,
    purchaseRate: 35
  };

  xPos = margin + 2;
  addText('SR.NO.', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.sr;
  addText('DESCRIPTIONS', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.desc;
  addText('QUANTITY', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.qty;
  addText('RATE', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.rate;
  addText('AMOUNT', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.amount;
  addText('Purchase rate', xPos, yPos, { size: 7, bold: true });
  xPos += hwColWidths.purchaseRate;
  addText('Total', xPos, yPos, { size: 7, bold: true });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Hardware Items
  data.hardwareItems.forEach((item) => {
    if (yPos > pageHeight - 40) {
      doc.addPage('landscape');
      yPos = margin;
    }

    xPos = margin + 2;
    addText(item.srNo.toString(), xPos, yPos, { size: 7 });
    xPos += hwColWidths.sr;
    addText(item.descriptions, xPos, yPos, { size: 7 });
    xPos += hwColWidths.desc;
    addText(item.quantity.toString(), xPos, yPos, { size: 7 });
    xPos += hwColWidths.qty;
    addText(item.rate.toFixed(2), xPos, yPos, { size: 7 });
    xPos += hwColWidths.rate;
    addText(item.amount.toFixed(2), xPos, yPos, { size: 7 });
    xPos += hwColWidths.amount;
    addText((item.purchaseRate || 0).toFixed(2), xPos, yPos, { size: 7 });
    xPos += hwColWidths.purchaseRate;
    addText(((item.purchaseRate || 0) * item.quantity).toFixed(2), xPos, yPos, { size: 7 });

    yPos += 4;
  });

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Hardware Summary
  const hwSummaryX = margin + hwColWidths.sr + hwColWidths.desc;
  const hwAmountX = hwSummaryX + hwColWidths.qty + hwColWidths.rate;
  const hwTotalX = hwAmountX + hwColWidths.amount + hwColWidths.purchaseRate;

  addText('TOTAL HARDWARE COST', hwSummaryX, yPos, { size: 8, bold: true });
  addText(data.totalHardwareCost.toFixed(2), hwAmountX, yPos, { size: 8, bold: true });
  addText('Total', hwAmountX + hwColWidths.amount, yPos, { size: 8, bold: true });
  addText(data.hardwarePurchaseTotal.toFixed(2), hwTotalX, yPos, { size: 8, bold: true, align: 'right' });

  yPos += 5;
  addText('TOTAL STRUCTURE + HARDWARE COST', hwSummaryX, yPos, { size: 8, bold: true });
  addText(data.totalStructurePlusHardware.toFixed(2), hwAmountX, yPos, { size: 8, bold: true });
  addText('Gross profit', hwAmountX + hwColWidths.amount, yPos, { size: 8, bold: true });
  addText(data.hardwareGrossProfit.toFixed(2), hwTotalX, yPos, { size: 8, bold: true, align: 'right' });

  yPos += 5;
  addText('GST @ 18%', hwSummaryX, yPos, { size: 8, bold: true });
  addText(data.gst.toFixed(2), hwAmountX, yPos, { size: 8, bold: true });
  addText('Total Gross Profit', hwAmountX + hwColWidths.amount, yPos, { size: 8, bold: true });
  addText(data.totalGrossProfit.toFixed(2), hwTotalX, yPos, { size: 8, bold: true, align: 'right' });

  yPos += 6;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(hwSummaryX, yPos - 5, pageWidth - margin - hwSummaryX, 8, 'F');
  addText('GRAND TOTAL AMOUNT', hwSummaryX + 5, yPos, { size: 10, bold: true, color: [255, 255, 255] });
  addText(`₹${data.grandTotal.toFixed(2)}`, pageWidth - margin - 5, yPos, { size: 10, bold: true, align: 'right', color: [255, 255, 255] });
  addText('Total Profit Percent', hwAmountX + hwColWidths.amount, yPos, { size: 8, bold: true, color: [255, 255, 255] });
  addText(`${data.totalProfitPercent.toFixed(1)}%`, hwTotalX, yPos, { size: 8, bold: true, align: 'right', color: [255, 255, 255] });

  return doc;
}

export async function downloadQuotationBOQPDF(data: QuotationBOQData, filename?: string): Promise<void> {
  const doc = await generateQuotationBOQPDF(data);
  const fileName = filename || `Quotation-BOQ-${data.orderNo}-${data.date}.pdf`;
  doc.save(fileName);
}

export async function viewQuotationBOQPDF(data: QuotationBOQData): Promise<void> {
  const doc = await generateQuotationBOQPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

