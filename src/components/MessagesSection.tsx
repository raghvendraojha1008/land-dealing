import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { ConversationsList } from "./ConversationsList";
import { ChatWindow } from "./ChatWindow";

interface MessagesSectionProps {
  userId: string;
}

export function MessagesSection({ userId }: MessagesSectionProps) {
  const { conversations, isLoading } = useConversations(userId);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
      <div className="flex h-[600px]">
        {/* Conversations list - hidden on mobile when chat is open */}
        <div
          className={`w-full md:w-80 border-r border-border flex-shrink-0 ${
            selectedConversation ? "hidden md:block" : ""
          }`}
        >
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Messages</h2>
            </div>
          </div>
          <div className="overflow-y-auto h-[calc(600px-65px)]">
            <ConversationsList
              conversations={conversations}
              isLoading={isLoading}
              selectedId={selectedConversation?.id || null}
              onSelect={setSelectedConversation}
            />
          </div>
        </div>

        {/* Chat window */}
        <div
          className={`flex-1 ${
            selectedConversation ? "" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              userId={userId}
              onBack={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
