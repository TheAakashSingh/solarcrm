import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser, createQuotationCreatedNotification } from '../utils/notifications.js';
import { sendQuotationEmail } from '../utils/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all quotations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, enquiryId, clientId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (enquiryId) where.enquiryId = enquiryId;
    if (clientId) where.clientId = clientId;
    
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { client: { clientName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          enquiry: {
            select: {
              id: true,
              enquiryNum: true,
              status: true
            }
          },
          client: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lineItems: true,
          boqItems: true,
          hardwareItems: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.quotation.count({ where })
    ]);

    res.json({
      success: true,
      data: quotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get quotations by enquiry
router.get('/enquiry/:enquiryId', authenticate, async (req, res, next) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { enquiryId: req.params.enquiryId },
      include: {
        enquiry: {
          select: {
            id: true,
            enquiryNum: true,
            status: true
          }
        },
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: quotations
    });
  } catch (error) {
    next(error);
  }
});

// Get quotation by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        enquiry: {
          include: {
            client: true
          }
        },
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true,
        boqItems: {
          orderBy: { srNo: 'asc' }
        },
        hardwareItems: {
          orderBy: { srNo: 'asc' }
        }
      }
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    next(error);
  }
});

// Create quotation
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      number,
      enquiryId,
      clientId,
      date,
      validUntil,
      status,
      // New BOQ format fields
      orderNo,
      nosOfModule,
      projectCapacity,
      noOfTable,
      boqItems,
      totalWeight,
      purchaseRate,
      weightIncreaseAfterHDG,
      costing,
      totalWeightAfterHotDip,
      ratePerKg,
      boqGrossProfit,
      boqProfitPercent,
      totalBoqAmount,
      // Hardware fields
      hardwareItems,
      totalHardwareCost,
      hardwarePurchaseTotal,
      hardwareGrossProfit,
      totalStructurePlusHardware,
      gst,
      totalGrossProfit,
      totalProfitPercent,
      // Legacy fields
      subtotal,
      discount,
      discountAmount,
      taxRate,
      taxAmount,
      grandTotal,
      notes,
      terms,
      lineItems
    } = req.body;

    if (!enquiryId || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID and client ID are required'
      });
    }

    // Validate: either BOQ format or legacy lineItems
    if (!boqItems && (!lineItems || lineItems.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Either BOQ items or line items are required'
      });
    }

    // Generate quotation number if not provided
    const quotationNumber = number || `QUO-${Date.now().toString().slice(-6)}`;

    // Get enquiry to get its order number (auto-generated at enquiry creation)
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: { orderNumber: true }
    });

    // Always use enquiry's order number if enquiry exists (order number is auto-generated at enquiry creation)
    const finalOrderNo = enquiry?.orderNumber || orderNo || null;

    const quotation = await prisma.quotation.create({
      data: {
        number: quotationNumber,
        enquiryId,
        clientId,
        createdBy: req.user.id,
        date: date ? new Date(date) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        status: status || 'draft',
        // New BOQ fields - always use enquiry's order number
        orderNo: finalOrderNo,
        nosOfModule: nosOfModule || null,
        projectCapacity: projectCapacity || null,
        noOfTable: noOfTable ? parseInt(noOfTable) : null,
        totalWeight: totalWeight ? parseFloat(totalWeight) : null,
        purchaseRate: purchaseRate ? parseFloat(purchaseRate) : null,
        weightIncreaseAfterHDG: weightIncreaseAfterHDG ? parseFloat(weightIncreaseAfterHDG) : null,
        costing: costing ? parseFloat(costing) : null,
        totalWeightAfterHotDip: totalWeightAfterHotDip ? parseFloat(totalWeightAfterHotDip) : null,
        ratePerKg: ratePerKg ? parseFloat(ratePerKg) : null,
        boqGrossProfit: boqGrossProfit ? parseFloat(boqGrossProfit) : null,
        boqProfitPercent: boqProfitPercent ? parseFloat(boqProfitPercent) : null,
        totalBoqAmount: totalBoqAmount ? parseFloat(totalBoqAmount) : null,
        // Hardware fields
        totalHardwareCost: totalHardwareCost ? parseFloat(totalHardwareCost) : null,
        hardwarePurchaseTotal: hardwarePurchaseTotal ? parseFloat(hardwarePurchaseTotal) : null,
        hardwareGrossProfit: hardwareGrossProfit ? parseFloat(hardwareGrossProfit) : null,
        totalStructurePlusHardware: totalStructurePlusHardware ? parseFloat(totalStructurePlusHardware) : null,
        gst: gst ? parseFloat(gst) : null,
        totalGrossProfit: totalGrossProfit ? parseFloat(totalGrossProfit) : null,
        totalProfitPercent: totalProfitPercent ? parseFloat(totalProfitPercent) : null,
        // Legacy fields
        subtotal: subtotal ? parseFloat(subtotal) : (totalStructurePlusHardware ? parseFloat(totalStructurePlusHardware) : 0),
        discount: parseFloat(discount) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        taxRate: taxRate ? parseFloat(taxRate) : 18,
        taxAmount: taxAmount ? parseFloat(taxAmount) : (gst ? parseFloat(gst) : 0),
        grandTotal: grandTotal ? parseFloat(grandTotal) : (totalStructurePlusHardware && gst ? parseFloat(totalStructurePlusHardware) + parseFloat(gst) : 0),
        notes,
        terms,
        // Create BOQ items if provided
        ...(boqItems && boqItems.length > 0 && {
          boqItems: {
            create: boqItems.map((item, index) => ({
              srNo: item.srNo || index + 1,
              descriptions: item.descriptions,
              type: item.type || null,
              specification: item.specification || null,
              lengthMm: item.lengthMm ? parseFloat(item.lengthMm) : null,
              requiredQty: parseFloat(item.requiredQty) || 0,
              totalWeight: item.totalWeight ? parseFloat(item.totalWeight) : null,
              weightPerPec: item.weightPerPec ? parseFloat(item.weightPerPec) : null,
              qtyPerTable: item.qtyPerTable ? parseFloat(item.qtyPerTable) : null,
              weightPerTable: item.weightPerTable ? parseFloat(item.weightPerTable) : null,
              unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
              purchaseRate: item.purchaseRate ? parseFloat(item.purchaseRate) : null
            }))
          }
        }),
        // Create Hardware items if provided
        ...(hardwareItems && hardwareItems.length > 0 && {
          hardwareItems: {
            create: hardwareItems.map((item, index) => ({
              srNo: item.srNo || index + 1,
              descriptions: item.descriptions,
              quantity: parseFloat(item.quantity) || 0,
              rate: parseFloat(item.rate) || 0,
              amount: parseFloat(item.amount) || 0,
              purchaseRate: item.purchaseRate ? parseFloat(item.purchaseRate) : null
            }))
          }
        }),
        // Legacy lineItems support
        ...(lineItems && lineItems.length > 0 && {
          lineItems: {
            create: lineItems.map(item => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unit: item.unit,
              rate: parseFloat(item.rate),
              amount: parseFloat(item.amount)
            }))
          }
        })
      },
      include: {
        enquiry: {
          include: {
            client: true
          }
        },
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true,
        boqItems: true,
        hardwareItems: true
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = createQuotationCreatedNotification(quotation, req.user);
      notifyUser(io, req.user.id, notification);
      io.emitToEnquiry(enquiryId, 'quotation_created', {
        quotation,
        createdBy: req.user
      });
    }

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Quotation number already exists'
      });
    }
    next(error);
  }
});

// Update quotation
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      date,
      validUntil,
      status,
      // New BOQ format fields
      orderNo,
      nosOfModule,
      projectCapacity,
      noOfTable,
      boqItems,
      totalWeight,
      purchaseRate,
      weightIncreaseAfterHDG,
      costing,
      totalWeightAfterHotDip,
      ratePerKg,
      boqGrossProfit,
      boqProfitPercent,
      totalBoqAmount,
      // Hardware fields
      hardwareItems,
      totalHardwareCost,
      hardwarePurchaseTotal,
      hardwareGrossProfit,
      totalStructurePlusHardware,
      gst,
      totalGrossProfit,
      totalProfitPercent,
      // Legacy fields
      subtotal,
      discount,
      discountAmount,
      taxRate,
      taxAmount,
      grandTotal,
      notes,
      terms,
      lineItems
    } = req.body;

    // If BOQ items are provided, delete old ones and create new
    if (boqItems) {
      await prisma.quotationBoqItem.deleteMany({
        where: { quotationId: req.params.id }
      });
    }

    // If Hardware items are provided, delete old ones and create new
    if (hardwareItems) {
      await prisma.quotationHardwareItem.deleteMany({
        where: { quotationId: req.params.id }
      });
    }

    // If line items are provided, delete old ones and create new
    if (lineItems) {
      await prisma.quotationLineItem.deleteMany({
        where: { quotationId: req.params.id }
      });
    }

    // Get the existing quotation to get enquiryId
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      select: { enquiryId: true }
    });

    // Get enquiry to get its order number (auto-generated at enquiry creation)
    let finalOrderNo = orderNo;
    if (existingQuotation?.enquiryId) {
      const enquiry = await prisma.enquiry.findUnique({
        where: { id: existingQuotation.enquiryId },
        select: { orderNumber: true }
      });
      // Always use enquiry's order number if enquiry exists (order number is auto-generated at enquiry creation)
      if (enquiry?.orderNumber) {
        finalOrderNo = enquiry.orderNumber;
      }
    }

    const quotation = await prisma.quotation.update({
      where: { id: req.params.id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(status && { status }),
        // New BOQ fields - always use enquiry's order number
        ...(finalOrderNo !== undefined && finalOrderNo !== null && { orderNo: finalOrderNo }),
        ...(nosOfModule !== undefined && { nosOfModule }),
        ...(projectCapacity !== undefined && { projectCapacity }),
        ...(noOfTable !== undefined && { noOfTable: parseInt(noOfTable) }),
        ...(totalWeight !== undefined && { totalWeight: parseFloat(totalWeight) }),
        ...(purchaseRate !== undefined && { purchaseRate: parseFloat(purchaseRate) }),
        ...(weightIncreaseAfterHDG !== undefined && { weightIncreaseAfterHDG: parseFloat(weightIncreaseAfterHDG) }),
        ...(costing !== undefined && { costing: parseFloat(costing) }),
        ...(totalWeightAfterHotDip !== undefined && { totalWeightAfterHotDip: parseFloat(totalWeightAfterHotDip) }),
        ...(ratePerKg !== undefined && { ratePerKg: parseFloat(ratePerKg) }),
        ...(boqGrossProfit !== undefined && { boqGrossProfit: parseFloat(boqGrossProfit) }),
        ...(boqProfitPercent !== undefined && { boqProfitPercent: parseFloat(boqProfitPercent) }),
        ...(totalBoqAmount !== undefined && { totalBoqAmount: parseFloat(totalBoqAmount) }),
        // Hardware fields
        ...(totalHardwareCost !== undefined && { totalHardwareCost: parseFloat(totalHardwareCost) }),
        ...(hardwarePurchaseTotal !== undefined && { hardwarePurchaseTotal: parseFloat(hardwarePurchaseTotal) }),
        ...(hardwareGrossProfit !== undefined && { hardwareGrossProfit: parseFloat(hardwareGrossProfit) }),
        ...(totalStructurePlusHardware !== undefined && { totalStructurePlusHardware: parseFloat(totalStructurePlusHardware) }),
        ...(gst !== undefined && { gst: parseFloat(gst) }),
        ...(totalGrossProfit !== undefined && { totalGrossProfit: parseFloat(totalGrossProfit) }),
        ...(totalProfitPercent !== undefined && { totalProfitPercent: parseFloat(totalProfitPercent) }),
        // Legacy fields
        ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) }),
        ...(discount !== undefined && { discount: parseFloat(discount) }),
        ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
        ...(grandTotal !== undefined && { grandTotal: parseFloat(grandTotal) }),
        ...(notes !== undefined && { notes }),
        ...(terms !== undefined && { terms }),
        // Create BOQ items if provided
        ...(boqItems && boqItems.length > 0 && {
          boqItems: {
            create: boqItems.map((item, index) => ({
              srNo: item.srNo || index + 1,
              descriptions: item.descriptions,
              type: item.type || null,
              specification: item.specification || null,
              lengthMm: item.lengthMm ? parseFloat(item.lengthMm) : null,
              requiredQty: parseFloat(item.requiredQty) || 0,
              totalWeight: item.totalWeight ? parseFloat(item.totalWeight) : null,
              weightPerPec: item.weightPerPec ? parseFloat(item.weightPerPec) : null,
              qtyPerTable: item.qtyPerTable ? parseFloat(item.qtyPerTable) : null,
              weightPerTable: item.weightPerTable ? parseFloat(item.weightPerTable) : null,
              unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
              purchaseRate: item.purchaseRate ? parseFloat(item.purchaseRate) : null
            }))
          }
        }),
        // Create Hardware items if provided
        ...(hardwareItems && hardwareItems.length > 0 && {
          hardwareItems: {
            create: hardwareItems.map((item, index) => ({
              srNo: item.srNo || index + 1,
              descriptions: item.descriptions,
              quantity: parseFloat(item.quantity) || 0,
              rate: parseFloat(item.rate) || 0,
              amount: parseFloat(item.amount) || 0,
              purchaseRate: item.purchaseRate ? parseFloat(item.purchaseRate) : null
            }))
          }
        }),
        // Legacy lineItems support
        ...(lineItems && lineItems.length > 0 && {
          lineItems: {
            create: lineItems.map(item => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unit: item.unit,
              rate: parseFloat(item.rate),
              amount: parseFloat(item.amount)
            }))
          }
        })
      },
      include: {
        enquiry: {
          include: {
            client: true
          }
        },
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true,
        boqItems: {
          orderBy: { srNo: 'asc' }
        },
        hardwareItems: {
          orderBy: { srNo: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      data: quotation
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }
    next(error);
  }
});

// Delete quotation
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.quotation.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }
    next(error);
  }
});

// Send quotation via email
router.post('/:id/send-email', authenticate, async (req, res, next) => {
  try {
    const { smtpConfigId } = req.body;
    
    const result = await sendQuotationEmail(req.params.id, smtpConfigId || null);

    res.json({
      success: true,
      message: 'Quotation sent successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send quotation email'
    });
  }
});

export default router;
