import type { DesignTask, DesignStatus, FeeStatus } from '@/hooks/useDesignTasks';
import { DESIGN_STATUSES } from '@/hooks/useDesignTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Upload, Image, FileCheck } from 'lucide-react';
import { formatINR } from '@/lib/currency';

const statusColors: Record<DesignStatus, string> = {
  'Pending': 'bg-amber-500/15 text-amber-400',
  'Designing': 'bg-blue-500/15 text-blue-400',
  'Design Sent': 'bg-purple-500/15 text-purple-400',
  'Approved': 'bg-emerald-500/15 text-emerald-400',
  'Tattoo Completed': 'bg-emerald-600/15 text-emerald-400',
};

interface Props {
  tasks: DesignTask[];
  onEdit: (task: DesignTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: DesignStatus) => void;
  onFeeStatusChange: (id: string, status: FeeStatus) => void;
  onUpload: (taskId: string, file: File, type: 'reference' | 'final') => void;
}

export function DesignTaskTable({ tasks, onEdit, onDelete, onStatusChange, onFeeStatusChange, onUpload }: Props) {
  const handleFileChange = (taskId: string, type: 'reference' | 'final') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(taskId, file, type);
    e.target.value = '';
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <Image className="h-12 w-12 mx-auto mb-3 text-slate-600" />
        <p className="text-sm text-slate-500">No design tasks yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-[#334155] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1e293b] border-b border-[#334155]">
              {['Client', 'Artist', 'Type', 'Fee', 'Payment', 'Due Date', 'Tattoo Date', 'Status', 'Files', ''].map(h => (
                <th key={h} className="text-[11px] text-slate-400 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const overdue = new Date(task.design_due_date) < new Date() && !['Approved', 'Tattoo Completed'].includes(task.design_status);
              return (
                <tr key={task.id} className={`border-b border-[#334155] transition-colors hover:bg-[#1e293b]/80 ${overdue ? 'bg-red-500/5' : 'bg-[#0f172a]'}`}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">{task.client_name}</p>
                    <p className="text-[10px] text-slate-500">{task.client_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{task.artist_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] border-0 ${task.design_type === 'paid' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {task.design_type === 'paid' ? '💰 Paid' : '🎁 Free'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{task.design_type === 'paid' ? formatINR(task.design_fee) : '—'}</td>
                  <td className="px-4 py-3">
                    {task.design_type === 'paid' ? (
                      <Select value={task.fee_status} onValueChange={v => onFeeStatusChange(task.id, v as FeeStatus)}>
                        <SelectTrigger className="h-7 text-[10px] w-24 bg-[#1e293b] border-[#334155] text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-[#334155]">
                          <SelectItem value="pending">⏳ Pending</SelectItem>
                          <SelectItem value="paid">✅ Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <span className="text-[10px] text-slate-500">N/A</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                    {new Date(task.design_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    {overdue && ' ⚠️'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {task.final_tattoo_date ? new Date(task.final_tattoo_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={task.design_status} onValueChange={v => onStatusChange(task.id, v as DesignStatus)}>
                      <SelectTrigger className="h-7 text-[10px] w-32 border-0 bg-transparent">
                        <Badge className={`${statusColors[task.design_status]} text-[10px] border-0`}>{task.design_status}</Badge>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-[#334155]">
                        {DESIGN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'reference')} />
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-colors" title="Upload reference">
                          <Upload className="h-3 w-3 text-slate-400" />
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'final')} />
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors" title="Upload final design">
                          <FileCheck className="h-3 w-3 text-emerald-400" />
                        </div>
                      </label>
                      {task.reference_images.length > 0 && <span className="text-[9px] text-slate-500">{task.reference_images.length} ref</span>}
                      {task.final_design_url && <span className="text-[9px] text-emerald-400">✓ Final</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => onEdit(task)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => onDelete(task.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {tasks.map(task => {
          const overdue = new Date(task.design_due_date) < new Date() && !['Approved', 'Tattoo Completed'].includes(task.design_status);
          return (
            <div key={task.id} className={`rounded-xl border p-4 ${overdue ? 'border-red-500/40 bg-red-500/5' : 'border-[#334155] bg-[#1e293b]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{task.client_name}</p>
                  <p className="text-[11px] text-slate-500">{task.client_phone}</p>
                </div>
                <Badge className={`${statusColors[task.design_status]} text-[10px] border-0`}>{task.design_status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><span className="text-slate-500">Artist:</span> <span className="text-slate-300">{task.artist_name}</span></div>
                <div><span className="text-slate-500">Type:</span> <span className={task.design_type === 'paid' ? 'text-amber-400' : 'text-emerald-400'}>{task.design_type === 'paid' ? 'Paid' : 'Free'}</span></div>
                <div><span className="text-slate-500">Due:</span> <span className={overdue ? 'text-red-400 font-semibold' : 'text-slate-300'}>{new Date(task.design_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{overdue && ' ⚠️'}</span></div>
                {task.design_type === 'paid' && <div><span className="text-slate-500">Fee:</span> <span className="text-slate-300">{formatINR(task.design_fee)}</span></div>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'reference')} />
                    <div className="h-7 w-7 rounded flex items-center justify-center bg-slate-700"><Upload className="h-3 w-3 text-slate-400" /></div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'final')} />
                    <div className="h-7 w-7 rounded flex items-center justify-center bg-emerald-500/15"><FileCheck className="h-3 w-3 text-emerald-400" /></div>
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => onDelete(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
