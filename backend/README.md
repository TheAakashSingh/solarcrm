# SolarSync CRM Backend API

Complete backend API for SolarSync CRM Flow built with Node.js, Express, Prisma, PostgreSQL, and Socket.io.

## Features

- 🔐 JWT Authentication
- 📊 Complete CRUD operations for all entities
- 🔔 Real-time notifications via Socket.io
- 👥 Role-based access control
- 📈 Dashboard statistics
- 🔄 Workflow management (Enquiry → Design → Production → Dispatch)
- 📄 Quotation and Invoice management
- 💬 Communication logging

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Server port (default: 5000)
   - `FRONTEND_URL`: Frontend URL for CORS

3. **Set up database**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # (Optional) Seed database
   npm run prisma:seed
   ```

4. **Start the server**
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/role/:role` - Get users by role
- `GET /api/users/by-status/:status` - Get users who can handle a specific status
- `POST /api/users` - Create user (admin/director only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Enquiries
- `GET /api/enquiries` - Get all enquiries (with filters: status, materialType, search, etc.)
- `GET /api/enquiries/:id` - Get enquiry by ID
- `GET /api/enquiries/:id/history` - Get enquiry status history
- `POST /api/enquiries` - Create enquiry
- `PUT /api/enquiries/:id` - Update enquiry
- `PATCH /api/enquiries/:id/status` - Update enquiry status
- `PATCH /api/enquiries/:id/assign` - Assign enquiry to user
- `POST /api/enquiries/:id/confirm-order` - Confirm order and assign to production
- `DELETE /api/enquiries/:id` - Delete enquiry

### Design Workflow
- `GET /api/design/enquiry/:enquiryId` - Get design work
- `GET /api/design/enquiry/:enquiryId/attachments` - Get design attachments
- `POST /api/design/assign` - Assign to designer
- `PUT /api/design/:id` - Update design work
- `POST /api/design/attachments` - Upload attachment
- `DELETE /api/design/attachments/:id` - Delete attachment

### Production Workflow
- `GET /api/production/enquiry/:enquiryId` - Get production workflow
- `POST /api/production/assign` - Assign to production
- `POST /api/production/:id/start` - Start production
- `POST /api/production/:id/tasks` - Create production task
- `PATCH /api/production/tasks/:id` - Update production task
- `POST /api/production/:id/complete` - Complete production

### Dispatch
- `GET /api/dispatch/enquiry/:enquiryId` - Get dispatch work
- `POST /api/dispatch/assign` - Assign dispatch
- `PUT /api/dispatch/:id` - Update dispatch work

### Quotations
- `GET /api/quotations` - Get all quotations
- `GET /api/quotations/:id` - Get quotation by ID
- `GET /api/quotations/enquiry/:enquiryId` - Get quotations by enquiry
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/:id` - Update quotation
- `DELETE /api/quotations/:id` - Delete quotation

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Communication
- `GET /api/communication/enquiry/:enquiryId` - Get communication logs
- `POST /api/communication` - Create communication log
- `PUT /api/communication/:id` - Update communication log
- `DELETE /api/communication/:id` - Delete communication log

### Dashboard
- `GET /api/dashboard/stats` - Get comprehensive dashboard statistics
- `GET /api/dashboard/kanban` - Get kanban board data

### Reports
- `GET /api/reports` - Get comprehensive reports and analytics

### Tasks
- `GET /api/tasks/my-tasks` - Get user's assigned tasks grouped by status

## Socket.io Events

### Client → Server
- `join_enquiry` - Join enquiry room for real-time updates
- `leave_enquiry` - Leave enquiry room
- `typing` - Typing indicator
- `stop_typing` - Stop typing indicator

### Server → Client
- `notification` - General notification
- `status_changed` - Enquiry status changed
- `assignment_changed` - Assignment changed
- `quotation_created` - Quotation created
- `invoice_created` - Invoice created
- `communication_logged` - Communication logged

## Authentication

All protected routes require JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Role-Based Access Control

- **superadmin**: Full access to everything
- **director**: Access to all except user management of superadmin
- **salesman**: Can create and manage enquiries, quotations, invoices
- **designer**: Can manage design work assigned to them
- **production**: Can manage production workflow assigned to them
- **purchase**: Can manage purchase-related tasks

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- User
- Client
- Enquiry
- EnquiryStatusHistory
- DesignWork
- DesignAttachment
- CommunicationLog
- ProductionWorkflow
- ProductionTask
- DispatchWork
- Quotation
- QuotationLineItem
- Invoice
- InvoiceLineItem

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/solarsync_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

## Development

```bash
# Run in development mode
npm run dev

# Generate Prisma Client after schema changes
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Production

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS settings
4. Use environment variables for sensitive data
5. Set up proper database connection pooling

## License

ISC
