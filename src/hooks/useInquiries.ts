/**
 * useInquiries.ts — fixes applied:
 *
 * FIX 3 (DATA LEAK): The original query was:
 *   .from("inquiries").select("*")   // no filter!
 *
 * This returned ALL inquiries from ALL users to whoever was logged in.
 * Every buyer's name, phone number, email, and message was visible to
 * every other buyer and seller.
 *
 * Fix: scope the query to only rows where the current user is buyer OR seller.
 * Supabase RLS policies should enforce this too — but this client-side filter
 * is an important defence-in-depth measure.
 *
 * Also fixed: id was cast `as unknown as number`. Removed — id is string (UUID).
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Inquiry } from "@/types";

interface DbInquiry {
  id: string;
  listing_id: string;
  listing_title: string;
  seller_id: string;
  buyer_id: string | null;
  name: string;
  contact: string;
  message: string;
  created_at: string | null;
}

function mapDbToInquiry(db: DbInquiry): Inquiry {
  return {
    id: db.id,                          // ← FIX: was `db.id as unknown as number`
    listingId: db.listing_id,           // ← FIX: was `as unknown as number`
    listingTitle: db.listing_title,
    sellerId: db.seller_id,
    buyerId: db.buyer_id || undefined,
    buyerName: db.name,
    buyerContact: db.contact,
    message: db.message || "",
    date: new Date(db.created_at ?? Date.now()).toLocaleDateString("en-IN"),
  };
}

export function useInquiries(userId: string | null) {
  const [inquiries, setInquiries] = React.useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [submittingInquiries, setSubmittingInquiries] = React.useState<Set<string>>(new Set());

  const fetchInquiries = React.useCallback(async () => {
    if (!userId) {
      setInquiries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // FIX: was `.select("*")` with no filter — returned everyone's inquiries.
      // Now we only fetch rows where this user is the buyer OR the seller.
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching inquiries:", error);
        return;
      }

      setInquiries((data || []).map((d) => mapDbToInquiry(d as DbInquiry)));
    } catch (err) {
      console.error("Error in fetchInquiries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const addInquiry = React.useCallback(
    async (
      listingId: string,
      listingTitle: string,
      sellerId: string,
      buyerName: string,
      buyerContact: string,
      message: string
    ): Promise<boolean> => {
      if (!userId) return false;

      const inquiryKey = `${listingId}-${userId}`;
      if (submittingInquiries.has(inquiryKey)) return false;

      setSubmittingInquiries((prev) => new Set(prev).add(inquiryKey));

      try {
        const { data, error } = await supabase
          .from("inquiries")
          .insert({
            listing_id: listingId,
            listing_title: listingTitle,
            seller_id: sellerId,
            buyer_id: userId,
            name: buyerName,
            contact: buyerContact,
            message,
          })
          .select()
          .single();

        if (error) {
          console.error("Error adding inquiry:", error);
          return false;
        }

        setInquiries((prev) => [mapDbToInquiry(data as DbInquiry), ...prev]);
        return true;
      } finally {
        setSubmittingInquiries((prev) => {
          const next = new Set(prev);
          next.delete(inquiryKey);
          return next;
        });
      }
    },
    [userId, submittingInquiries]
  );

  const deleteInquiry = React.useCallback(async (inquiryId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("inquiries")
      .delete()
      .eq("id", inquiryId);

    if (error) {
      console.error("Error deleting inquiry:", error);
      return false;
    }

    setInquiries((prev) => prev.filter((inq) => inq.id !== inquiryId));
    return true;
  }, []);

  return {
    inquiries,
    isLoading,
    addInquiry,
    deleteInquiry,
    refetch: fetchInquiries,
  };
}
