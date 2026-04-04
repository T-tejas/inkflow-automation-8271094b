import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useAppointments } from '@/hooks/useAppointments';
import { ContactList } from '@/components/chat/ContactList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { BookingDialog } from '@/components/appointments/BookingDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Chat = () => {
  const navigate = useNavigate();
  const {
    contacts, messages, selectedPhone, loading, messagesLoading,
    selectContact, sendTemplate, sendMessage, sendAttachment,
    addNote, toggleStar, updateLeadStatus, toggleBotEnabled, retryMessage, clearChat,
  } = useChat();

  const { getAvailableSlots, isDayAvailable, createAppointment } = useAppointments();
  const [bookingOpen, setBookingOpen] = useState(false);

  const selectedContact = contacts.find(c => c.leadPhone === selectedPhone) || null;

  const handleSendTemplate = async (type: 'confirmation' | 'reminder' | 'promo', name: string) => {
    if (!selectedContact) return;
    try {
      await sendTemplate(selectedContact.leadPhone, selectedContact.leadName, selectedContact.leadId, type, name);
      toast({ title: 'Template sent', description: `${name} sent to ${selectedContact.leadName}` });
    } catch {
      toast({ title: 'Failed to send template', variant: 'destructive' });
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

  const handleSendMessage = async (text: string) => {
    if (!selectedContact) return;
    try {
      await sendMessage(selectedContact.leadPhone, selectedContact.leadName, selectedContact.leadId, text);
      toast({ title: 'Message sent' });
    } catch {
      toast({ title: 'Failed to send message', description: 'Check WhatsApp API configuration', variant: 'destructive' });
    }
  };

  const handleSendAttachment = async (url: string, fileName: string, isImage: boolean) => {
    if (!selectedContact) return;
    try {
      await sendAttachment(selectedContact.leadPhone, selectedContact.leadName, selectedContact.leadId, url, fileName, isImage);
      toast({ title: 'Attachment sent' });
    } catch {
      toast({ title: 'Failed to send attachment', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string, oldStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus, oldStatus);
      toast({ title: `Status updated to ${newStatus}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleToggleBot = async (leadId: string, currentStatus: boolean) => {
    try {
      await toggleBotEnabled(leadId, currentStatus);
      toast({ title: currentStatus ? 'AI Bot disabled for this contact' : 'AI Bot re-enabled for this contact' });
    } catch {
      toast({ title: 'Failed to toggle bot', variant: 'destructive' });
    }
  };

  const handleRetryMessage = async (message: any) => {
    try {
      await retryMessage(message);
      toast({ title: 'Message resent' });
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' });
    }
  };

  return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#dddbd1' }}>
      <div className="fixed top-0 left-0 right-0 h-[128px] z-0" style={{ backgroundColor: '#00a884' }} />
      <div className="relative z-10 flex w-full max-w-[1600px] h-[calc(100vh-36px)] my-[18px] mx-4 shadow-xl rounded-sm overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-[420px] flex-shrink-0 border-r" style={{ borderColor: '#e9edef' }}>
          <ContactList contacts={contacts} selectedPhone={selectedPhone} onSelect={selectContact} />
        </div>
        <ChatWindow
          contact={selectedContact}
          messages={messages}
          loading={messagesLoading}
          onSendTemplate={handleSendTemplate}
          onSendNote={handleSendNote}
          onSendMessage={handleSendMessage}
          onSendAttachment={handleSendAttachment}
          onToggleStar={toggleStar}
          onStatusChange={handleStatusChange}
          onRetryMessage={handleRetryMessage}
          onBookAppointment={() => setBookingOpen(true)}
          onToggleBot={handleToggleBot}
          onClearChat={clearChat}
        />
      </div>

      {selectedContact && (
        <BookingDialog
          key={selectedContact.leadId}
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          leadId={selectedContact.leadId}
          leadName={selectedContact.leadName}
          leadPhone={selectedContact.leadPhone}
          getAvailableSlots={getAvailableSlots}
          isDayAvailable={isDayAvailable}
          onBook={createAppointment}
        />
      )}
    </div>
  );
};

export default Chat;
