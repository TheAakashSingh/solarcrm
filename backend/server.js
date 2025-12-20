import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import clientRoutes from './routes/clients.js';
import enquiryRoutes from './routes/enquiries.js';
import designRoutes from './routes/design.js';
import productionRoutes from './routes/production.js';
import dispatchRoutes from './routes/dispatch.js';
import quotationRoutes from './routes/quotations.js';
import invoiceRoutes from './routes/invoices.js';
import communicationRoutes from './routes/communication.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import tasksRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';
import smtpRoutes from './routes/smtp.js';
import { setupSocketIO } from './socket/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available globally
app.set('io', io);
setupSocketIO(io);

// Add helper methods to io for routes
io.emitToEnquiry = (enquiryId, event, data) => {
  io.to(`enquiry:${enquiryId}`).emit(event, data);
};

io.emitToUser = (userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

io.emitToRole = (role, event, data) => {
  io.to(`role:${role}`).emit(event, data);
};

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Disable caching for API responses to prevent 304 issues
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SolarSync Backend API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/design', designRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/smtp', smtpRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
