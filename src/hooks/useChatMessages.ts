import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  isRead: boolean;
  createdAt: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  is_read: boolean;
  created_at: string;
}

function mapDbToMessage(db: DbMessage): ChatMessage {
  return {
    id: db.id,
    conversationId: db.conversation_id,
    senderId: db.sender_id,
    content: db.content || "",
    attachmentUrl: db.attachment_url || undefined,
    attachmentName: db.attachment_name || undefined,
    attachmentType: db.attachment_type || undefined,
    isRead: db.is_read,
    createdAt: db.created_at,
  };
}

export function useChatMessages(conversationId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !userId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages((data || []).map(mapDbToMessage));
    }
    setIsLoading(false);
  }, [conversationId, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !userId || messages.length === 0) return;

    const unreadIds = messages
      .filter((m) => !m.isRead && m.senderId !== userId)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds)
        .then(({ error }) => {
          if (error) console.error("Error marking messages as read:", error);
        });
    }
  }, [conversationId, userId, messages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = mapDbToMessage(payload.new as DbMessage);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (
      content: string,
      attachment?: { url: string; name: string; type: string }
    ) => {
      if (!conversationId || !userId) return false;
      if (!content.trim() && !attachment) return false;

      setIsSending(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim() || null,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      });

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setIsSending(false);

      if (error) {
        console.error("Error sending message:", error);
        return false;
      }

      return true;
    },
    [conversationId, userId]
  );

  const uploadAttachment = useCallback(
    async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
      if (!userId) return null;

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("message-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
      };
    },
    [userId]
  );

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    uploadAttachment,
    refetch: fetchMessages,
  };
}
