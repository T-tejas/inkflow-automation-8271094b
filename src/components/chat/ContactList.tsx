import { useState } from 'react';
import { ChatContact } from '@/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const AVATAR_COLORS = [
  '#25d366', '#128c7e', '#075e54', '#34b7f1',
  '#00a884', '#53bdeb', '#7c8b95', '#4a9c6d',
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
    <div className="flex flex-col h-full" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#f0f2f5' }}>
        <h2 className="text-lg font-semibold" style={{ color: '#111b21' }}>Chats</h2>
        <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
          <Filter className="h-5 w-5" style={{ color: '#54656f' }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ backgroundColor: '#f0f2f5' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8696a0' }} />
          <input
            className="w-full rounded-lg pl-10 pr-3 py-2 text-sm outline-none"
            style={{ backgroundColor: '#ffffff', color: '#111b21', border: 'none' }}
            placeholder="Search or start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto" style={{ backgroundColor: '#ffffff' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors'
            )}
            style={filter === f.key
              ? { backgroundColor: '#00a884', color: '#ffffff' }
              : { backgroundColor: '#f0f2f5', color: '#54656f' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-sm text-center py-12" style={{ color: '#8696a0' }}>No contacts found</p>
        )}
        {filtered.map(c => (
          <button
            key={c.leadPhone}
            onClick={() => onSelect(c.leadPhone)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors'
            )}
            style={{
              backgroundColor: selectedPhone === c.leadPhone ? '#f0f2f5' : 'transparent',
              borderBottom: '1px solid #e9edef',
            }}
            onMouseEnter={e => {
              if (selectedPhone !== c.leadPhone) e.currentTarget.style.backgroundColor = '#f5f6f6';
            }}
            onMouseLeave={e => {
              if (selectedPhone !== c.leadPhone) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Avatar */}
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(c.leadName) }}
            >
              {c.leadName.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-normal truncate" style={{ color: '#111b21' }}>
                  {c.leadName}
                </span>
                {c.lastMessageTime && (
                  <span className="text-xs flex-shrink-0 ml-2" style={{ color: c.unreadCount > 0 ? '#25d366' : '#667781' }}>
                    {formatDistanceToNowStrict(parseISO(c.lastMessageTime), { addSuffix: false })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-sm truncate max-w-[240px]" style={{ color: '#667781' }}>
                  {c.lastMessage || c.leadPhone}
                </span>
                {c.unreadCount > 0 && (
                  <span
                    className="h-5 min-w-5 px-1.5 text-[11px] rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                    style={{ backgroundColor: '#25d366' }}
                  >
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
