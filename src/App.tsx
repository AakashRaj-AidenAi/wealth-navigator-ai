import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Portfolios from "./pages/Portfolios";
import Goals from "./pages/Goals";
import CIODesk from "./pages/CIODesk";
import Orders from "./pages/Orders";
import Compliance from "./pages/Compliance";
import Reports from "./pages/Reports";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Copilot from "./pages/Copilot";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import Communications from "./pages/Communications";
import CorporateActions from "./pages/CorporateActions";
import Campaigns from "./pages/Campaigns";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
    <Route path="/clients/:id" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
    <Route path="/portfolios" element={<ProtectedRoute><Portfolios /></ProtectedRoute>} />
    <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
    <Route path="/cio" element={<ProtectedRoute><CIODesk /></ProtectedRoute>} />
    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
    <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/copilot" element={<ProtectedRoute><Copilot /></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
    <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
    <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
    <Route path="/corporate-actions" element={<ProtectedRoute><CorporateActions /></ProtectedRoute>} />
    <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="wealthos-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
