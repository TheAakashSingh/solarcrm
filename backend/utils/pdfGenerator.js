import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate BOQ Format Quotation PDF
 */
export function generateQuotationBOQPDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
      // Landscape orientation for wide table
      const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 15, bottom: 15, left: 15, right: 15 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 15;
      let yPos = margin;

      const primaryColor = '#f97316';
      const textColor = '#111827';
      const lightGray = '#9ca3af';
      const borderColor = '#e5e7eb';

      // Header - Company Name
      doc.fontSize(18)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('Sunshell Connect pvt ltd', pageWidth / 2, 15, { align: 'center', width: pageWidth - 2 * margin });

      yPos = 28;

      // Client and Order Info
      doc.fontSize(10)
         .fillColor(textColor)
         .font('Helvetica-Bold')
         .text('CLIENT NAME : -', margin, yPos)
         .font('Helvetica')
         .text(quotation.client.clientName || 'N/A', margin + 45, yPos);

      doc.font('Helvetica-Bold')
         .text('ORDER NO.', pageWidth - margin - 60, yPos)
         .font('Helvetica')
         .text(quotation.orderNo || 'N/A', pageWidth - margin, yPos, { align: 'right' });

      yPos += 6;
      doc.font('Helvetica-Bold')
         .text('NOS. OF MODULE :-', margin, yPos)
         .font('Helvetica')
         .text(quotation.nosOfModule || 'N/A', margin + 50, yPos);

      doc.font('Helvetica-Bold')
         .text('DATE:-', pageWidth - margin - 60, yPos)
         .font('Helvetica')
         .text(quotation.date ? new Date(quotation.date).toLocaleDateString('en-IN') : 'N/A', pageWidth - margin, yPos, { align: 'right' });

      yPos += 6;
      doc.font('Helvetica-Bold')
         .text('PROJECT CAPACITY: -', margin, yPos)
         .font('Helvetica')
         .text((quotation.projectCapacity || 'N/A') + ' KW', margin + 55, yPos);

      doc.font('Helvetica-Bold')
         .text('NO OF TABLE:-', pageWidth - margin - 60, yPos)
         .font('Helvetica')
         .text((quotation.noOfTable || 'N/A').toString(), pageWidth - margin, yPos, { align: 'right' });

      yPos += 10;

      // BOQ Section Header
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8)
         .fillColor(primaryColor)
         .fill();
      
      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('BOQ OF HD MOUNTING STRUCTURE 3X2=6', pageWidth / 2, yPos, { align: 'center', width: pageWidth - 2 * margin });

      yPos += 10;

      // BOQ Table Headers
      doc.fillColor('#f0f0f0')
         .rect(margin, yPos, pageWidth - 2 * margin, 7)
         .fill();

      yPos += 5;
      let xPos = margin + 2;
      
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

      doc.fillColor(textColor)
         .fontSize(7)
         .font('Helvetica-Bold')
         .text('SR.', xPos, yPos);
      xPos += colWidths.sr;
      doc.text('DESCRIPTIONS', xPos, yPos);
      xPos += colWidths.desc;
      doc.text('TYPE', xPos, yPos);
      xPos += colWidths.type;
      doc.text('SPECIFICATION', xPos, yPos);
      xPos += colWidths.spec;
      doc.text('LENGTH (MM)', xPos, yPos);
      xPos += colWidths.length;
      doc.text('REQ QTY.', xPos, yPos);
      xPos += colWidths.reqQty;
      doc.text('TOTAL WEIGHT', xPos, yPos);
      xPos += colWidths.totalWeight;
      doc.text('WEIGHT/PEC', xPos, yPos);
      xPos += colWidths.weightPec;
      doc.text('QTY/TABLE', xPos, yPos);
      xPos += colWidths.qtyTable;
      doc.text('WEIGHT/TABLE', xPos, yPos);
      xPos += colWidths.weightTable;
      doc.text('UNIT WEIGHT', xPos, yPos);

      yPos += 5;
      doc.strokeColor(borderColor)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 3;

      // BOQ Items
      if (quotation.boqItems && quotation.boqItems.length > 0) {
        quotation.boqItems.forEach((item) => {
          if (yPos > pageHeight - 40) {
            doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 15, bottom: 15, left: 15, right: 15 } });
            yPos = margin;
          }

          xPos = margin + 2;
          doc.fontSize(7)
             .font('Helvetica')
             .text((item.srNo || '').toString(), xPos, yPos);
          xPos += colWidths.sr;
          doc.text(item.descriptions || '', xPos, yPos);
          xPos += colWidths.desc;
          doc.text(item.type || '', xPos, yPos);
          xPos += colWidths.type;
          doc.text(item.specification || '', xPos, yPos);
          xPos += colWidths.spec;
          doc.text((item.lengthMm || 0).toString(), xPos, yPos);
          xPos += colWidths.length;
          doc.text((item.requiredQty || 0).toString(), xPos, yPos);
          xPos += colWidths.reqQty;
          doc.text((item.totalWeight || 0).toFixed(2), xPos, yPos);
          xPos += colWidths.totalWeight;
          doc.text((item.weightPerPec || 0).toFixed(2), xPos, yPos);
          xPos += colWidths.weightPec;
          doc.text((item.qtyPerTable || 0).toString(), xPos, yPos);
          xPos += colWidths.qtyTable;
          doc.text((item.weightPerTable || 0).toFixed(2), xPos, yPos);
          xPos += colWidths.weightTable;
          doc.text((item.unitWeight || 0).toFixed(2), xPos, yPos);

          yPos += 4;
        });
      }

      yPos += 3;
      doc.strokeColor(borderColor)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 5;

      // BOQ Summary - Fixed spacing to prevent overlap
      const summaryX1 = margin + colWidths.sr + colWidths.desc + colWidths.type + colWidths.spec + colWidths.length;
      const summaryX2 = summaryX1 + colWidths.reqQty + colWidths.totalWeight;
      const summaryX3 = summaryX2 + 40; // Increased spacing for right column labels
      const summaryX4 = pageWidth - margin - 40; // Right aligned values

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('TOTAL WEIGHT IN KG', summaryX1, yPos)
         .text((quotation.totalWeight || 0).toFixed(1), summaryX2, yPos)
         .text('Purchase rate', summaryX3, yPos)
         .font('Helvetica')
         .text((quotation.purchaseRate || 0).toString(), summaryX4, yPos, { align: 'right' });

      yPos += 5;
      doc.font('Helvetica-Bold')
         .text('WEIGHT INCREASE AFTER HDG@8%', summaryX1, yPos)
         .text((quotation.weightIncreaseAfterHDG || 0).toFixed(1), summaryX2, yPos)
         .text('Costing', summaryX3, yPos)
         .font('Helvetica')
         .text((quotation.costing || 0).toFixed(2), summaryX4, yPos, { align: 'right' });

      yPos += 5;
      doc.font('Helvetica-Bold')
         .text('TOTAL WEIGHT AFTER HOTDIP', summaryX1, yPos)
         .text((quotation.totalWeightAfterHotDip || 0).toFixed(1), summaryX2, yPos);

      yPos += 5;
      doc.text('RATE PER KG', summaryX1, yPos)
         .text((quotation.ratePerKg || 0).toString(), summaryX2, yPos)
         .text('Gross profit', summaryX3, yPos)
         .font('Helvetica')
         .text((quotation.boqGrossProfit || 0).toFixed(2), summaryX4, yPos, { align: 'right' });

      yPos += 5;
      doc.font('Helvetica-Bold')
         .text('TOTAL AMOUNT', summaryX1, yPos)
         .text((quotation.totalBoqAmount || 0).toFixed(2), summaryX2, yPos)
         .text('Profit Percent', summaryX3, yPos)
         .font('Helvetica')
         .text((quotation.boqProfitPercent || 0).toFixed(1), summaryX4, yPos, { align: 'right' });

      yPos += 10;

      // Hardware Section Header
      doc.fillColor('#f0f0f0')
         .rect(margin, yPos - 5, pageWidth - 2 * margin, 8)
         .fill();

      doc.fillColor(textColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('HARDWARES & BOS DETAILS & PRICE', margin + 5, yPos)
         .fontSize(9)
         .font('Helvetica')
         .text('hardware & bos', pageWidth - margin - 40, yPos, { align: 'right' });

      yPos += 10;

      // Hardware Table Headers
      doc.fillColor('#f0f0f0')
         .rect(margin, yPos, pageWidth - 2 * margin, 7)
         .fill();

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
      doc.fillColor(textColor)
         .fontSize(7)
         .font('Helvetica-Bold')
         .text('SR.NO.', xPos, yPos);
      xPos += hwColWidths.sr;
      doc.text('DESCRIPTIONS', xPos, yPos);
      xPos += hwColWidths.desc;
      doc.text('QUANTITY', xPos, yPos);
      xPos += hwColWidths.qty;
      doc.text('RATE', xPos, yPos);
      xPos += hwColWidths.rate;
      doc.text('AMOUNT', xPos, yPos);
      xPos += hwColWidths.amount;
      doc.text('Purchase rate', xPos, yPos);
      xPos += hwColWidths.purchaseRate;
      doc.text('Total', xPos, yPos);

      yPos += 5;
      doc.strokeColor(borderColor)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 3;

      // Hardware Items
      if (quotation.hardwareItems && quotation.hardwareItems.length > 0) {
        quotation.hardwareItems.forEach((item) => {
          if (yPos > pageHeight - 40) {
            doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 15, bottom: 15, left: 15, right: 15 } });
            yPos = margin;
          }

          xPos = margin + 2;
          doc.fontSize(7)
             .font('Helvetica')
             .text((item.srNo || '').toString(), xPos, yPos);
          xPos += hwColWidths.sr;
          doc.text(item.descriptions || '', xPos, yPos);
          xPos += hwColWidths.desc;
          doc.text((item.quantity || 0).toString(), xPos, yPos);
          xPos += hwColWidths.qty;
          doc.text((item.rate || 0).toFixed(2), xPos, yPos);
          xPos += hwColWidths.rate;
          doc.text((item.amount || 0).toFixed(2), xPos, yPos);
          xPos += hwColWidths.amount;
          doc.text((item.purchaseRate || 0).toFixed(2), xPos, yPos);
          xPos += hwColWidths.purchaseRate;
          doc.text(((item.purchaseRate || 0) * (item.quantity || 0)).toFixed(2), xPos, yPos);

          yPos += 4;
        });
      }

      yPos += 3;
      doc.strokeColor(borderColor)
         .moveTo(margin, yPos)
         .lineTo(pageWidth - margin, yPos)
         .stroke();

      yPos += 5;

      // Hardware Summary
      const hwSummaryX = margin + hwColWidths.sr + hwColWidths.desc;
      const hwAmountX = hwSummaryX + hwColWidths.qty + hwColWidths.rate;
      const hwTotalX = hwAmountX + hwColWidths.amount + hwColWidths.purchaseRate;

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('TOTAL HARDWARE COST', hwSummaryX, yPos)
         .text((quotation.totalHardwareCost || 0).toFixed(2), hwAmountX, yPos)
         .text('Total', hwAmountX + hwColWidths.amount, yPos)
         .font('Helvetica')
         .text((quotation.hardwarePurchaseTotal || 0).toFixed(2), hwTotalX, yPos, { align: 'right' });

      yPos += 5;
      doc.font('Helvetica-Bold')
         .text('TOTAL STRUCTURE + HARDWARE COST', hwSummaryX, yPos)
         .text((quotation.totalStructurePlusHardware || 0).toFixed(2), hwAmountX, yPos)
         .text('Gross profit', hwAmountX + hwColWidths.amount, yPos)
         .font('Helvetica')
         .text((quotation.hardwareGrossProfit || 0).toFixed(2), hwTotalX, yPos, { align: 'right' });

      yPos += 5;
      doc.font('Helvetica-Bold')
         .text('GST @ 18%', hwSummaryX, yPos)
         .text((quotation.gst || 0).toFixed(2), hwAmountX, yPos)
         .text('Total Gross Profit', hwAmountX + hwColWidths.amount, yPos)
         .font('Helvetica')
         .text((quotation.totalGrossProfit || 0).toFixed(2), hwTotalX, yPos, { align: 'right' });

      yPos += 6;
      doc.fillColor(primaryColor)
         .rect(hwSummaryX, yPos - 5, pageWidth - margin - hwSummaryX, 8)
         .fill();

      doc.fillColor('#ffffff')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('GRAND TOTAL AMOUNT', hwSummaryX + 5, yPos)
         .text(`₹${(quotation.grandTotal || 0).toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });
      
      // Move profit percent to next line to avoid overlap
      yPos += 5;
      doc.rect(hwSummaryX, yPos - 5, pageWidth - margin - hwSummaryX, 8)
         .fill();
      
      doc.fillColor('#ffffff')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Total Profit Percent', hwAmountX + hwColWidths.amount, yPos)
         .font('Helvetica')
         .text(`${(quotation.totalProfitPercent || 0).toFixed(1)}%`, hwTotalX, yPos, { align: 'right' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

