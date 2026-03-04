import { useChat } from '@/hooks/useChat';
import { ContactList } from '@/components/chat/ContactList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { toast } from '@/hooks/use-toast';

const Chat = () => {
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
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#dddbd1' }}>
      {/* WhatsApp green top bar */}
      <div className="fixed top-0 left-0 right-0 h-[128px] z-0" style={{ backgroundColor: '#00a884' }} />
      
      {/* Main container */}
      <div className="relative z-10 flex w-full max-w-[1600px] h-[calc(100vh-36px)] my-[18px] mx-4 shadow-xl rounded-sm overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        {/* Left sidebar */}
        <div className="w-[420px] flex-shrink-0 border-r" style={{ borderColor: '#e9edef' }}>
          <ContactList
            contacts={contacts}
            selectedPhone={selectedPhone}
            onSelect={selectContact}
          />
        </div>
        {/* Chat window */}
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
