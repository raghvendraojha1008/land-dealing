import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Listing } from "@/types";
import { AppRole } from "./useAuth";
import { INITIAL_LISTINGS } from "@/data/initialListings";

interface DbListing {
  id: string;
  seller_id: string;
  title: string;
  type: "residential" | "agricultural" | "commercial";
  area: number;
  price: number;
  description: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  boundary: { lat: number; lng: number }[] | null;
  images: string[] | null;
  documents: { name: string; url?: string; mock?: boolean }[] | null;
  created_at: string | null;
  updated_at: string | null;
  rera_number?: string | null;
  khasra_number?: string | null;
  rejection_reason?: string | null;
  suspicion_reason?: string | null;
}

function mapDbToListing(db: DbListing): Listing {
  return {
    id: db.id,
    sellerId: db.seller_id,
    title: db.title,
    type: db.type,
    area: Number(db.area),
    price: Number(db.price),
    description: db.description || "",
    lat: db.lat,
    lng: db.lng,
    status: (db.status as Listing["status"]) || "unverified",
    boundary: Array.isArray(db.boundary) ? db.boundary : [],
    images: Array.isArray(db.images) ? db.images : [],
    documents: Array.isArray(db.documents) ? db.documents : [],
    createdAt: db.created_at ?? undefined,
    updatedAt: db.updated_at ?? undefined,
    reraNumber: db.rera_number ?? undefined,
    khasraNumber: db.khasra_number ?? undefined,
    rejectionReason: db.rejection_reason ?? undefined,
    suspicionReason: db.suspicion_reason ?? undefined,
  };
}

export function useListings(userId: string | null, roles: AppRole[]) {
  // 1. Synchronously load cached listings (or fallback INITIAL_LISTINGS) for 0ms instant startup
  const [listings, setListings] = React.useState<Listing[]>(() => {
    try {
      const cached = localStorage.getItem("terraListingsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_LISTINGS;
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // 2. Fetch listings from Supabase with optional silent background mode (prevents loading overlay flickering)
  const fetchListings = React.useCallback(async (isSilent = false) => {
    if (!isSilent && listings.length === 0) {
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchListings error:", {
          message: error.message,
          details: error.details,
          hint:    error.hint,
          code:    error.code,
        });
        return;
      }

      if (data && data.length > 0) {
        const mapped = data.map((l) => mapDbToListing(l as DbListing));
        setListings(mapped);
        try {
          localStorage.setItem("terraListingsCache", JSON.stringify(mapped));
        } catch {}
      }
    } catch (err) {
      console.error("fetchListings threw:", err);
    } finally {
      setIsLoading(false);
    }
  }, [listings.length]);

  // Initial fetch on mount — background silent revalidation
  React.useEffect(() => {
    fetchListings(true);
  }, []);

  // Realtime: silent background update on table changes
  React.useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => { fetchListings(true); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchListings]);

  const addListing = React.useCallback(async (
    listing: Omit<Listing, "id" | "sellerId" | "status">,
    sellerId: string
  ): Promise<Listing | null> => {

    const payload: Record<string, any> = {
      seller_id:   sellerId,
      title:       listing.title,
      type:        listing.type || "residential",
      area:        Number(listing.area),
      price:       Number(listing.price),
      description: listing.description || null,
      lat:         listing.lat  ?? null,
      lng:         listing.lng  ?? null,
      boundary:    listing.boundary?.length  ? listing.boundary  : null,
      images:      listing.images?.length    ? listing.images    : null,
      documents:   listing.documents?.length ? listing.documents : null,
      status:      "unverified",
    };

    if (listing.reraNumber?.trim()) payload.rera_number = listing.reraNumber.trim();
    if (listing.khasraNumber?.trim()) payload.khasra_number = listing.khasraNumber.trim();

    let { data, error } = await supabase
      .from("listings")
      .insert(payload)
      .select()
      .single();

    // Fallback: If PostgREST schema cache fails due to missing optional columns (PGRST204)
    if (error && (error.code === "PGRST204" || error.message?.includes("Could not find"))) {
      console.warn("Retrying addListing without extra extended columns (rera_number/khasra_number)...");
      delete payload.rera_number;
      delete payload.khasra_number;

      const retry = await supabase
        .from("listings")
        .insert(payload)
        .select()
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("addListing error:", {
        message: error.message,
        details: error.details,
        hint:    error.hint,
        code:    error.code,
      });
      return null;
    }

    const newListing = mapDbToListing(data as DbListing);
    setListings((prev) => {
      const updated = [newListing, ...prev];
      try { localStorage.setItem("terraListingsCache", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newListing;
  }, []);

  const updateListing = React.useCallback(async (
    id: string,
    updates: Partial<Listing>
  ): Promise<boolean> => {
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title             !== undefined) patch.title              = updates.title;
    if (updates.type              !== undefined) patch.type               = updates.type;
    if (updates.area              !== undefined) patch.area               = updates.area;
    if (updates.price             !== undefined) patch.price              = updates.price;
    if (updates.description       !== undefined) patch.description        = updates.description;
    if (updates.lat               !== undefined) patch.lat                = updates.lat;
    if (updates.lng               !== undefined) patch.lng                = updates.lng;
    if (updates.boundary          !== undefined) patch.boundary           = updates.boundary;
    if (updates.images            !== undefined) patch.images             = updates.images;
    if (updates.status            !== undefined) patch.status             = updates.status;
    if (updates.reraNumber        ?.trim())      patch.rera_number        = updates.reraNumber.trim();
    if (updates.khasraNumber      ?.trim())      patch.khasra_number      = updates.khasraNumber.trim();
    if (updates.rejectionReason   ?.trim())      patch.rejection_reason   = updates.rejectionReason.trim();
    if (updates.suspicionReason   ?.trim())      patch.suspicion_reason   = updates.suspicionReason.trim();

    let { error } = await supabase.from("listings").update(patch).eq("id", id);

    // Fallback: If PostgREST schema cache fails due to missing optional columns (PGRST204)
    if (error && (error.code === "PGRST204" || error.message?.includes("Could not find"))) {
      console.warn("Retrying updateListing without extra extended columns...");
      delete patch.rera_number;
      delete patch.khasra_number;
      delete patch.rejection_reason;
      delete patch.suspicion_reason;

      const retry = await supabase.from("listings").update(patch).eq("id", id);
      error = retry.error;
    }

    if (error) {
      console.error("updateListing error:", {
        message: error.message,
        details: error.details,
        hint:    error.hint,
        code:    error.code,
      });
      return false;
    }

    setListings((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
      try { localStorage.setItem("terraListingsCache", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return true;
  }, []);

  const deleteListing = React.useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      console.error("deleteListing error:", {
        message: error.message,
        details: error.details,
        hint:    error.hint,
        code:    error.code,
      });
      return false;
    }
    setListings((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      try { localStorage.setItem("terraListingsCache", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return true;
  }, []);

  const setListingStatus = React.useCallback(async (
    id: string,
    status: Listing["status"],
    reason?: string
  ): Promise<boolean> => {
    const updates: Partial<Listing> = { status };
    if (status === "rejected")  updates.rejectionReason = reason || "";
    if (status === "suspected") updates.suspicionReason = reason || "";
    if (status === "verified" || status === "unverified") {
      updates.rejectionReason = undefined;
      updates.suspicionReason = undefined;
    }
    return updateListing(id, updates);
  }, [updateListing]);

  const verifyListing = React.useCallback(async (
    id: string,
    status: Listing["status"]
  ): Promise<boolean> => setListingStatus(id, status), [setListingStatus]);

  return {
    listings,
    isLoading,
    addListing,
    updateListing,
    deleteListing,
    verifyListing,
    setListingStatus,
    refetch: fetchListings,
  };
}
