import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDesignTasks } from "@/hooks/useDesignTasks";
import { DesignTaskTable } from "@/components/design/DesignTaskTable";
import { DesignTaskFormDialog } from "@/components/design/DesignTaskFormDialog";
import { DesignCalendarView } from "@/components/design/DesignCalendarView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, CalendarDays, Table2, Palette, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
function DesignTracker() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [artistFilter, setArtistFilter] = useState("");
  const { tasks, loading, addTask, updateTask, deleteTask, uploadFile, artists } = useDesignTasks(artistFilter || void 0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const leadId = searchParams.get("leadId");
  const leadName = searchParams.get("name");
  const leadPhone = searchParams.get("phone");
  useEffect(() => {
    if (leadId && leadName) {
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [leadId]);
  const handleEdit = (task) => {
    setEditTask(task);
    setFormOpen(true);
  };
  const handleFormClose = (open) => {
    setFormOpen(open);
    if (!open) setEditTask(null);
  };
  const handleSubmit = async (data) => editTask ? updateTask(editTask.id, data) : addTask(data);
  const handleStatusChange = (id, status) => updateTask(id, { design_status: status });
  const handleFeeStatusChange = (id, status) => updateTask(id, { fee_status: status });
  const handleUpload = (taskId, file, type) => uploadFile(taskId, file, type);
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.design_status === "Pending").length,
    inProgress: tasks.filter((t) => t.design_status === "Designing").length,
    overdue: tasks.filter((t) => new Date(t.design_due_date) < /* @__PURE__ */ new Date() && !["Approved", "Tattoo Completed"].includes(t.design_status)).length,
    unpaid: tasks.filter((t) => t.design_type === "paid" && t.fee_status === "pending").length
  };
  const statCards = [
    { label: "Total", value: stats.total, color: "text-white" },
    { label: "Pending", value: stats.pending, color: "text-amber-400" },
    { label: "Designing", value: stats.inProgress, color: "text-blue-400" },
    { label: "Overdue", value: stats.overdue, color: "text-red-400" },
    { label: "Unpaid", value: stats.unpaid, color: "text-amber-400" }
  ];
  return <div className="min-h-screen bg-[#0f172a]">
      {
    /* Header */
  }
      <header className="border-b border-[#334155] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Palette className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Design Tracker</h1>
              <p className="text-[11px] text-slate-400">Track designs, deadlines & payments</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
    variant="outline"
    size="sm"
    className="gap-1.5 border-[#334155] text-slate-300 hover:text-white hover:bg-slate-800"
    onClick={() => navigate("/appointments")}
  >
              <Calendar className="h-4 w-4 text-emerald-400" />
              Appointments
            </Button>
            <Select value={artistFilter} onValueChange={(v) => setArtistFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 h-8 text-xs bg-[#1e293b] border-[#334155] text-slate-300">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Artists" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                <SelectItem value="all">All Artists</SelectItem>
                {artists.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
    size="sm"
    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
    onClick={() => {
      setEditTask(null);
      setFormOpen(true);
    }}
  >
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {
    /* Stats */
  }
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map((s) => <motion.div
    key={s.label}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-[#334155] bg-[#1e293b] p-3 text-center"
  >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </motion.div>)}
        </div>

        <Tabs defaultValue="table">
          <TabsList className="bg-[#1e293b] border border-[#334155]">
            <TabsTrigger value="table" className="gap-1 text-xs data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400">
              <Table2 className="h-3 w-3" /> Table
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 text-xs data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400">
              <CalendarDays className="h-3 w-3" /> Calendar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-4">
            {loading ? <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
              </div> : <DesignTaskTable
    tasks={tasks}
    onEdit={handleEdit}
    onDelete={deleteTask}
    onStatusChange={handleStatusChange}
    onFeeStatusChange={handleFeeStatusChange}
    onUpload={handleUpload}
  />}
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
    defaultClientName={leadName || void 0}
    defaultClientPhone={leadPhone || void 0}
    defaultLeadId={leadId || void 0}
  />
    </div>;
}
export {
  DesignTracker as default
};
