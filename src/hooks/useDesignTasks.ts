import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DesignStatus = 'Pending' | 'Designing' | 'Design Sent' | 'Approved' | 'Tattoo Completed';
export type DesignType = 'paid' | 'free';
export type FeeStatus = 'paid' | 'pending';

export interface DesignTask {
  id: string;
  lead_id: string | null;
  client_name: string;
  client_phone: string;
  artist_name: string;
  design_type: DesignType;
  design_fee: number;
  fee_status: FeeStatus;
  design_start_date: string;
  design_due_date: string;
  final_tattoo_date: string | null;
  design_status: DesignStatus;
  reference_images: string[];
  final_design_url: string | null;
  notes: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export const DESIGN_STATUSES: DesignStatus[] = ['Pending', 'Designing', 'Design Sent', 'Approved', 'Tattoo Completed'];

export function useDesignTasks(artistFilter?: string) {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('design_tasks').select('*').order('design_due_date', { ascending: true });
    if (artistFilter) {
      query = query.eq('artist_name', artistFilter);
    }
    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load design tasks');
    } else {
      setTasks((data || []) as unknown as DesignTask[]);
    }
    setLoading(false);
  }, [artistFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (task: Omit<DesignTask, 'id' | 'created_at' | 'updated_at' | 'reference_images' | 'final_design_url' | 'google_calendar_event_id'>) => {
    const { error } = await supabase.from('design_tasks').insert(task as any);
    if (error) { toast.error('Failed to create task'); return false; }
    toast.success('Design task created');
    fetchTasks();
    return true;
  };

  const updateTask = async (id: string, updates: Partial<DesignTask>) => {
    const { error } = await supabase.from('design_tasks').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error('Failed to update task'); return false; }

    // Auto-update Google Calendar if dates changed and event exists
    const task = tasks.find(t => t.id === id);
    if (task?.google_calendar_event_id && (updates.design_due_date || updates.design_start_date || updates.final_tattoo_date)) {
      const merged = { ...task, ...updates };
      const endDate = new Date(merged.design_due_date);
      endDate.setDate(endDate.getDate() + 1);
      try {
        await supabase.functions.invoke('google-calendar-event', {
          body: {
            action: 'update',
            event_id: task.google_calendar_event_id,
            event_data: {
              client_name: merged.client_name,
              client_phone: merged.client_phone,
              start_date: merged.design_start_date,
              end_date: endDate.toISOString().split('T')[0],
              design_due_date: merged.design_due_date,
              tattoo_date: merged.final_tattoo_date,
              notes: merged.notes,
            },
          },
        });
      } catch { /* calendar update is best-effort */ }
    }

    toast.success('Task updated');
    fetchTasks();
    return true;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('design_tasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete task'); return false; }
    toast.success('Task deleted');
    fetchTasks();
    return true;
  };

  const uploadFile = async (taskId: string, file: File, type: 'reference' | 'final') => {
    const path = `${taskId}/${type}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('design-files').upload(path, file);
    if (error) { toast.error('Upload failed'); return null; }
    const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    if (type === 'reference') {
      const task = tasks.find(t => t.id === taskId);
      const imgs = [...(task?.reference_images || []), publicUrl];
      await updateTask(taskId, { reference_images: imgs } as any);
    } else {
      await updateTask(taskId, { final_design_url: publicUrl } as any);
    }
    return publicUrl;
  };

  const artists = [...new Set(tasks.map(t => t.artist_name))];

  return { tasks, loading, addTask, updateTask, deleteTask, uploadFile, fetchTasks, artists };
}
