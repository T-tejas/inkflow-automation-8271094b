import { useState } from "react";
import { useLeadNotes } from "@/hooks/useLeadNotes";
import { useArtists } from "@/hooks/useArtists";
import { ArtistManagerDialog } from "./ArtistManagerDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, User, Clock } from "lucide-react";
function LeadNotesTimeline({ leadId }) {
  const { artistNames: artists, addArtist } = useArtists();
  const { notes, loading, addNote, deleteNote } = useLeadNotes(leadId);
  const [showForm, setShowForm] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [customArtist, setCustomArtist] = useState("");
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const finalArtistName = artistName === "__custom__" ? customArtist.trim() : artistName;
  const handleSubmit = async () => {
    if (!noteText.trim()) return;
    setSubmitting(true);
    if (artistName === "__custom__" && customArtist.trim()) {
      await addArtist(customArtist.trim());
    }
    const ok = await addNote(finalArtistName || "Unknown", noteText.trim());
    if (ok) {
      setNoteText("");
      setArtistName("");
      setCustomArtist("");
      setShowForm(false);
    }
    setSubmitting(false);
  };
  return <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Notes</h4>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Add Note
        </Button>
      </div>

      {showForm && <div className="border border-border rounded-lg p-2.5 space-y-2 bg-muted/30">
          <Select value={artistName} onValueChange={(v) => {
    if (v === "__manage__") {
      setManageOpen(true);
      return;
    }
    setArtistName(v);
  }}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Artist name" />
            </SelectTrigger>
            <SelectContent>
              {artists.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              <SelectItem value="__custom__">+ Add New Artist</SelectItem>
              <SelectItem value="__manage__">⚙ Manage Artists</SelectItem>
            </SelectContent>
          </Select>
          {artistName === "__custom__" && <Input
    placeholder="Enter artist name"
    value={customArtist}
    onChange={(e) => setCustomArtist(e.target.value)}
    className="h-7 text-xs"
  />}
          <Textarea
    placeholder="Write a note..."
    value={noteText}
    onChange={(e) => setNoteText(e.target.value)}
    className="text-xs min-h-[60px]"
  />
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={submitting || !noteText.trim()}>
              Save
            </Button>
          </div>
        </div>}

      {loading && <p className="text-xs text-muted-foreground">Loading notes...</p>}

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {notes.map((note) => {
    const dt = new Date(note.created_at);
    return <div key={note.id} className="border border-border/50 rounded-md p-2 bg-card text-xs group relative">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <User className="h-3 w-3" />
                  {note.artist_name || "Unknown"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
      onClick={async () => {
        if (deletingId) return;
        setDeletingId(note.id);
        await deleteNote(note.id);
        setDeletingId(null);
      }}
      disabled={deletingId === note.id}
      className="ml-auto opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity disabled:opacity-50"
    >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{note.note_text}</p>
            </div>;
  })}
        {!loading && notes.length === 0 && <p className="text-xs text-muted-foreground/60 text-center py-3">No notes yet</p>}
      </div>
      <ArtistManagerDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>;
}
export {
  LeadNotesTimeline
};
