import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLeads, AdminFilters } from '@/hooks/useAdminLeads';
import { RevenueCards } from '@/components/admin/RevenueCards';
import { RevenueFilters } from '@/components/admin/RevenueFilters';
import { RevenueCharts } from '@/components/admin/RevenueCharts';
import { CompletedTable } from '@/components/admin/CompletedTable';
import { SystemLogsPanel } from '@/components/admin/SystemLogsPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Settings, Send, Bot, Calculator } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)' }}>
      {/* Header */}
      <header className="border-b border-amber-500/10 px-6 py-3" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-amber-400 gap-1.5"
              onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              CRM
            </Button>
            <div className="h-5 w-px bg-amber-500/20" />
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
                <span className="text-amber-400 font-bold text-xs">F19</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-amber-50">F19 Revenue Dashboard</h1>
                <p className="text-[10px] text-zinc-500">Owner Control Panel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/price-calculator')} className="text-zinc-400 hover:text-amber-400 gap-1.5 text-xs">
              <Calculator className="h-3.5 w-3.5" /> Price Calculator
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bot-templates')} className="text-zinc-400 hover:text-amber-400 gap-1.5 text-xs">
              <Bot className="h-3.5 w-3.5" /> AI Templates
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bulk-messaging')} className="text-zinc-400 hover:text-amber-400 gap-1.5 text-xs">
              <Send className="h-3.5 w-3.5" /> Bulk Messaging
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/settings/whatsapp')} className="text-zinc-400 hover:text-amber-400 gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <div className="h-4 w-px bg-zinc-800 mx-1" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-red-400 gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
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
            <CompletedTable leads={completed} />
            <SystemLogsPanel />
          </>
        )}
      </main>
    </div>
  );
}
