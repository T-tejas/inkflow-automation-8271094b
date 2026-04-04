import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat, ChatMessage, ChatContact } from '@/hooks/useChat';
import { useInstagramChat, InstagramMessage, InstagramContact } from '@/hooks/useInstagramChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, MessageCircle, Instagram, Globe, Send, Star, Bot, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UnifiedContact {
  id: string;
  name: string;
  identifier: string; // phone or senderId
  platform: 'whatsapp' | 'instagram';
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  leadId: string;
  botEnabled: boolean;
}

interface UnifiedMessage {
  id: string;
  body: string | null;
  direction: string;
  createdAt: string;
  platform: 'whatsapp' | 'instagram';
  starred: boolean;
  isNote: boolean;
  status: string;
  mediaUrl: string | null;
}

const UniversalInbox = () => {
  const navigate = useNavigate();
  const whatsapp = useChat();
  const instagram = useInstagramChat();
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'whatsapp' | 'instagram' | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const unifiedContacts = useMemo(() => {
    const contacts: UnifiedContact[] = [];

    for (const c of whatsapp.contacts) {
      contacts.push({
        id: `wa-${c.leadPhone}`,
        name: c.leadName,
        identifier: c.leadPhone,
        platform: 'whatsapp',
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount,
        leadId: c.leadId,
        botEnabled: c.botEnabled,
      });
    }

    for (const c of instagram.contacts) {
      contacts.push({
        id: `ig-${c.instagramSenderId}`,
        name: c.leadName,
        identifier: c.instagramSenderId,
        platform: 'instagram',
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount,
        leadId: c.leadId,
        botEnabled: c.botEnabled,
      });
    }

    return contacts
      .filter(c => filter === 'all' || c.platform === filter)
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        }
        return 0;
      });
  }, [whatsapp.contacts, instagram.contacts, filter, search]);

  const unifiedMessages = useMemo((): UnifiedMessage[] => {
    if (!selectedId || !selectedPlatform) return [];

    if (selectedPlatform === 'whatsapp') {
      return whatsapp.messages.map(m => ({
        id: m.id,
        body: m.messageBody,
        direction: m.templateType === 'incoming' ? 'incoming' : 'outgoing',
        createdAt: m.createdAt,
        platform: 'whatsapp' as const,
        starred: m.starred,
        isNote: m.isInternalNote,
        status: m.status,
        mediaUrl: m.mediaUrl,
      }));
    }

    return instagram.messages.map(m => ({
      id: m.id,
      body: m.messageBody,
      direction: m.direction,
      createdAt: m.createdAt,
      platform: 'instagram' as const,
      starred: m.starred,
      isNote: m.isInternalNote,
      status: m.status,
      mediaUrl: m.mediaUrl,
    }));
  }, [selectedId, selectedPlatform, whatsapp.messages, instagram.messages]);

  const handleSelectContact = (contact: UnifiedContact) => {
    setSelectedId(contact.id);
    setSelectedPlatform(contact.platform);
    if (contact.platform === 'whatsapp') {
      whatsapp.selectContact(contact.identifier);
    } else {
      instagram.selectContact(contact.identifier);
    }
  };

  const selectedContact = unifiedContacts.find(c => c.id === selectedId) || null;

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedContact) return;
    try {
      if (selectedContact.platform === 'whatsapp') {
        await whatsapp.sendMessage(selectedContact.identifier, selectedContact.name, selectedContact.leadId, messageInput);
      } else {
        await instagram.sendMessage(selectedContact.identifier, selectedContact.name, selectedContact.leadId, messageInput);
      }
      setMessageInput('');
      toast({ title: 'Message sent' });
    } catch {
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
  };

  const totalUnread = unifiedContacts.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Universal Inbox</h1>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">{totalUnread}</Badge>
          )}
        </div>
        <div className="ml-auto">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs px-3 h-7 gap-1">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </TabsTrigger>
              <TabsTrigger value="instagram" className="text-xs px-3 h-7 gap-1">
                <Instagram className="h-3 w-3" /> Instagram
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Contact List */}
        <div className="w-[360px] border-r flex flex-col">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {(whatsapp.loading || instagram.loading) ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : unifiedContacts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No conversations</div>
            ) : (
              unifiedContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors border-b border-border/50 ${
                    selectedId === contact.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {contact.platform === 'whatsapp' ? (
                      <MessageCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Instagram className="h-5 w-5 text-pink-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{contact.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {contact.lastMessageTime ? format(new Date(contact.lastMessageTime), 'HH:mm') : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{contact.lastMessage || 'No messages'}</span>
                      {contact.unreadCount > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary">{contact.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Universal Inbox</p>
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-card">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {selectedContact.platform === 'whatsapp' ? (
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Instagram className="h-5 w-5 text-pink-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedContact.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4">
                      {selectedContact.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                    </Badge>
                    {selectedContact.botEnabled && (
                      <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                        <Bot className="h-2.5 w-2.5" /> Bot Active
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-3xl mx-auto">
                  {(whatsapp.messagesLoading || instagram.messagesLoading) ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : unifiedMessages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No messages yet</div>
                  ) : (
                    unifiedMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          msg.isNote
                            ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-300 italic'
                            : msg.direction === 'incoming'
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                        }`}>
                          {msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt="media" className="rounded mb-1 max-h-48 object-cover" />
                          )}
                          <p>{msg.body || '💬'}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] opacity-60">
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                            {msg.starred && <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t bg-card">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button onClick={handleSend} size="icon" disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniversalInbox;
