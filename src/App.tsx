import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import Appointments from "./pages/Appointments";
import Inventory from "./pages/Inventory";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import DesignTracker from "./pages/DesignTracker";
import BulkMessaging from "./pages/BulkMessaging";
import BotTemplates from "./pages/BotTemplates";
import ConsentForm from "./pages/ConsentForm";
import WalkInForm from "./pages/WalkInForm";
import PriceCalculator from "./pages/PriceCalculator";
import InstagramChat from "./pages/InstagramChat";

import Settings from "./pages/Settings";
import { ProtectedAdminRoute } from "./components/admin/ProtectedAdminRoute";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, role, loading, signOut, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/consent/:formId" element={<ConsentForm />} />
        <Route path="/walk-in-form" element={<WalkInForm />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index signOut={signOut} isAdmin={isAdmin} userRole={role} />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/instagram" element={<InstagramChat />} />
      <Route path="/inbox" element={<UniversalInbox />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/designs" element={<DesignTracker />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/consent/:formId" element={<ConsentForm />} />
      <Route path="/walk-in-form" element={<WalkInForm />} />
      <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
      <Route path="/admin/settings/whatsapp" element={<ProtectedAdminRoute><WhatsAppSettings /></ProtectedAdminRoute>} />
      <Route path="/admin/bulk-messaging" element={<ProtectedAdminRoute><BulkMessaging /></ProtectedAdminRoute>} />
      <Route path="/admin/bot-templates" element={<ProtectedAdminRoute><BotTemplates /></ProtectedAdminRoute>} />
      <Route path="/admin/price-calculator" element={<ProtectedAdminRoute><PriceCalculator /></ProtectedAdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
