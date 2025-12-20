# Backend Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema with all models
│   └── seed.js                 # Database seed script
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── users.js                # User management routes
│   ├── clients.js              # Client CRUD routes
│   ├── enquiries.js            # Enquiry CRUD and workflow routes
│   ├── design.js               # Design workflow routes
│   ├── production.js           # Production workflow routes
│   ├── dispatch.js             # Dispatch workflow routes
│   ├── quotations.js           # Quotation CRUD routes
│   ├── invoices.js             # Invoice CRUD routes
│   ├── communication.js        # Communication log routes
│   └── dashboard.js            # Dashboard statistics routes
├── middleware/
│   └── auth.js                 # JWT authentication & authorization
├── socket/
│   └── socket.js               # Socket.io setup and handlers
├── utils/
│   └── notifications.js        # Notification helper functions
├── server.js                   # Main Express server
├── package.json                # Dependencies and scripts
├── .gitignore                  # Git ignore rules
├── env.example                 # Environment variables template
├── README.md                   # Complete documentation
└── STRUCTURE.md                # This file
```

## Key Features Implemented

### ✅ Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Protected routes middleware

### ✅ Database Models (Prisma)
- User (with roles: superadmin, director, salesman, designer, production, purchase)
- Client
- Enquiry (with full status workflow)
- EnquiryStatusHistory
- DesignWork & DesignAttachment
- CommunicationLog
- ProductionWorkflow & ProductionTask
- DispatchWork
- Quotation & QuotationLineItem
- Invoice & InvoiceLineItem

### ✅ API Routes
All routes include:
- Proper error handling
- Input validation
- Role-based access control
- Pagination support
- Search/filter capabilities

### ✅ Real-time Features (Socket.io)
- User-specific notifications
- Role-based notifications
- Enquiry-specific rooms
- Status change notifications
- Assignment notifications
- Real-time updates for all workflow changes

### ✅ Workflow Management
- Complete enquiry lifecycle
- Design workflow
- Production workflow with tasks
- Dispatch workflow
- Status history tracking

### ✅ Business Features
- Quotation generation
- Invoice management
- Communication logging
- Dashboard statistics
- Kanban board data

## Next Steps

1. **Set up PostgreSQL database**
2. **Configure environment variables** (copy `env.example` to `.env`)
3. **Run migrations**: `npm run prisma:migrate`
4. **Seed database**: `npm run prisma:seed`
5. **Start server**: `npm run dev`

## Integration with Frontend

The backend is ready to be integrated with your React frontend. Update your frontend API calls to point to:
- Base URL: `http://localhost:5000/api`
- Socket.io: `http://localhost:5000`

All endpoints return JSON with consistent structure:
```json
{
  "success": true/false,
  "message": "Optional message",
  "data": { ... }
}
```
