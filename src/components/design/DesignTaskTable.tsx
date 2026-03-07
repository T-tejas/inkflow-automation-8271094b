import { useState } from 'react';
import type { DesignTask, DesignStatus, FeeStatus } from '@/hooks/useDesignTasks';
import { DESIGN_STATUSES } from '@/hooks/useDesignTasks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Upload, Image, FileCheck } from 'lucide-react';
import { formatINR } from '@/lib/currency';

const statusColors: Record<DesignStatus, string> = {
  'Pending': 'bg-muted text-muted-foreground',
  'Designing': 'bg-primary/15 text-primary',
  'Design Sent': 'bg-amber-500/15 text-amber-600',
  'Approved': 'bg-emerald-500/15 text-emerald-600',
  'Tattoo Completed': 'bg-green-600/15 text-green-700',
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
      <div className="text-center py-16 text-muted-foreground">
        <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No design tasks yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Client</TableHead>
            <TableHead className="text-xs">Artist</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Fee</TableHead>
            <TableHead className="text-xs">Payment</TableHead>
            <TableHead className="text-xs">Due Date</TableHead>
            <TableHead className="text-xs">Tattoo Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Files</TableHead>
            <TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const overdue = new Date(task.design_due_date) < new Date() && !['Approved', 'Tattoo Completed'].includes(task.design_status);
            return (
              <TableRow key={task.id} className={overdue ? 'bg-destructive/5' : ''}>
                <TableCell>
                  <div>
                    <p className="text-xs font-medium text-foreground">{task.client_name}</p>
                    <p className="text-[10px] text-muted-foreground">{task.client_phone}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-foreground">{task.artist_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${task.design_type === 'paid' ? 'border-amber-500/40 text-amber-600' : 'border-emerald-500/40 text-emerald-600'}`}>
                    {task.design_type === 'paid' ? '💰 Paid' : '🎁 Free'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-foreground">{task.design_type === 'paid' ? formatINR(task.design_fee) : '—'}</TableCell>
                <TableCell>
                  {task.design_type === 'paid' ? (
                    <Select value={task.fee_status} onValueChange={v => onFeeStatusChange(task.id, v as FeeStatus)}>
                      <SelectTrigger className="h-7 text-[10px] w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏳ Pending</SelectItem>
                        <SelectItem value="paid">✅ Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <span className="text-[10px] text-muted-foreground">N/A</span>}
                </TableCell>
                <TableCell className={`text-xs ${overdue ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                  {new Date(task.design_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {overdue && ' ⚠️'}
                </TableCell>
                <TableCell className="text-xs text-foreground">
                  {task.final_tattoo_date ? new Date(task.final_tattoo_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </TableCell>
                <TableCell>
                  <Select value={task.design_status} onValueChange={v => onStatusChange(task.id, v as DesignStatus)}>
                    <SelectTrigger className="h-7 text-[10px] w-32 border-0 bg-transparent">
                      <Badge className={`${statusColors[task.design_status]} text-[10px] border-0`}>{task.design_status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'reference')} />
                      <div className="h-6 w-6 rounded flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors" title="Upload reference">
                        <Upload className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange(task.id, 'final')} />
                      <div className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors" title="Upload final design">
                        <FileCheck className="h-3 w-3 text-primary" />
                      </div>
                    </label>
                    {task.reference_images.length > 0 && (
                      <span className="text-[9px] text-muted-foreground">{task.reference_images.length} ref</span>
                    )}
                    {task.final_design_url && <span className="text-[9px] text-emerald-600">✓ Final</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
