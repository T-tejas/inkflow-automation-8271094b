import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLeads, AdminFilters } from '@/hooks/useAdminLeads';
import { RevenueCards } from '@/components/admin/RevenueCards';
import { RevenueFilters } from '@/components/admin/RevenueFilters';
import { RevenueCharts } from '@/components/admin/RevenueCharts';
import { CompletedTable } from '@/components/admin/CompletedTable';
import { SystemLogsPanel } from '@/components/admin/SystemLogsPanel';
import { ArtistLeaderboard } from '@/components/crm/ArtistLeaderboard';
import { MonthlyReportGenerator } from '@/components/crm/MonthlyReportGenerator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Settings, Send, Bot, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdminFilters>({
    dateRange: 'month',
    styles: [],
    sources: []
  });
  const { completed, booked, pending, stats, loading, artistRevenue, completionPriceMap } = useAdminLeads(filters);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - matches CRM header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              CRM
            </Button>
            <div className="h-5 w-px bg-border" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">F19</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">F19 Revenue Dashboard</h1>
                <p className="text-[11px] text-muted-foreground">Owner Control Panel</p>
              </div>
            </motion.div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/price-calculator')} className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
              <Calculator className="h-3.5 w-3.5" /> Price Calculator
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bot-templates')} className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
              <Bot className="h-3.5 w-3.5" /> AI Templates
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bulk-messaging')} className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
              <Send className="h-3.5 w-3.5" /> Bulk Messaging
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/settings/whatsapp')} className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <RevenueFilters filters={filters} onChange={setFilters} />
            <RevenueCards stats={stats} />
            <RevenueCharts
              completed={completed}
              booked={booked}
              pending={pending}
              artistRevenue={artistRevenue}
              completionPriceMap={completionPriceMap}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ArtistLeaderboard />
              <MonthlyReportGenerator />
            </div>
            <CompletedTable leads={completed} />
            <SystemLogsPanel />
          </>
        )}
      </main>
    </div>
  );
}
