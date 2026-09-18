import { useNavigate } from "react-router-dom";
import { useInstagramChat } from "@/hooks/useInstagramChat";
import { InstagramContactList } from "@/components/chat/InstagramContactList";
import { InstagramChatWindow } from "@/components/chat/InstagramChatWindow";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
const InstagramChat = () => {
  const navigate = useNavigate();
  const {
    contacts,
    messages,
    selectedSenderId,
    loading,
    messagesLoading,
    selectContact,
    sendMessage,
    retryMessage,
    toggleBotEnabled,
    toggleStar
  } = useInstagramChat();
  const selectedContact = contacts.find((c) => c.instagramSenderId === selectedSenderId) || null;
  const handleSendMessage = async (text) => {
    if (!selectedContact) return;
    try {
      await sendMessage(
        selectedContact.instagramSenderId,
        selectedContact.leadName,
        selectedContact.leadId,
        text
      );
      toast({ title: "Message sent" });
    } catch {
      toast({ title: "Failed to send message", description: "Check Instagram API configuration", variant: "destructive" });
    }
  };
  const handleToggleBot = async (senderId, currentEnabled) => {
    try {
      await toggleBotEnabled(senderId, currentEnabled);
      toast({ title: currentEnabled ? "Bot disabled \u2014 manual mode" : "Bot re-enabled" });
    } catch {
      toast({ title: "Failed to toggle bot", variant: "destructive" });
    }
  };
  return <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "#dddbd1" }}>
      <div className="fixed top-0 left-0 right-0 h-[128px] z-0" style={{ background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)" }} />
      <Button
    variant="ghost"
    size="sm"
    onClick={() => navigate("/")}
    className="fixed top-3 left-6 z-20 text-white hover:bg-white/20 gap-1.5"
  >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="relative z-10 flex w-full max-w-[1600px] h-[calc(100vh-36px)] my-[18px] mx-4 shadow-xl rounded-sm overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
        <div className="w-[420px] flex-shrink-0 border-r" style={{ borderColor: "#e9edef" }}>
          <InstagramContactList
    contacts={contacts}
    selectedSenderId={selectedSenderId}
    onSelect={selectContact}
  />
        </div>
        <InstagramChatWindow
    contact={selectedContact}
    messages={messages}
    loading={messagesLoading}
    onSendMessage={handleSendMessage}
    onToggleStar={toggleStar}
    onToggleBot={handleToggleBot}
    onRetryMessage={async (msg) => {
      try {
        await retryMessage(msg);
        toast({ title: "Message resent" });
      } catch {
        toast({ title: "Retry failed", variant: "destructive" });
      }
    }}
  />
      </div>
    </div>;
};
var stdin_default = InstagramChat;
export {
  stdin_default as default
};
