import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { StatsCards } from '@/components/crm/StatsCards';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { WhatsAppLogDialog } from '@/components/crm/WhatsAppLogDialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import { Lead } from '@/types/lead';
import { motion } from 'framer-motion';

const Index = () => {
  const { leads, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats } = useLeads();
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [whatsappLogOpen, setWhatsappLogOpen] = useState(false);

  const handleLeadClick = (lead: Lead) => {
    setDetailLead(lead);
    setDetailOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editLead) {
      await updateLead(editLead.id, data);
    } else {
      await addLead(data);
    }
    setEditLead(null);
  };

  return (
    <div className="min-h-screen bg-background">
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setWhatsappLogOpen(true)}>
              <MessageCircle className="h-4 w-4 text-success" />
              Messages
            </Button>
            <Button onClick={() => { setEditLead(null); setFormOpen(true); }} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <StatsCards stats={stats} />

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline</h2>
          <PipelineBoard
            leads={leads}
            getLeadsByStatus={getLeadsByStatus}
            onLeadClick={handleLeadClick}
            onStatusChange={updateLeadStatus}
          />
        </div>
      </main>

      {/* Dialogs */}
      <LeadFormDialog
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditLead(null); }}
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
      />
      <WhatsAppLogDialog open={whatsappLogOpen} onOpenChange={setWhatsappLogOpen} />
    </div>
  );
};

export default Index;
