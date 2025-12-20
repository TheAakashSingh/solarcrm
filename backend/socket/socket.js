import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupSocketIO = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Join role-specific room
    socket.join(`role:${socket.userRole}`);

    // Join enquiry-specific rooms for real-time updates
    socket.on('join_enquiry', (enquiryId) => {
      socket.join(`enquiry:${enquiryId}`);
      console.log(`📋 User ${socket.userName} joined enquiry ${enquiryId}`);
    });

    socket.on('leave_enquiry', (enquiryId) => {
      socket.leave(`enquiry:${enquiryId}`);
      console.log(`📋 User ${socket.userName} left enquiry ${enquiryId}`);
    });

    // Handle typing indicators (if needed)
    socket.on('typing', (data) => {
      socket.to(`enquiry:${data.enquiryId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        enquiryId: data.enquiryId
      });
    });

    socket.on('stop_typing', (data) => {
      socket.to(`enquiry:${data.enquiryId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        enquiryId: data.enquiryId
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} (${socket.userId})`);
    });
  });

  // Helper function to emit to enquiry room
  io.emitToEnquiry = (enquiryId, event, data) => {
    io.to(`enquiry:${enquiryId}`).emit(event, data);
  };

  // Helper function to emit to user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Helper function to emit to role
  io.emitToRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, data);
  };
};
