import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const isAdminOrDirector = ['superadmin', 'director'].includes(req.user.role);
    const isSalesperson = req.user.role === 'salesman';

    // Role-based filtering
    let enquiryFilter = { ...dateFilter };
    if (!isAdminOrDirector && !isSalesperson) {
      enquiryFilter.currentAssignedPerson = req.user.id;
    } else if (isSalesperson) {
      enquiryFilter.OR = [
        { enquiryBy: req.user.id },
        { currentAssignedPerson: req.user.id }
      ];
    }

    const [
      totalEnquiries,
      totalClients,
      totalQuotations,
      totalInvoices,
      totalUsers,
      enquiriesByStatus,
      recentEnquiries,
      pendingTasks,
      allEnquiries
    ] = await Promise.all([
      // Total enquiries
      prisma.enquiry.count({ where: enquiryFilter }),
      
      // Total clients
      prisma.client.count({ where: dateFilter }),
      
      // Total quotations
      prisma.quotation.count({ where: dateFilter }),
      
      // Total invoices
      prisma.invoice.count({ where: dateFilter }),
      
      // Total users
      isAdminOrDirector ? prisma.user.count() : Promise.resolve(0),
      
      // Enquiries by status
      prisma.enquiry.groupBy({
        by: ['status'],
        where: enquiryFilter,
        _count: true
      }),
      
      // Recent enquiries
      prisma.enquiry.findMany({
        where: enquiryFilter,
        take: 10,
        include: {
          client: {
            select: {
              id: true,
              clientName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Pending tasks (for current user)
      prisma.enquiry.findMany({
        where: {
          ...enquiryFilter,
          currentAssignedPerson: req.user.id,
          status: {
            not: 'Dispatched'
          }
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true
            }
          }
        },
        orderBy: { workAssignedDate: 'asc' }
      }),
      
      // All enquiries for calculations
      prisma.enquiry.findMany({
        where: enquiryFilter,
        select: {
          enquiryAmount: true,
          orderNumber: true,
          status: true,
          expectedDispatchDate: true,
          workAssignedDate: true,
          enquiryBy: true,
          currentAssignedPerson: true
        }
      })
    ]);

    // Calculate metrics
    const totalValue = allEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0);
    const myEnquiries = isAdminOrDirector 
      ? allEnquiries 
      : allEnquiries.filter(e => 
          e.enquiryBy === req.user.id || e.currentAssignedPerson === req.user.id
        );
    const myTotalValue = myEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0);
    const confirmedOrders = allEnquiries.filter(e => e.orderNumber !== null).length;
    const conversionRate = allEnquiries.length > 0 
      ? (confirmedOrders / allEnquiries.length * 100).toFixed(1) 
      : '0';
    const avgOrderValue = allEnquiries.length > 0 
      ? totalValue / allEnquiries.length 
      : 0;
    const pendingEnquiries = allEnquiries.filter(e => e.status !== 'Dispatched').length;
    
    // Dispatched this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const dispatchedThisMonth = allEnquiries.filter(e => 
      e.status === 'Dispatched' && new Date(e.workAssignedDate) >= startOfMonth
    ).length;

    // Salesperson-specific: enquiries needing attention
    const needsAttention = isSalesperson 
      ? allEnquiries.filter(e => 
          (e.status === 'BOQ' || e.status === 'Enquiry') && 
          e.enquiryBy === req.user.id
        )
      : [];

    // Recent activity (sorted by work_assigned_date)
    const recentActivity = isAdminOrDirector
      ? await prisma.enquiry.findMany({
          where: enquiryFilter,
          take: 5,
          include: {
            client: {
              select: {
                id: true,
                clientName: true
              }
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { workAssignedDate: 'desc' }
        })
      : [];

    // Alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ordersDueToday = allEnquiries.filter(e => 
      e.expectedDispatchDate && 
      e.status === 'ReadyForDispatch' &&
      new Date(e.expectedDispatchDate) >= today &&
      new Date(e.expectedDispatchDate) < tomorrow
    ).length;

    const inProduction = allEnquiries.filter(e => 
      ['InProduction', 'ProductionComplete', 'Hotdip'].includes(e.status)
    ).length;

    const readyForDispatch = allEnquiries.filter(e => 
      e.status === 'ReadyForDispatch'
    ).length;

    // Calculate total revenue
    const revenueData = await prisma.invoice.aggregate({
      where: {
        ...dateFilter,
        status: { in: ['sent', 'accepted'] }
      },
      _sum: {
        grandTotal: true
      }
    });

    res.json({
      success: true,
      data: {
        // Basic counts - always return both for frontend flexibility
        totalEnquiries: totalEnquiries, // All enquiries (for admin/director) or filtered (for others)
        myEnquiriesCount: myEnquiries.length, // User's enquiries count
        totalClients,
        totalQuotations,
        totalInvoices,
        totalUsers,
        totalRevenue: revenueData._sum.grandTotal || 0,
        
        // Values - always return both
        totalValue: isAdminOrDirector ? totalValue : myTotalValue, // All value or user's value
        myTotalValue, // User's specific value
        avgOrderValue,
        
        // Metrics
        confirmedOrders,
        conversionRate: parseFloat(conversionRate),
        pendingEnquiries,
        dispatchedThisMonth,
        needsAttention: needsAttention.length,
        
        // Status distribution
        enquiriesByStatus: enquiriesByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        
        // Lists
        recentEnquiries,
        recentActivity,
        pendingTasks: pendingTasks.length,
        
        // Alerts
        alerts: {
          ordersDueToday,
          inProduction,
          readyForDispatch
        },
        
        // Workflow stages
        workflowStages: {
          new: allEnquiries.filter(e => 
            ['Enquiry', 'Design', 'BOQ'].includes(e.status)
          ).length,
          production: allEnquiries.filter(e => 
            ['ReadyForProduction', 'PurchaseWaiting', 'InProduction'].includes(e.status)
          ).length,
          finishing: allEnquiries.filter(e => 
            ['ProductionComplete', 'Hotdip'].includes(e.status)
          ).length,
          ready: allEnquiries.filter(e => 
            ['ReadyForDispatch', 'Dispatched'].includes(e.status)
          ).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get kanban board data
router.get('/kanban', authenticate, async (req, res, next) => {
  try {
    // Role-based filtering
    let where = {};
    if (!['superadmin', 'director', 'salesman'].includes(req.user.role)) {
      where.currentAssignedPerson = req.user.id;
    } else if (req.user.role === 'salesman') {
      where.OR = [
        { enquiryBy: req.user.id },
        { currentAssignedPerson: req.user.id }
      ];
    }

    const enquiries = await prisma.enquiry.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true
          }
        },
        enquiryByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by status
    const grouped = enquiries.reduce((acc, enquiry) => {
      if (!acc[enquiry.status]) {
        acc[enquiry.status] = [];
      }
      acc[enquiry.status].push(enquiry);
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
});

// Get comprehensive analytics (for directors/admins)
router.get('/analytics', authenticate, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query; // week, month, year
    const isAdminOrDirector = ['superadmin', 'director'].includes(req.user.role);
    
    if (!isAdminOrDirector) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Director/Admin access required.'
      });
    }

    const now = new Date();
    let startDate, endDate;
    
    switch(period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    endDate = now;

    // Get all users with their activity
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get user activity from status history (work done)
    const userActivity = await prisma.enquiryStatusHistory.findMany({
      where: {
        statusChangedDateTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        assignedPersonUser: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        },
        enquiry: {
          select: {
            id: true,
            enquiryNum: true,
            enquiryAmount: true,
            status: true
          }
        }
      }
    });

    // Get enquiries created/worked by each user in period
    const enquiriesInPeriod = await prisma.enquiry.findMany({
      where: {
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { workAssignedDate: { gte: startDate, lte: endDate } }
        ]
      },
      include: {
        enquiryByUser: {
          select: { id: true, name: true, role: true }
        },
        assignedUser: {
          select: { id: true, name: true, role: true }
        },
        client: {
          select: { id: true, clientName: true }
        }
      }
    });

    // Calculate team member statistics
    const memberStats = allUsers.map(user => {
      // Work done (status changes by this user)
      const workDone = userActivity.filter(a => a.assignedPerson === user.id);
      
      // Enquiries created by this user
      const enquiriesCreated = enquiriesInPeriod.filter(e => e.enquiryBy === user.id);
      
      // Enquiries assigned to this user
      const enquiriesAssigned = enquiriesInPeriod.filter(e => e.currentAssignedPerson === user.id);
      
      // Active time (last activity)
      const lastActivity = workDone.length > 0 
        ? workDone.sort((a, b) => new Date(b.statusChangedDateTime) - new Date(a.statusChangedDateTime))[0].statusChangedDateTime
        : user.updatedAt;
      
      const isActive = lastActivity && new Date(lastActivity) > new Date(now.getTime() - 24 * 60 * 60 * 1000); // Active in last 24 hours
      
      // Calculate work value
      const workValue = workDone.reduce((sum, w) => {
        return sum + (w.enquiry?.enquiryAmount || 0);
      }, 0);

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive,
        lastActivity,
        workDoneCount: workDone.length,
        workValue,
        enquiriesCreatedCount: enquiriesCreated.length,
        enquiriesAssignedCount: enquiriesAssigned.length,
        enquiriesCreatedValue: enquiriesCreated.reduce((sum, e) => sum + e.enquiryAmount, 0),
        enquiriesAssignedValue: enquiriesAssigned.reduce((sum, e) => sum + e.enquiryAmount, 0)
      };
    });

    // Get active members (active in last 24 hours)
    const activeMembers = memberStats.filter(m => m.isActive);

    // Weekly/Monthly/Yearly breakdown
    const periodBreakdown = {
      week: { enquiries: 0, workDone: 0, value: 0 },
      month: { enquiries: 0, workDone: 0, value: 0 },
      year: { enquiries: 0, workDone: 0, value: 0 }
    };

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Weekly stats
    const weeklyEnquiries = enquiriesInPeriod.filter(e => new Date(e.createdAt) >= weekStart);
    const weeklyWork = userActivity.filter(a => new Date(a.statusChangedDateTime) >= weekStart);
    periodBreakdown.week = {
      enquiries: weeklyEnquiries.length,
      workDone: weeklyWork.length,
      value: weeklyEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0)
    };

    // Monthly stats
    const monthlyEnquiries = enquiriesInPeriod.filter(e => new Date(e.createdAt) >= monthStart);
    const monthlyWork = userActivity.filter(a => new Date(a.statusChangedDateTime) >= monthStart);
    periodBreakdown.month = {
      enquiries: monthlyEnquiries.length,
      workDone: monthlyWork.length,
      value: monthlyEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0)
    };

    // Yearly stats
    const yearlyEnquiries = enquiriesInPeriod.filter(e => new Date(e.createdAt) >= yearStart);
    const yearlyWork = userActivity.filter(a => new Date(a.statusChangedDateTime) >= yearStart);
    periodBreakdown.year = {
      enquiries: yearlyEnquiries.length,
      workDone: yearlyWork.length,
      value: yearlyEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0)
    };

    // Activity timeline (last 30 days)
    const activityTimeline = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayActivity = userActivity.filter(a => {
        const activityDate = new Date(a.statusChangedDateTime);
        return activityDate >= date && activityDate < nextDate;
      });

      const dayEnquiries = enquiriesInPeriod.filter(e => {
        const enquiryDate = new Date(e.createdAt);
        return enquiryDate >= date && enquiryDate < nextDate;
      });

      activityTimeline.push({
        date: date.toISOString().split('T')[0],
        workDone: dayActivity.length,
        enquiriesCreated: dayEnquiries.length,
        value: dayEnquiries.reduce((sum, e) => sum + e.enquiryAmount, 0)
      });
    }

    // Top performers
    const topPerformers = memberStats
      .sort((a, b) => b.workDoneCount - a.workDoneCount)
      .slice(0, 10);

    // Role-based statistics
    const roleStats = memberStats.reduce((acc, member) => {
      if (!acc[member.role]) {
        acc[member.role] = {
          count: 0,
          activeCount: 0,
          totalWorkDone: 0,
          totalValue: 0,
          totalEnquiries: 0
        };
      }
      acc[member.role].count++;
      if (member.isActive) acc[member.role].activeCount++;
      acc[member.role].totalWorkDone += member.workDoneCount;
      acc[member.role].totalValue += member.workValue;
      acc[member.role].totalEnquiries += member.enquiriesCreatedCount;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        period,
        periodBreakdown,
        activeMembersCount: activeMembers.length,
        totalMembers: allUsers.length,
        memberStats,
        activeMembers: activeMembers.slice(0, 20), // Top 20 active
        topPerformers,
        roleStats,
        activityTimeline,
        summary: {
          totalWorkDone: userActivity.length,
          totalEnquiries: enquiriesInPeriod.length,
          totalValue: enquiriesInPeriod.reduce((sum, e) => sum + e.enquiryAmount, 0),
          averageWorkPerMember: memberStats.length > 0 
            ? (userActivity.length / memberStats.length).toFixed(1) 
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
