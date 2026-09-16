import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  sellerId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

interface DbConversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
}

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch conversations where user is buyer or seller
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (convError) {
        console.error("Error fetching conversations:", convError);
        setIsLoading(false);
        return;
      }

      if (!convData || convData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Get listing titles
      const listingIds = [...new Set(convData.map((c) => c.listing_id).filter(Boolean))];
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", listingIds);

      const listingMap = new Map(listings?.map((l) => [l.id, l.title]) || []);

      // Get other user profiles
      const otherUserIds = convData.map((c) =>
        c.buyer_id === userId ? c.seller_id : c.buyer_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", otherUserIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.id, { name: p.name, avatar: p.avatar_url }]) || []
      );

      // Get last message for each conversation
      const convIds = convData.map((c) => c.id);
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMessageMap = new Map<string, { content: string; createdAt: string }>();
      lastMessages?.forEach((m) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, {
            content: m.content || "",
            createdAt: m.created_at,
          });
        }
      });

      // Get unread counts
      const { data: unreadData } = await supabase
        .from("messages")
        .select("conversation_id, id")
        .in("conversation_id", convIds)
        .neq("sender_id", userId)
        .eq("is_read", false);

      const unreadMap = new Map<string, number>();
      unreadData?.forEach((m) => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
      });

      const mapped: Conversation[] = convData.map((c: DbConversation) => {
        const otherUserId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
        const profile = profileMap.get(otherUserId);
        const lastMsg = lastMessageMap.get(c.id);

        return {
          id: c.id,
          listingId: c.listing_id,
          listingTitle: listingMap.get(c.listing_id) || "Unknown Listing",
          buyerId: c.buyer_id,
          sellerId: c.seller_id,
          otherUserId,
          otherUserName: profile?.name || "Unknown User",
          otherUserAvatar: profile?.avatar || undefined,
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.createdAt || c.last_message_at,
          unreadCount: unreadMap.get(c.id) || 0,
          createdAt: c.created_at,
        };
      });

      setConversations(mapped);
    } catch (err) {
      console.error("Error in fetchConversations:", err);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription for new conversations
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`conversations-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConversations]);

  const startConversation = useCallback(
    async (listingId: string, sellerId: string): Promise<string | null> => {
      if (!userId) return null;

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .eq("seller_id", sellerId)
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          listing_id: listingId,
          buyer_id: userId,
          seller_id: sellerId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return null;
      }

      await fetchConversations();
      return data.id;
    },
    [userId, fetchConversations]
  );

  return {
    conversations,
    isLoading,
    refetch: fetchConversations,
    startConversation,
  };
}
