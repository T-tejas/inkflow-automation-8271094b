import { useChat } from '@/hooks/useChat';
import { ContactList } from '@/components/chat/ContactList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Chat = () => {
  const navigate = useNavigate();
  const {
    contacts,
    messages,
    selectedPhone,
    loading,
    messagesLoading,
    selectContact,
    sendTemplate,
    addNote,
    toggleStar,
  } = useChat();

  const selectedContact = contacts.find(c => c.leadPhone === selectedPhone) || null;

  const handleSendTemplate = async (type: 'confirmation' | 'reminder' | 'promo', name: string) => {
    if (!selectedContact) return;
    try {
      await sendTemplate(
        selectedContact.leadPhone,
        selectedContact.leadName,
        selectedContact.leadId,
        type,
        name
      );
      toast({ title: 'Template sent', description: `${name} sent to ${selectedContact.leadName}` });
    } catch {
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
  };

  const handleSendNote = async (text: string) => {
    if (!selectedContact) return;
    try {
      await addNote(selectedContact.leadPhone, selectedContact.leadName, selectedContact.leadId, text);
    } catch {
      toast({ title: 'Failed to save note', variant: 'destructive' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a2e] bg-[#0a0a0f]">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-[10px]">F19</span>
        </div>
        <span className="text-sm font-semibold text-neutral-300">WhatsApp Chat</span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        <div className="w-80 flex-shrink-0">
          <ContactList
            contacts={contacts}
            selectedPhone={selectedPhone}
            onSelect={selectContact}
          />
        </div>
        <ChatWindow
          contact={selectedContact}
          messages={messages}
          loading={messagesLoading}
          onSendTemplate={handleSendTemplate}
          onSendNote={handleSendNote}
          onToggleStar={toggleStar}
        />
      </div>
    </div>
  );
};

export default Chat;
