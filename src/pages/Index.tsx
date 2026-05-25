import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '@/hooks/useLeads';
import { useDesignTasks } from '@/hooks/useDesignTasks';

import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { StatsCards } from '@/components/crm/StatsCards';
import { SmartNotificationBell } from '@/components/crm/SmartNotificationBell';
import { DashboardCharts } from '@/components/crm/DashboardCharts';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { WhatsAppLogDialog } from '@/components/crm/WhatsAppLogDialog';
import { DesignAssignDialog } from '@/components/crm/DesignAssignDialog';
import { HotLeadNotifications } from '@/components/crm/HotLeadNotifications';
import { BulkActionBar } from '@/components/crm/BulkActionBar';
import { TattooCompletionDialog } from '@/components/crm/TattooCompletionDialog';
import { WalkInDialog } from '@/components/crm/WalkInDialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle, RefreshCw, AlertTriangle, Shield, Package, LogOut, Palette, CheckSquare, UserPlus, Search, X, Calendar, Instagram, Globe, Settings, Clock } from 'lucide-react';
import { Lead, LeadStatus, FollowupFilter, getFollowupStatus } from '@/types/lead';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppRole } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface IndexProps {
  signOut: () => Promise<void>;
  isAdmin: boolean;
  userRole: AppRole | null;
}

const Index = ({ signOut, isAdmin, userRole }: IndexProps) => {
  const navigate = useNavigate();
  const { leads, loading, syncError, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats, refetchLeads } = useLeads();
  const { tasks: designTasks, fetchTasks: refetchDesignTasks } = useDesignTasks();
  
  const { notifications, unreadCount, markAsRead, markAllRead } = useCrmNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [whatsappLogOpen, setWhatsappLogOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [designAssignLead, setDesignAssignLead] = useState<Lead | null>(null);
  const [designAssignOpen, setDesignAssignOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [completionLead, setCompletionLead] = useState<Lead | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>('all');

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

  const handleNotifLeadClick = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) handleLeadClick(lead);
  };

  const filteredLeads = tagFilter ? leads.filter(l => l.tags.includes(tagFilter as any)) : leads;

  // Apply follow-up filter
  const followupFilteredLeads = followupFilter === 'all' ? filteredLeads : filteredLeads.filter(l => {
    const status = getFollowupStatus(l.nextFollowupDate);
    return status === followupFilter;
  });

  const displayLeads = searchQuery.trim()
    ? followupFilteredLeads.filter(l =>
        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.includes(searchQuery) ||
        (l.tattooStyle && l.tattooStyle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : followupFilteredLeads;

  // Follow-up stats
  const followupStats = {
    today: leads.filter(l => getFollowupStatus(l.nextFollowupDate) === 'today').length,
    overdue: leads.filter(l => getFollowupStatus(l.nextFollowupDate) === 'overdue').length,
    upcoming: leads.filter(l => getFollowupStatus(l.nextFollowupDate) === 'upcoming').length,
  };

  const handleMarkContacted = async (leadId: string) => {
    await updateLead(leadId, { lastContactedAt: new Date().toISOString() });
    toast.success('Marked as contacted');
  };

  const handleRescheduleFollowup = async (leadId: string, date: string) => {
    await updateLead(leadId, { nextFollowupDate: date });
    toast.success('Follow-up scheduled');
  };

  const handleRescheduleFromCard = (lead: Lead) => {
    // Quick reschedule: set to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleRescheduleFollowup(lead.id, tomorrow.toISOString().split('T')[0]);
  };

  const handleToggleSelect = (leadId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  };

  const handleBulkMoveToStage = async (status: LeadStatus) => {
    for (const id of selectedIds) {
      await updateLeadStatus(id, status);
    }
    toast.success(`${selectedIds.size} leads moved to ${status}`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteLead(id);
    }
    toast.success(`${selectedIds.size} leads deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

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
            {searchOpen ? (
              <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-48 text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" />
              </Button>
            )}
            <SmartNotificationBell />
            <HotLeadNotifications
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllRead}
              onLeadClick={handleNotifLeadClick}
            />
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4 text-amber-500" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/appointments')}>
              <Calendar className="h-4 w-4 text-success" />
              Appointments
            </Button>
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/instagram')}>
              <Instagram className="h-4 w-4 text-pink-500" />
              Instagram
            </Button>
            <Button
              variant={selectMode ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
            >
              <CheckSquare className="h-4 w-4" />
              {selectMode ? 'Exit Select' : 'Select'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setWalkInOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Walk-in
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

        {/* Follow-up Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Follow-ups:</span>
          {([
            { key: 'all', label: 'All', count: leads.length, color: '' },
            { key: 'today', label: '📞 Today', count: followupStats.today, color: 'bg-warning/10 text-warning border-warning/30' },
            { key: 'overdue', label: '⚠ Overdue', count: followupStats.overdue, color: 'bg-destructive/10 text-destructive border-destructive/30' },
            { key: 'upcoming', label: '📅 Upcoming', count: followupStats.upcoming, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFollowupFilter(f.key as FollowupFilter)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                followupFilter === f.key
                  ? (f.color || 'bg-primary/10 text-primary border-primary/30')
                  : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {f.label} {f.count > 0 && <span className="ml-1 font-semibold">{f.count}</span>}
            </button>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline</h2>
          <PipelineBoard
            leads={displayLeads}
            getLeadsByStatus={getLeadsByStatus}
            onLeadClick={handleLeadClick}
            onStatusChange={updateLeadStatus}
            onEdit={handleEdit}
            onTagClick={handleTagClick}
            onAssignDesign={handleAssignDesign}
            onViewDesign={handleViewDesign}
            designLeadIds={designLeadIds}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectMode={selectMode}
            onMarkContacted={handleMarkContacted}
            onRescheduleFollowup={handleRescheduleFromCard}
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
        lead={detailLead ? (leads.find(l => l.id === detailLead.id) ?? detailLead) : null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={updateLeadStatus}
        onEdit={handleEdit}
        onDelete={deleteLead}
        onAssignDesign={handleAssignDesign}
        onMarkCompleted={(lead) => { setCompletionLead(lead); setCompletionOpen(true); }}
        onMarkContacted={handleMarkContacted}
        onRescheduleFollowup={handleRescheduleFollowup}
      />
      <WhatsAppLogDialog open={whatsappLogOpen} onOpenChange={setWhatsappLogOpen} />
      <DesignAssignDialog
        lead={designAssignLead}
        open={designAssignOpen}
        onOpenChange={setDesignAssignOpen}
        onDesignAssigned={handleDesignAssigned}
      />
      <TattooCompletionDialog
        lead={completionLead}
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        onCompleted={() => {
          if (completionLead) {
            updateLeadStatus(completionLead.id, 'Completed');
          }
        }}
      />
      <AnimatePresence>
        <BulkActionBar
          selectedCount={selectedIds.size}
          onMoveToStage={handleBulkMoveToStage}
          onDeleteSelected={handleBulkDelete}
          onClearSelection={() => { setSelectedIds(new Set()); setSelectMode(false); }}
        />
      </AnimatePresence>
      <WalkInDialog
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default Index;
