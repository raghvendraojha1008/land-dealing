import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Listing } from "@/types";
import { AppRole } from "./useAuth";

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
    rejectionReason: db.rejection_reason ?? undefined,
    suspicionReason: db.suspicion_reason ?? undefined,
  };
}

export function useListings(userId: string | null, roles: AppRole[]) {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchListings = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Log every field so the real cause (RLS denial, missing column, type
        // mismatch) is visible in the browser console instead of just "Object".
        console.error("fetchListings error:", {
          message: error.message,
          details: error.details,
          hint:    error.hint,
          code:    error.code,
          stringified:  JSON.stringify(error, null, 2),
        });
        return;
      }
      setListings((data || []).map((l) => mapDbToListing(l as DbListing)));
    } catch (err) {
      console.error("fetchListings threw:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — re-runs when the logged-in user changes.
  React.useEffect(() => { fetchListings(); }, [fetchListings, userId]);

  // Realtime: re-fetch on any listings table change so other users see new
  // listings immediately without a page refresh.
  React.useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => { fetchListings(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchListings]);

  const addListing = React.useCallback(async (
    listing: Omit<Listing, "id" | "sellerId" | "status">,
    sellerId: string
  ): Promise<Listing | null> => {

    // Build the payload explicitly — avoids sending `undefined` values which
    // the PostgREST parser treats as an unknown column and returns 400.
    // JSON/array columns get null rather than [] when empty, which is safe
    // for jsonb columns regardless of whether they have a NOT NULL constraint.
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
      rera_number: listing.reraNumber?.trim() || null,
      status:      "unverified",
    };

    // Uncomment to inspect the exact payload in the console while debugging:
    // console.log("[addListing] payload →", payload);

    const { data, error } = await supabase
      .from("listings")
      .insert(payload)
      .select()
      .single();

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
    setListings((prev) => [newListing, ...prev]);
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
    if (updates.reraNumber        !== undefined) patch.rera_number        = updates.reraNumber || null;
    if (updates.rejectionReason   !== undefined) patch.rejection_reason   = updates.rejectionReason;
    if (updates.suspicionReason   !== undefined) patch.suspicion_reason   = updates.suspicionReason;

    const { error } = await supabase.from("listings").update(patch).eq("id", id);
    if (error) {
      console.error("updateListing error:", {
        message: error.message,
        details: error.details,
        hint:    error.hint,
        code:    error.code,
      });
      return false;
    }

    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
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
    setListings((prev) => prev.filter((l) => l.id !== id));
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
