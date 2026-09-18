import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
function useLeadNotes(leadId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchNotes = useCallback(async () => {
    if (!leadId) {
      setNotes([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch notes:", error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [leadId]);
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);
  useEffect(() => {
    if (!leadId) return;
    const channel = supabase.channel(`lead-notes-${leadId}`).on("postgres_changes", { event: "*", schema: "public", table: "lead_notes", filter: `lead_id=eq.${leadId}` }, () => {
      fetchNotes();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, fetchNotes]);
  const addNote = useCallback(async (artistName, noteText) => {
    if (!leadId) return false;
    const { error } = await supabase.from("lead_notes").insert({ lead_id: leadId, artist_name: artistName, note_text: noteText });
    if (error) {
      toast.error("Failed to add note");
      return false;
    }
    toast.success("Note added");
    return true;
  }, [leadId]);
  const deleteNote = useCallback(async (noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
    if (error) {
      toast.error("Failed to delete note");
      fetchNotes();
      return false;
    }
    toast.success("Note deleted");
    return true;
  }, [fetchNotes]);
  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}
export {
  useLeadNotes
};
