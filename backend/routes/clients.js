import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all clients
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { clientName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ]);

    res.json({
      success: true,
      data: clients,
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

// Get client by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        enquiries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            enquiryNum: true,
            status: true,
            enquiryAmount: true,
            createdAt: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
});

// Create client
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { clientName, email, contactNo, contactPerson, address } = req.body;

    if (!clientName || !contactNo || !contactPerson || !address) {
      return res.status(400).json({
        success: false,
        message: 'Client name, contact number, contact person, and address are required'
      });
    }

    const client = await prisma.client.create({
      data: {
        clientName,
        email,
        contactNo,
        contactPerson,
        address
      }
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }
    next(error);
  }
});

// Update client
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { clientName, email, contactNo, contactPerson, address } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(clientName && { clientName }),
        ...(email && { email }),
        ...(contactNo && { contactNo }),
        ...(contactPerson && { contactPerson }),
        ...(address && { address })
      }
    });

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    next(error);
  }
});

// Delete client
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    next(error);
  }
});

export default router;
