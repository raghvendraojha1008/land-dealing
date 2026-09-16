/**
 * WhatsAppButton — direct WhatsApp contact for a listing seller.
 *
 * How it works:
 * 1. On mount, fetches the seller's phone number from `profiles` table.
 * 2. If the seller has a phone number → shows a green WhatsApp button that
 *    opens wa.me with a pre-filled message containing the listing title.
 * 3. If no phone number → shows a softer "Ask on WhatsApp" prompt that
 *    opens a generic wa.me link encouraging the seller to add their number,
 *    OR falls back silently (renders nothing) if you prefer.
 *
 * The pre-filled message reads:
 *   "Hi, I'm interested in your property listed on TerraMap:
 *    [title] — ₹[price] | [area] sq ft
 *    Can we discuss further?"
 *
 * Integration: drop inside the ListingDetail sidebar, below the
 * "Message Seller" button.
 *
 *   import { WhatsAppButton } from "@/components/WhatsAppButton";
 *   ...
 *   <WhatsAppButton
 *     sellerId={listing.sellerId}
 *     listingTitle={listing.title}
 *     listingPrice={listing.price}
 *     listingArea={listing.area}
 *   />
 */
import * as React from "react";
import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatIndianPrice } from "@/types";

// WhatsApp SVG icon (official brand icon, inline so no external img needed)
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface WhatsAppButtonProps {
  sellerId: string;
  listingTitle: string;
  listingPrice: number;
  listingArea: number;
}

export function WhatsAppButton({
  sellerId,
  listingTitle,
  listingPrice,
  listingArea,
}: WhatsAppButtonProps) {
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) { setLoading(false); return; }

    supabase
      .from("profiles")
      .select("phone")
      .eq("id", sellerId)
      .single()
      .then(({ data }) => {
        // Normalise: strip spaces/dashes, ensure starts with 91
        if (data?.phone) {
          const cleaned = data.phone.replace(/[\s\-().+]/g, "");
          const normalised = cleaned.startsWith("91")
            ? cleaned
            : cleaned.startsWith("0")
            ? "91" + cleaned.slice(1)
            : "91" + cleaned;
          setPhone(normalised);
        }
        setLoading(false);
      });
  }, [sellerId]);

  // Build pre-filled message
  const message = encodeURIComponent(
    `Hi, I'm interested in your property listed on TerraMap:\n` +
    `*${listingTitle}* — ${formatIndianPrice(listingPrice)} | ${listingArea.toLocaleString("en-IN")} sq ft\n` +
    `Can we discuss further?`
  );

  const waUrl = phone
    ? `https://wa.me/${phone}?text=${message}`
    : null;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-3 text-muted-foreground">
        <Loader size={16} className="animate-spin" />
      </div>
    );
  }

  // No phone number on record
  if (!waUrl) {
    return (
      <div className="w-full text-center text-xs text-muted-foreground py-2 px-4 bg-muted rounded-xl border border-border">
        Seller hasn't added a WhatsApp number yet.
        <br />
        Use the message button above to contact them.
      </div>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="
        w-full flex items-center justify-center gap-2.5
        bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a84f]
        text-white font-bold py-3.5 rounded-xl
        transition-colors duration-150 shadow-sm
        text-sm
      "
      aria-label="Contact seller on WhatsApp"
    >
      <WhatsAppIcon size={20} />
      Chat on WhatsApp
    </a>
  );
}
