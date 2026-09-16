import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types";

interface DbMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
}

function mapDbToMessage(db: DbMessage): Message {
  return {
    id: db.id,
    inquiryId: db.inquiry_id,
    senderId: db.sender_id,
    content: db.content,
    attachmentUrl: db.attachment_url || undefined,
    attachmentName: db.attachment_name || undefined,
    attachmentType: db.attachment_type || undefined,
    createdAt: db.created_at,
  };
}

export function useMessages(inquiryId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!inquiryId || !userId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages((data || []).map(mapDbToMessage));
    }
    setIsLoading(false);
  }, [inquiryId, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set up realtime subscription
  useEffect(() => {
    if (!inquiryId) return;

    const channel = supabase
      .channel(`messages-${inquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const newMessage = mapDbToMessage(payload.new as DbMessage);
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiryId]);

  const sendMessage = useCallback(
    async (content: string, attachment?: { url: string; name: string; type: string }) => {
      if (!inquiryId || !userId || !content.trim()) return false;

      setIsSending(true);
      const { error } = await supabase.from("messages").insert({
        inquiry_id: inquiryId,
        sender_id: userId,
        content: content.trim(),
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      });

      setIsSending(false);

      if (error) {
        console.error("Error sending message:", error);
        return false;
      }

      return true;
    },
    [inquiryId, userId]
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
