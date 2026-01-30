import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="wealthos-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/portfolios" element={<Portfolios />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/cio" element={<CIODesk />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/copilot" element={<Copilot />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
