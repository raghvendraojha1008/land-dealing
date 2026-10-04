import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Favorite {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
}

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching favorites:", error);
    } else {
      setFavorites(data || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (listingId: string | number) => {
      return favorites.some((f) => f.listing_id === String(listingId));
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (listingId: string | number) => {
      if (!userId) return false;

      const listingIdStr = String(listingId);
      const existing = favorites.find((f) => f.listing_id === listingIdStr);

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Error removing favorite:", error);
          return false;
        }

        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        return true;
      } else {
        // Add favorite
        const { data, error } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            listing_id: listingIdStr,
          })
          .select()
          .single();

        if (error) {
          console.error("Error adding favorite:", error);
          return false;
        }

        setFavorites((prev) => [...prev, data]);
        return true;
      }
    },
    [userId, favorites]
  );

  const getFavoriteListings = useCallback(() => {
    return favorites.map((f) => f.listing_id);
  }, [favorites]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    getFavoriteListings,
    refetch: fetchFavorites,
  };
}
