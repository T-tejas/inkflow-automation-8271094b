import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDesignTasks, type DesignTask, type DesignStatus, type FeeStatus } from '@/hooks/useDesignTasks';
import { DesignTaskTable } from '@/components/design/DesignTaskTable';
import { DesignTaskFormDialog } from '@/components/design/DesignTaskFormDialog';
import { DesignCalendarView } from '@/components/design/DesignCalendarView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, CalendarDays, Table2, Palette, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DesignTracker() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [artistFilter, setArtistFilter] = useState<string>('');
  const { tasks, loading, addTask, updateTask, deleteTask, uploadFile, artists } = useDesignTasks(artistFilter || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<DesignTask | null>(null);

  // Auto-open form when coming from CRM lead conversion
  const leadId = searchParams.get('leadId');
  const leadName = searchParams.get('name');
  const leadPhone = searchParams.get('phone');

  useEffect(() => {
    if (leadId && leadName) {
      setFormOpen(true);
      // Clear params after opening
      setSearchParams({}, { replace: true });
    }
  }, [leadId]);

  const handleEdit = (task: DesignTask) => { setEditTask(task); setFormOpen(true); };
  const handleFormClose = (open: boolean) => { setFormOpen(open); if (!open) setEditTask(null); };
  const handleSubmit = async (data: any) => editTask ? updateTask(editTask.id, data) : addTask(data);
  const handleStatusChange = (id: string, status: DesignStatus) => updateTask(id, { design_status: status });
  const handleFeeStatusChange = (id: string, status: FeeStatus) => updateTask(id, { fee_status: status });
  const handleUpload = (taskId: string, file: File, type: 'reference' | 'final') => uploadFile(taskId, file, type);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.design_status === 'Pending').length,
    inProgress: tasks.filter(t => t.design_status === 'Designing').length,
    overdue: tasks.filter(t => new Date(t.design_due_date) < new Date() && !['Approved', 'Tattoo Completed'].includes(t.design_status)).length,
    unpaid: tasks.filter(t => t.design_type === 'paid' && t.fee_status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Design </h1>
              <p className="text-[11px] text-muted-foreground">Track designs, deadlines & payments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={artistFilter} onValueChange={v => setArtistFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artists</SelectItem>
                {artists.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditTask(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Pending', value: stats.pending, color: 'text-muted-foreground' },
            { label: 'Designing', value: stats.inProgress, color: 'text-primary' },
            { label: 'Overdue', value: stats.overdue, color: 'text-destructive' },
            { label: 'Unpaid', value: stats.unpaid, color: 'text-amber-600' },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-lg border border-border p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table" className="gap-1 text-xs"><Table2 className="h-3 w-3" /> Table</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 text-xs"><CalendarDays className="h-3 w-3" /> Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <DesignTaskTable
                tasks={tasks}
                onEdit={handleEdit}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onFeeStatusChange={handleFeeStatusChange}
                onUpload={handleUpload}
              />
            )}
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <DesignCalendarView tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>

      <DesignTaskFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleSubmit}
        editTask={editTask}
        defaultClientName={leadName || undefined}
        defaultClientPhone={leadPhone || undefined}
        defaultLeadId={leadId || undefined}
      />
    </div>
  );
}
