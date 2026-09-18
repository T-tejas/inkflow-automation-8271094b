import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Instagram, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
function InstagramContactList({ contacts, selectedSenderId, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(
    (c) => c.leadName.toLowerCase().includes(search.toLowerCase()) || c.instagramUsername.toLowerCase().includes(search.toLowerCase())
  );
  return <div className="flex flex-col h-full">
      {
    /* Header */
  }
      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#f0f2f5" }}>
        <Instagram className="h-5 w-5 text-pink-500" />
        <h2 className="text-base font-semibold" style={{ color: "#111b21" }}>Instagram DMs</h2>
        <Badge className="ml-auto bg-pink-500/10 text-pink-600 text-[10px]">
          {contacts.length}
        </Badge>
      </div>

      {
    /* Search */
  }
      <div className="px-3 py-2" style={{ backgroundColor: "#f0f2f5" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#54656f" }} />
          <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search Instagram contacts..."
    className="pl-9 h-[35px] rounded-lg text-sm border-0"
    style={{ backgroundColor: "#ffffff", color: "#111b21" }}
  />
        </div>
      </div>

      {
    /* Contact List */
  }
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? <div className="text-center py-8">
            <Instagram className="h-10 w-10 mx-auto mb-2 text-pink-300" />
            <p className="text-sm" style={{ color: "#667781" }}>No Instagram conversations yet</p>
          </div> : filtered.map((contact) => <div
    key={contact.instagramSenderId}
    onClick={() => onSelect(contact.instagramSenderId)}
    className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#f0f2f5] transition-colors"
    style={{
      backgroundColor: selectedSenderId === contact.instagramSenderId ? "#f0f2f5" : "transparent",
      borderBottom: "1px solid #e9edef"
    }}
  >
              <div className="w-[49px] h-[49px] rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                {(contact.leadName || contact.instagramUsername || "I").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium truncate" style={{ color: "#111b21" }}>
                    {contact.leadName && contact.leadName !== "Instagram User" ? contact.leadName : contact.instagramUsername ? `@${contact.instagramUsername}` : "Instagram User"}
                  </span>
                  {contact.lastMessageTime && <span className="text-[11px] flex-shrink-0" style={{ color: contact.unreadCount > 0 ? "#00a884" : "#667781" }}>
                      {formatDistanceToNow(new Date(contact.lastMessageTime), { addSuffix: false })}
                    </span>}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm truncate" style={{ color: "#667781" }}>
                    @{contact.instagramUsername} · {contact.lastMessage || "No messages"}
                  </span>
                  {contact.unreadCount > 0 && <Badge className="bg-pink-500 text-white rounded-full h-5 min-w-5 flex items-center justify-center text-[11px] font-medium p-0">
                      {contact.unreadCount}
                    </Badge>}
                </div>
              </div>
            </div>)}
      </ScrollArea>
    </div>;
}
export {
  InstagramContactList
};
