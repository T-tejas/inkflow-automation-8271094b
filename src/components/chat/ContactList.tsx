import { useState } from 'react';
import { ChatContact } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const AVATAR_COLORS = [
  'bg-emerald-700', 'bg-blue-700', 'bg-purple-700', 'bg-rose-700',
  'bg-amber-700', 'bg-cyan-700', 'bg-indigo-700', 'bg-pink-700',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type FilterTab = 'all' | 'unread' | 'booked' | 'completed' | 'hot';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Done' },
  { key: 'hot', label: '🔥 Hot' },
];

interface Props {
  contacts: ChatContact[];
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
}

export function ContactList({ contacts, selectedPhone, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.leadName.toLowerCase().includes(search.toLowerCase()) || c.leadPhone.includes(search);

    let matchesFilter = true;
    if (filter === 'unread') matchesFilter = c.unreadCount > 0;
    else if (filter === 'booked') matchesFilter = c.leadStatus === 'Booked';
    else if (filter === 'completed') matchesFilter = c.leadStatus === 'Completed' || c.leadStatus === 'Paid';
    else if (filter === 'hot') matchesFilter = c.leadStatus === 'Interested' || c.leadStatus === 'Negotiating';

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] border-r border-[#1a1a2e]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a2e]">
        <h2 className="text-sm font-semibold text-neutral-300 mb-2">Chats</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
          <input
            className="w-full bg-[#111] border border-[#222] rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-emerald-800"
            placeholder="Search name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#1a1a2e] overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
              filter === f.key
                ? 'bg-emerald-800/60 text-emerald-300'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a2e]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-600 text-center py-8">No contacts found</p>
        )}
        {filtered.map(c => (
          <button
            key={c.leadPhone}
            onClick={() => onSelect(c.leadPhone)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#111]',
              selectedPhone === c.leadPhone
                ? 'bg-emerald-900/20 border-l-2 border-l-emerald-500'
                : 'hover:bg-[#111] border-l-2 border-l-transparent'
            )}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={cn('text-xs font-bold text-white', getAvatarColor(c.leadName))}>
                  {c.leadName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {c.whatsappOptIn && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-200 truncate">{c.leadName}</span>
                {c.lastMessageTime && (
                  <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-2">
                    {formatDistanceToNowStrict(parseISO(c.lastMessageTime), { addSuffix: false })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-neutral-500 truncate max-w-[160px]">
                  {c.lastMessage || c.leadPhone}
                </span>
                {c.unreadCount > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[9px] bg-emerald-600 text-white border-0 flex-shrink-0">
                    {c.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
