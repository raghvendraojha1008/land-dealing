import { MessageSquare, User, Clock } from "lucide-react";
import { Conversation } from "@/hooks/useConversations";

interface ConversationsListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationsList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}: ConversationsListProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation from a listing</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
            selectedId === conv.id ? "bg-muted" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {conv.otherUserAvatar ? (
                <img
                  src={conv.otherUserAvatar}
                  alt={conv.otherUserName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground truncate">
                  {conv.otherUserName}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {conv.listingTitle}
              </p>
              {conv.lastMessage && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {conv.lastMessage}
                </p>
              )}
            </div>

            {/* Unread badge */}
            {conv.unreadCount > 0 && (
              <div className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
