import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all invoices
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
          quotation: {
            select: {
              id: true,
              number: true
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
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      success: true,
      data: invoices,
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

// Get invoice by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        enquiry: {
          include: {
            client: true
          }
        },
        quotation: {
          include: {
            lineItems: true
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
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      number,
      enquiryId,
      quotationId,
      clientId,
      date,
      dueDate,
      status,
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

    if (!enquiryId || !clientId || !lineItems || lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID, client ID, and line items are required'
      });
    }

    // Generate invoice number if not provided
    const invoiceNumber = number || `INV-${Date.now().toString().slice(-6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        enquiryId,
        quotationId,
        clientId,
        createdBy: req.user.id,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'draft',
        subtotal: parseFloat(subtotal) || 0,
        discount: parseFloat(discount) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        taxRate: parseFloat(taxRate) || 18,
        taxAmount: parseFloat(taxAmount) || 0,
        grandTotal: parseFloat(grandTotal) || 0,
        notes,
        terms,
        lineItems: {
          create: lineItems.map(item => ({
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            rate: parseFloat(item.rate),
            amount: parseFloat(item.amount)
          }))
        }
      },
      include: {
        enquiry: {
          include: {
            client: true
          }
        },
        quotation: true,
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = {
        type: 'invoice_created',
        title: 'Invoice Created',
        message: `Invoice ${invoice.number} has been created`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        enquiryId: invoice.enquiryId,
        createdBy: req.user.name,
        timestamp: new Date().toISOString()
      };
      notifyUser(io, req.user.id, notification);
      io.emitToEnquiry(enquiryId, 'invoice_created', {
        invoice,
        createdBy: req.user
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }
    next(error);
  }
});

// Update invoice
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      date,
      dueDate,
      status,
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

    // If line items are provided, delete old ones and create new
    if (lineItems) {
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: req.params.id }
      });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
        ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) }),
        ...(discount !== undefined && { discount: parseFloat(discount) }),
        ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
        ...(grandTotal !== undefined && { grandTotal: parseFloat(grandTotal) }),
        ...(notes !== undefined && { notes }),
        ...(terms !== undefined && { terms }),
        ...(lineItems && {
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
        quotation: true,
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true
      }
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    next(error);
  }
});

// Delete invoice
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.invoice.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    next(error);
  }
});

export default router;
