import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLeads, AdminFilters } from '@/hooks/useAdminLeads';
import { RevenueCards } from '@/components/admin/RevenueCards';
import { RevenueFilters } from '@/components/admin/RevenueFilters';
import { RevenueCharts } from '@/components/admin/RevenueCharts';
import { CompletedTable } from '@/components/admin/CompletedTable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdminFilters>({
    dateRange: 'month',
    styles: [],
    sources: [],
  });
  const { completed, booked, pending, stats, loading } = useAdminLeads(filters);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-3">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-white gap-1.5"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              CRM
            </Button>
            <div className="h-5 w-px bg-[#333]" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                <span className="text-amber-500 font-bold text-xs">F19</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold">F19 Owner Revenue Dashboard</h1>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-400 hover:text-white gap-1.5">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <RevenueFilters filters={filters} onChange={setFilters} />
            <RevenueCards stats={stats} />
            <RevenueCharts completed={completed} booked={booked} pending={pending} />
            <CompletedTable leads={completed} />
          </>
        )}
      </main>
    </div>
  );
}
