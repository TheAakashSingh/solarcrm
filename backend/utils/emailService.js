import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { generateQuotationBOQPDF } from './pdfGenerator.js';

const prisma = new PrismaClient();

// Get default SMTP configuration
export async function getDefaultSmtpConfig() {
  const config = await prisma.smtpConfig.findFirst({
    where: {
      isDefault: true,
      isActive: true
    }
  });
  
  if (!config) {
    throw new Error('No default SMTP configuration found. Please configure SMTP settings.');
  }
  
  return config;
}

// Get SMTP config by ID
export async function getSmtpConfigById(id) {
  const config = await prisma.smtpConfig.findUnique({
    where: { id }
  });
  
  if (!config || !config.isActive) {
    throw new Error('SMTP configuration not found or inactive');
  }
  
  return config;
}

// Create transporter from SMTP config
function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.password
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
}

// Generate quotation email template
export function generateQuotationEmailTemplate(data) {
  const {
    quotationNumber,
    clientName,
    clientEmail,
    contactPerson,
    date,
    validUntil,
    grandTotal,
    items,
    subtotal,
    discount,
    discountAmount,
    taxRate,
    taxAmount,
    notes,
    terms,
    companyName = 'SolarSync Solutions'
  } = data;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotationNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Quotation #${quotationNumber}</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="margin-bottom: 30px;">
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Valid Until:</strong> ${validUntil || 'N/A'}</p>
    </div>
    
    <div style="margin-bottom: 30px;">
      <h2 style="color: #f97316; margin-bottom: 10px;">Dear ${contactPerson || clientName},</h2>
      <p>Thank you for your interest in our services. Please find the quotation details below:</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Unit</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Rate (₹)</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="margin-top: 20px; margin-left: auto; width: 300px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
          <td style="padding: 8px; text-align: right;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td style="padding: 8px; text-align: right;">Discount (${discount}%):</td>
          <td style="padding: 8px; text-align: right;">-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px; text-align: right;">Tax (${taxRate}%):</td>
          <td style="padding: 8px; text-align: right;">₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background: #f9fafb; border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px; text-align: right;"><strong>Grand Total:</strong></td>
          <td style="padding: 12px; text-align: right; font-size: 18px; color: #f97316;"><strong>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
        </tr>
      </table>
    </div>
    
    ${notes ? `
    <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #f97316;">Notes:</h3>
      <p style="white-space: pre-wrap;">${notes}</p>
    </div>
    ` : ''}
    
    ${terms ? `
    <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #f97316;">Terms & Conditions:</h3>
      <p style="white-space: pre-wrap;">${terms}</p>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; padding: 20px; background: #fef3e7; border-left: 4px solid #f97316; border-radius: 4px;">
      <p style="margin: 0;"><strong>Thank you for your business!</strong></p>
      <p style="margin: 10px 0 0 0;">Please feel free to contact us if you have any questions.</p>
    </div>
  </div>
  
  <div style="margin-top: 20px; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0;">This is an automated email. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;
}

// Send quotation email
export async function sendQuotationEmail(quotationId, smtpConfigId = null) {
  try {
    // Get quotation with all relations
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        client: true,
        lineItems: true,
        boqItems: {
          orderBy: { srNo: 'asc' }
        },
        hardwareItems: {
          orderBy: { srNo: 'asc' }
        },
        enquiry: {
          select: {
            enquiryNum: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (!quotation.client.email) {
      throw new Error('Client email not found');
    }

    // Get SMTP configuration
    const smtpConfig = smtpConfigId 
      ? await getSmtpConfigById(smtpConfigId)
      : await getDefaultSmtpConfig();

    // Create transporter
    const transporter = createTransporter(smtpConfig);

    // Check if this is BOQ format quotation
    const isBOQFormat = quotation.boqItems && quotation.boqItems.length > 0;
    
    let emailHtml;
    let emailSubject;
    
    if (isBOQFormat) {
      // BOQ Format Email - Format values properly
      const formatNumber = (val) => {
        if (val === null || val === undefined || val === '') return '0';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? '0' : num.toFixed(2);
      };
      
      const formatDecimal = (val) => {
        if (val === null || val === undefined || val === '') return '0.0';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? '0.0' : num.toFixed(1);
      };
      
      const totalWeight = formatDecimal(quotation.totalWeight || 0);
      const totalWeightAfterHotDip = formatDecimal(quotation.totalWeightAfterHotDip || 0);
      const totalBoqAmount = formatNumber(quotation.totalBoqAmount || 0);
      const totalHardwareCost = formatNumber(quotation.totalHardwareCost || 0);
      const grandTotal = formatNumber(quotation.grandTotal || 0);
      
      emailSubject = `Quotation ${quotation.orderNo || quotation.number} - ${quotation.client.clientName}`;
      emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotation.orderNo || quotation.number}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Sunshell Connect pvt ltd</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Quotation ${quotation.orderNo || quotation.number}</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="margin-bottom: 30px;">
      <p><strong>CLIENT NAME:</strong> ${quotation.client.clientName}</p>
      <p><strong>ORDER NO:</strong> ${quotation.orderNo || 'N/A'}</p>
      <p><strong>NOS. OF MODULE:</strong> ${quotation.nosOfModule || 'N/A'}</p>
      <p><strong>DATE:</strong> ${quotation.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>PROJECT CAPACITY:</strong> ${quotation.projectCapacity || 'N/A'} KW</p>
      <p><strong>NO OF TABLE:</strong> ${quotation.noOfTable || 'N/A'}</p>
    </div>
    
    <div style="margin-bottom: 30px;">
      <h2 style="color: #f97316; margin-bottom: 15px;">BOQ Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Weight:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${totalWeight} kg</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Weight After Hot Dip:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${totalWeightAfterHotDip} kg</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total BOQ Amount:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(totalBoqAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Hardware Cost:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(totalHardwareCost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 12px; border-bottom: 2px solid #e5e7eb;"><strong>GRAND TOTAL:</strong></td>
          <td style="padding: 12px; border-bottom: 2px solid #e5e7eb; font-size: 18px; color: #f97316;"><strong>₹${parseFloat(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        </tr>
      </table>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #fef3e7; border-left: 4px solid #f97316; border-radius: 4px;">
      <p style="margin: 0;"><strong>Please find the detailed quotation attached as PDF.</strong></p>
      <p style="margin: 10px 0 0 0;">The PDF contains complete BOQ details, hardware items, and pricing breakdown.</p>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #fef3e7; border-left: 4px solid #f97316; border-radius: 4px;">
      <p style="margin: 0;"><strong>Thank you for your business!</strong></p>
      <p style="margin: 10px 0 0 0;">Please feel free to contact us if you have any questions.</p>
    </div>
  </div>
  
  <div style="margin-top: 20px; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0;">This is an automated email. Please do not reply to this email.</p>
  </div>
</body>
</html>
      `;
    } else {
      // Legacy format
      emailSubject = `Quotation #${quotation.number} - ${quotation.client.clientName}`;
      emailHtml = generateQuotationEmailTemplate({
        quotationNumber: quotation.number,
        clientName: quotation.client.clientName,
        clientEmail: quotation.client.email,
        contactPerson: quotation.client.contactPerson,
        date: quotation.date.toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        validUntil: quotation.validUntil 
          ? quotation.validUntil.toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : null,
        grandTotal: quotation.grandTotal,
        items: quotation.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount
        })),
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        discountAmount: quotation.discountAmount,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        notes: quotation.notes,
        terms: quotation.terms
      });
    }

    // Generate PDF attachment for BOQ format
    const attachments = [];
    if (isBOQFormat) {
      try {
        const pdfBuffer = await generateQuotationBOQPDF(quotation);
        attachments.push({
          filename: `Quotation-${quotation.orderNo || quotation.number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      } catch (pdfError) {
        console.error('Error generating PDF for email attachment:', pdfError);
        // Continue sending email even if PDF generation fails
      }
    }

    // Send email
    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: quotation.client.email,
      cc: quotation.creator.email, // CC to creator
      subject: emailSubject,
      html: emailHtml,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);

    // Update quotation status to 'sent'
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'sent' }
    });

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    console.error('Error sending quotation email:', error);
    throw error;
  }
}

// Test SMTP configuration
export async function testSmtpConfig(configId) {
  try {
    const config = await getSmtpConfigById(configId);
    const transporter = createTransporter(config);

    // Send test email to the configured email
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail, // Send test email to self
      subject: 'SMTP Configuration Test',
      html: `
        <h2>SMTP Configuration Test</h2>
        <p>This is a test email to verify your SMTP configuration is working correctly.</p>
        <p><strong>Configuration:</strong> ${config.name}</p>
        <p><strong>Host:</strong> ${config.host}</p>
        <p><strong>Port:</strong> ${config.port}</p>
        <p>If you received this email, your SMTP configuration is working!</p>
      `
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error testing SMTP config:', error);
    throw error;
  }
}

