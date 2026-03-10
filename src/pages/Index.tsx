import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '@/hooks/useLeads';
import { useDesignTasks } from '@/hooks/useDesignTasks';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { StatsCards } from '@/components/crm/StatsCards';
import { DashboardCharts } from '@/components/crm/DashboardCharts';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { WhatsAppLogDialog } from '@/components/crm/WhatsAppLogDialog';
import { DesignAssignDialog } from '@/components/crm/DesignAssignDialog';
import { HotLeadNotifications } from '@/components/crm/HotLeadNotifications';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle, RefreshCw, AlertTriangle, Shield, Package, LogOut, Palette } from 'lucide-react';
import { Lead } from '@/types/lead';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppRole } from '@/hooks/useAuth';

interface IndexProps {
  signOut: () => Promise<void>;
  isAdmin: boolean;
  userRole: AppRole | null;
}

const Index = ({ signOut, isAdmin, userRole }: IndexProps) => {
  const navigate = useNavigate();
  const { leads, loading, syncError, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats, refetchLeads } = useLeads();
  const { tasks: designTasks, artists: designArtists, fetchTasks: refetchDesignTasks } = useDesignTasks();
  const { notifications, unreadCount, markAsRead, markAllRead } = useCrmNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [whatsappLogOpen, setWhatsappLogOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [designAssignLead, setDesignAssignLead] = useState<Lead | null>(null);
  const [designAssignOpen, setDesignAssignOpen] = useState(false);

  // Set of lead IDs that have designs assigned
  const designLeadIds = useMemo(() => new Set(designTasks.filter(t => t.lead_id).map(t => t.lead_id!)), [designTasks]);

  const handleLeadClick = (lead: Lead) => {
    setDetailLead(lead);
    setDetailOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (editLead) {
      return await updateLead(editLead.id, data);
    } else {
      return await addLead(data);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditLead(null);
  };

  const handleTagClick = (tag: string) => {
    setTagFilter(prev => prev === tag ? null : tag);
  };

  const handleAssignDesign = (lead: Lead) => {
    setDesignAssignLead(lead);
    setDesignAssignOpen(true);
  };

  const handleDesignAssigned = async (leadId: string) => {
    // Add "design_assigned" tag to lead
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const newTags = [...lead.tags];
      if (!newTags.includes('design_assigned' as any)) {
        newTags.push('design_assigned' as any);
      }
      await updateLead(leadId, { tags: newTags as any });
      // Optionally move to "Interested" if still "New Lead" or "Contacted"
      if (['New Lead', 'Contacted'].includes(lead.status)) {
        await updateLeadStatus(leadId, 'Interested');
      }
    }
    refetchDesignTasks();
  };

  const handleViewDesign = (leadId: string) => {
    navigate(`/designs?leadId=${leadId}`);
  };

  const filteredLeads = tagFilter ? leads.filter(l => l.tags.includes(tagFilter as any)) : leads;

  return (
    <div className="min-h-screen bg-background">
      {/* Sync Error Banner */}
      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-destructive/10 border-b border-destructive/30 px-6 py-2 flex items-center justify-center gap-3"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Failed to sync with server</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={refetchLeads}>
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center"
            >
              <span className="text-primary-foreground font-bold text-sm">F19</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-foreground">F19 Tattoo</h1>
              <p className="text-[11px] text-muted-foreground">Lead Management CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4 text-amber-500" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/designs')}>
              <Palette className="h-4 w-4 text-purple-500" />
              Designs
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/inventory')}>
              <Package className="h-4 w-4 text-warning" />
              Inventory
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/chat')}>
              <MessageCircle className="h-4 w-4 text-success" />
              Chat
            </Button>
            <Button onClick={() => { setEditLead(null); setFormOpen(true); }} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <StatsCards stats={stats} />
        <DashboardCharts leads={leads} />

        {tagFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtering by tag:</span>
            <button
              onClick={() => setTagFilter(null)}
              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {tagFilter} ✕
            </button>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline</h2>
          <PipelineBoard
            leads={filteredLeads}
            getLeadsByStatus={getLeadsByStatus}
            onLeadClick={handleLeadClick}
            onStatusChange={updateLeadStatus}
            onEdit={handleEdit}
            onTagClick={handleTagClick}
            onAssignDesign={handleAssignDesign}
            onViewDesign={handleViewDesign}
            designLeadIds={designLeadIds}
          />
        </div>
      </main>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        editLead={editLead}
      />
      <LeadDetailDialog
        lead={detailLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={updateLeadStatus}
        onEdit={handleEdit}
        onDelete={deleteLead}
        onAssignDesign={handleAssignDesign}
      />
      <WhatsAppLogDialog open={whatsappLogOpen} onOpenChange={setWhatsappLogOpen} />
      <DesignAssignDialog
        lead={designAssignLead}
        open={designAssignOpen}
        onOpenChange={setDesignAssignOpen}
        onDesignAssigned={handleDesignAssigned}
        existingArtists={designArtists}
      />
    </div>
  );
};

export default Index;
