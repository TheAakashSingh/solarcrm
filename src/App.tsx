import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyTasks from "./pages/MyTasks";
import DesignerTasks from "./pages/DesignerTasks";
import AllEnquiries from "./pages/AllEnquiries";
import Clients from "./pages/Clients";
import EnquiryForm from "./pages/EnquiryForm";
import EnquiryDetail from "./pages/EnquiryDetail";
import EnquiryHistory from "./pages/EnquiryHistory";
import KanbanBoard from "./pages/KanbanBoard";
import InvoiceQuotation from "./pages/InvoiceQuotation";
import QuotationBOQForm from "./pages/QuotationBOQForm";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import ActivityHistory from "./pages/ActivityHistory";
import Profile from "./pages/Profile";
import SmtpManagement from "./pages/SmtpManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kanban"
        element={
          <ProtectedRoute>
            <KanbanBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <ProtectedRoute>
            <MyTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/designer-tasks"
        element={
          <ProtectedRoute>
            <DesignerTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enquiries"
        element={
          <ProtectedRoute>
            <AllEnquiries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enquiries/new"
        element={
          <ProtectedRoute>
            <EnquiryForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enquiries/:id"
        element={
          <ProtectedRoute>
            <EnquiryDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enquiries/:id/edit"
        element={
          <ProtectedRoute>
            <EnquiryForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enquiries/:id/history"
        element={
          <ProtectedRoute>
            <EnquiryHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotations"
        element={
          <ProtectedRoute>
            <Quotations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute>
            <InvoiceQuotation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotations/new"
        element={
          <ProtectedRoute>
            <QuotationBOQForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <ActivityHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/smtp"
        element={
          <ProtectedRoute>
            <SmtpManagement />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
