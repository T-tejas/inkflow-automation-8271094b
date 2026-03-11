import { useState } from 'react';
import { useArtists } from '@/hooks/useArtists';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Users } from 'lucide-react';

interface ArtistManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistManagerDialog({ open, onOpenChange }: ArtistManagerDialogProps) {
  const { artists, addArtist, deleteArtist } = useArtists();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    await addArtist(newName.trim());
    setNewName('');
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Manage Artists
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New artist name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAdd} disabled={adding || !newName.trim()}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {artists.map(artist => (
              <div key={artist.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-1.5 text-xs group">
                <span className="text-foreground">{artist.name}</span>
                <button
                  onClick={async () => {
                    if (deletingId) return;
                    setDeletingId(artist.id);
                    await deleteArtist(artist.id);
                    setDeletingId(null);
                  }}
                  disabled={deletingId === artist.id}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {artists.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No artists yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
