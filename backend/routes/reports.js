import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get comprehensive reports and analytics
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // Role-based filtering
    let enquiryFilter = { ...dateFilter };
    if (!['superadmin', 'director', 'salesman'].includes(req.user.role)) {
      enquiryFilter.currentAssignedPerson = req.user.id;
    } else if (req.user.role === 'salesman') {
      enquiryFilter.OR = [
        { enquiryBy: req.user.id },
        { currentAssignedPerson: req.user.id }
      ];
    }

    const [
      enquiries,
      clients,
      quotations,
      invoices,
      statusDistribution,
      materialTypeDistribution,
      monthlyTrend,
      clientValues,
      totalValue,
      avgOrderValue,
      activeOrders
    ] = await Promise.all([
      // All enquiries
      prisma.enquiry.findMany({
        where: enquiryFilter,
        include: {
          client: {
            select: {
              id: true,
              clientName: true
            }
          }
        }
      }),
      
      // All clients
      prisma.client.findMany({
        where: dateFilter
      }),
      
      // All quotations
      prisma.quotation.findMany({
        where: dateFilter
      }),
      
      // All invoices
      prisma.invoice.findMany({
        where: dateFilter
      }),
      
      // Status distribution
      prisma.enquiry.groupBy({
        by: ['status'],
        where: enquiryFilter,
        _count: true
      }),
      
      // Material type distribution
      prisma.enquiry.groupBy({
        by: ['materialType'],
        where: enquiryFilter,
        _count: true,
        _sum: {
          enquiryAmount: true
        }
      }),
      
      // Monthly trend (last 6 months)
      (async () => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          
          const [enquiries, value] = await Promise.all([
            prisma.enquiry.count({
              where: {
                ...enquiryFilter,
                createdAt: {
                  gte: date,
                  lte: endOfMonth
                }
              }
            }),
            prisma.enquiry.aggregate({
              where: {
                ...enquiryFilter,
                createdAt: {
                  gte: date,
                  lte: endOfMonth
                }
              },
              _sum: {
                enquiryAmount: true
              }
            })
          ]);
          
          months.push({
            month: date.toLocaleString('default', { month: 'short' }),
            enquiries,
            value: value._sum.enquiryAmount || 0
          });
        }
        return months;
      })(),
      
      // Client values
      (async () => {
        const clientData = await prisma.enquiry.groupBy({
          by: ['clientId'],
          where: enquiryFilter,
          _sum: {
            enquiryAmount: true
          },
          _count: true
        });
        
        const clients = await prisma.client.findMany({
          where: {
            id: {
              in: clientData.map(c => c.clientId)
            }
          }
        });
        
        return clientData.map(c => {
          const client = clients.find(cl => cl.id === c.clientId);
          return {
            name: (client?.clientName || client?.client_name || 'Unknown').split(' ')[0],
            value: c._sum.enquiryAmount || 0,
            count: c._count
          };
        }).sort((a, b) => b.value - a.value).slice(0, 10);
      })(),
      
      // Total value
      prisma.enquiry.aggregate({
        where: enquiryFilter,
        _sum: {
          enquiryAmount: true
        }
      }),
      
      // Average order value
      (async () => {
        const result = await prisma.enquiry.aggregate({
          where: enquiryFilter,
          _avg: {
            enquiryAmount: true
          },
          _count: true
        });
        return result._avg.enquiryAmount || 0;
      })(),
      
      // Active orders
      prisma.enquiry.count({
        where: {
          ...enquiryFilter,
          status: {
            not: 'Dispatched'
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalValue: totalValue._sum.enquiryAmount || 0,
          totalEnquiries: enquiries.length,
          avgOrderValue: avgOrderValue,
          activeOrders: activeOrders,
          totalClients: clients.length,
          totalQuotations: quotations.length,
          totalInvoices: invoices.length
        },
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: item._count
        })),
        materialTypeDistribution: materialTypeDistribution.map(item => ({
          materialType: item.materialType,
          count: item._count,
          value: item._sum.enquiryAmount || 0
        })),
        monthlyTrend,
        topClients: clientValues,
        enquiries: enquiries.slice(0, 100) // Limit for performance
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
