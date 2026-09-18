import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const DESIGN_STATUSES = ["Pending", "Designing", "Design Sent", "Approved", "Tattoo Completed"];
function useDesignTasks(artistFilter) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("design_tasks").select("*").order("design_due_date", { ascending: true });
    if (artistFilter) {
      query = query.eq("artist_name", artistFilter);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load design tasks");
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [artistFilter]);
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  const addTask = async (task) => {
    const { error } = await supabase.from("design_tasks").insert(task);
    if (error) {
      toast.error("Failed to create task");
      return false;
    }
    toast.success("Design task created");
    fetchTasks();
    return true;
  };
  const updateTask = async (id, updates) => {
    const { error } = await supabase.from("design_tasks").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    if (error) {
      toast.error("Failed to update task");
      return false;
    }
    const task = tasks.find((t) => t.id === id);
    if (task?.google_calendar_event_id && (updates.design_due_date || updates.design_start_date || updates.final_tattoo_date)) {
      const merged = { ...task, ...updates };
      const endDate = new Date(merged.design_due_date);
      endDate.setDate(endDate.getDate() + 1);
      try {
        await supabase.functions.invoke("google-calendar-event", {
          body: {
            action: "update",
            event_id: task.google_calendar_event_id,
            event_data: {
              client_name: merged.client_name,
              client_phone: merged.client_phone,
              start_date: merged.design_start_date,
              end_date: endDate.toISOString().split("T")[0],
              design_due_date: merged.design_due_date,
              tattoo_date: merged.final_tattoo_date,
              notes: merged.notes
            }
          }
        });
      } catch {
      }
    }
    toast.success("Task updated");
    fetchTasks();
    return true;
  };
  const deleteTask = async (id) => {
    const { error } = await supabase.from("design_tasks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete task");
      return false;
    }
    toast.success("Task deleted");
    fetchTasks();
    return true;
  };
  const uploadFile = async (taskId, file, type) => {
    const path = `${taskId}/${type}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("design-files").upload(path, file);
    if (error) {
      toast.error("Upload failed");
      return null;
    }
    const { data: urlData } = supabase.storage.from("design-files").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    if (type === "reference") {
      const task = tasks.find((t) => t.id === taskId);
      const imgs = [...task?.reference_images || [], publicUrl];
      await updateTask(taskId, { reference_images: imgs });
    } else {
      await updateTask(taskId, { final_design_url: publicUrl });
    }
    return publicUrl;
  };
  const artists = [...new Set(tasks.map((t) => t.artist_name))];
  return { tasks, loading, addTask, updateTask, deleteTask, uploadFile, fetchTasks, artists };
}
export {
  DESIGN_STATUSES,
  useDesignTasks
};
