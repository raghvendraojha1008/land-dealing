import * as React from "react";
import { useState, useEffect } from "react";
import {
  ArrowLeft, ZoomIn, ZoomOut, X,
  ChevronLeft, ChevronRight,
  MapPin, Ruler, FileText, Download,
  MessageSquare, Heart, Share2,
  Check, User, Building2, UserCheck,
} from "lucide-react";
import { Listing, formatIndianPrice, pricePerSqFt, listingAge, STATUS_CONFIG } from "@/types";
import { EmiCalculator } from "@/components/EmiCalculator";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ReraBadge } from "@/components/ReraBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

interface SellerProfile {
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string | null;
}

interface ListingDetailProps {
  listing: Listing;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onContactSeller: () => void;
  onDownloadDoc: (doc: { name: string; url?: string; mock?: boolean }) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const a = json.address || {};
    const parts = [a.village || a.town || a.city_district || a.city, a.state_district || a.county, a.state].filter(Boolean);
    return parts.slice(0, 3).join(", ") || null;
  } catch { return null; }
}

const TYPE_COLORS: Record<string, string> = {
  residential: "bg-blue-500",
  agricultural: "bg-green-500",
  commercial: "bg-purple-500",
};

function getSellerTypeLabel(listing: Listing): { label: string; icon: React.ReactNode } {
  const hasBoundary = listing.boundary && listing.boundary.length > 0;
  if (listing.type === "agricultural" || hasBoundary) return { label: "Owner direct", icon: <UserCheck size={13} /> };
  if (listing.type === "commercial") return { label: "Developer / Broker", icon: <Building2 size={13} /> };
  return { label: "Owner / Broker", icon: <User size={13} /> };
}

export function ListingDetail({
  listing, isFavorite, onBack, onToggleFavorite, onContactSeller, onDownloadDoc,
}: ListingDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  const images = listing.images.length > 0 ? listing.images
    : ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"];

  const ppsf = pricePerSqFt(listing);
  const age = listingAge(listing.createdAt);
  const sellerType = getSellerTypeLabel(listing);
  const statusCfg = STATUS_CONFIG[listing.status];

  usePageMeta({
    title: `${listing.title} | TerraMap`,
    description: `${formatIndianPrice(listing.price)} · ${listing.area.toLocaleString("en-IN")} sq ft · ${listing.type}`,
    image: listing.images[0],
  });

  useEffect(() => {
    if (listing.lat && listing.lng) reverseGeocode(listing.lat, listing.lng).then(setAddress);
  }, [listing.lat, listing.lng]);

  useEffect(() => {
    if (!listing.sellerId) return;
    supabase.from("profiles").select("name, avatar_url, phone, created_at")
      .eq("id", listing.sellerId).single()
      .then(({ data }) => { if (data) setSellerProfile(data as SellerProfile); });
  }, [listing.sellerId]);

  const handleShare = async () => {
    const shareText = [listing.title, `${formatIndianPrice(listing.price)} · ${listing.area.toLocaleString("en-IN")} sq ft`, address || ""].filter(Boolean).join("\n");
    const shareUrl = window.location.href;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: listing.title, text: shareText, url: shareUrl }); return; }
      catch (e: any) { if (e?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); setShareCopied(true); setTimeout(() => setShareCopied(false), 2500); }
    catch { window.prompt("Copy this link:", shareUrl); }
  };

  const openLightbox = (i: number) => { setLightboxIndex(i); setZoom(1); setIsLightboxOpen(true); };
  const closeLightbox = () => { setIsLightboxOpen(false); setZoom(1); };
  const lightboxNext = () => { setLightboxIndex((p) => (p + 1) % images.length); setZoom(1); };
  const lightboxPrev = () => { setLightboxIndex((p) => (p - 1 + images.length) % images.length); setZoom(1); };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "+" || e.key === "=") setZoom((p) => Math.min(p + 0.5, 4));
      if (e.key === "-") setZoom((p) => Math.max(p - 0.5, 0.5));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isLightboxOpen]);

  const memberSince = sellerProfile?.created_at
    ? new Date(sellerProfile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header — select-none on all chrome */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border select-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition font-medium">
            <ArrowLeft size={20} /> Back to Map
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => onToggleFavorite(listing.id)} className={`p-2.5 rounded-full transition ${isFavorite ? "bg-red-100 text-red-500" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition">
              {shareCopied ? <Check size={20} className="text-green-600" /> : <Share2 size={20} />}
            </button>
            {shareCopied && <span className="text-xs font-semibold text-green-600">Copied!</span>}
          </div>
        </div>
      </div>

      {/* Suspected warning banner — visible to all users */}
      {listing.status === "suspected" && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <span className="text-orange-600 text-lg flex-shrink-0">⚠</span>
            <div>
              <p className="text-sm font-bold text-orange-800">This listing is under investigation</p>
              <p className="text-xs text-orange-700 mt-0.5">
                Our team is reviewing this listing. Proceed with caution and do not make any payments without independent verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rejected notice for seller */}
      {listing.status === "rejected" && listing.rejectionReason && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm font-bold text-red-800">Listing rejected by admin</p>
            <p className="text-xs text-red-700 mt-0.5">Reason: {listing.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left: images + description + docs ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero image */}
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[16/10]">
              <img src={images[currentImageIndex]} alt={listing.title} className="w-full h-full object-cover cursor-pointer" onClick={() => openLightbox(currentImageIndex)} />
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"><ChevronLeft size={24} /></button>
                  <button onClick={() => setCurrentImageIndex((p) => (p + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"><ChevronRight size={24} /></button>
                </>
              )}
              <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium select-none">{currentImageIndex + 1} / {images.length}</div>
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 select-none"><ZoomIn size={14} /> Click to zoom</div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${idx === currentImageIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description — select-text so buyers can copy */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-xl font-bold text-card-foreground mb-4 select-none">Description</h2>
              <p className="text-muted-foreground leading-relaxed select-text">
                {listing.description || "No description provided."}
              </p>
            </div>

            {/* Documents */}
            {listing.documents?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2 select-none">
                  <FileText size={20} className="text-primary" /> Documents
                </h2>
                <div className="space-y-2">
                  {listing.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                      <span className="text-foreground font-medium select-text">{doc.name}</span>
                      <button onClick={() => onDownloadDoc(doc)} className="text-primary hover:text-primary/80 transition flex items-center gap-1.5 text-sm font-medium select-none">
                        <Download size={16} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">

              {/* Status badges row — select-none */}
              <div className="flex items-center justify-between mb-3 select-none">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase text-white ${TYPE_COLORS[listing.type] || "bg-gray-500"}`}>
                  {listing.type}
                </span>
                <StatusBadge status={listing.status} size="sm" />
              </div>

              {/* Seller type badge */}
              <div className="flex items-center gap-1.5 mb-3 select-none">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  {sellerType.icon} {sellerType.label}
                </span>
              </div>

              {/* Title — select-text */}
              <h1 className="text-2xl font-bold text-card-foreground mb-1 select-text">{listing.title}</h1>

              {/* Address — select-text */}
              <p className="text-muted-foreground text-sm flex items-center gap-1 mb-1 select-text">
                <MapPin size={14} className="flex-shrink-0" />
                {address ?? (listing.lat ? `${listing.lat.toFixed(4)}, ${listing.lng?.toFixed(4)}` : "Location not set")}
              </p>
              {age && <p className="text-xs text-muted-foreground mb-4 select-none">{age}</p>}

              {/* Price — select-text */}
              <div className="bg-primary/10 rounded-xl p-4 mb-3">
                <p className="text-sm text-muted-foreground mb-1 select-none">Price</p>
                <p className="text-3xl font-bold text-primary select-text">{formatIndianPrice(listing.price)}</p>
                {ppsf > 0 && <p className="text-sm text-primary/70 mt-1 font-medium select-text">₹{ppsf.toLocaleString("en-IN")} / sq ft</p>}
              </div>

              {/* Area — select-text */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center select-none">
                  <Ruler size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground select-none">Area</p>
                  <p className="font-bold text-card-foreground select-text">{listing.area.toLocaleString("en-IN")} sq ft</p>
                </div>
              </div>

              {/* RERA badge */}
              <div className="mb-4 select-none">
                <ReraBadge reraNumber={listing.reraNumber} size="lg" />
              </div>

              {/* Suspicion reason visible to user */}
              {listing.status === "suspected" && listing.suspicionReason && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 select-text">
                  <span className="font-bold">Admin note: </span>{listing.suspicionReason}
                </div>
              )}

              {/* CTA buttons — select-none */}
              <div className="space-y-2 select-none">
                <button onClick={onContactSeller} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
                  <MessageSquare size={18} /> Message Seller
                </button>
                <WhatsAppButton sellerId={listing.sellerId} listingTitle={listing.title} listingPrice={listing.price} listingArea={listing.area} />
              </div>
            </div>

            {/* Seller profile card — select-none for chrome, select-text for name */}
            {sellerProfile && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 select-none">Listed by</p>
                <div className="flex items-center gap-3">
                  {sellerProfile.avatar_url ? (
                    <img src={sellerProfile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center select-none">
                      <User size={22} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-card-foreground select-text">{sellerProfile.name || "Seller"}</p>
                    {memberSince && <p className="text-xs text-muted-foreground mt-0.5 select-none">Member since {memberSince}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* EMI Calculator */}
            <EmiCalculator propertyPrice={listing.price} />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"><X size={32} /></button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 z-10 select-none">
            <button onClick={() => setZoom(p => Math.max(p - 0.5, 0.5))} disabled={zoom <= 0.5} className="text-white/80 hover:text-white p-1 disabled:opacity-30"><ZoomOut size={20} /></button>
            <span className="text-white font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(p => Math.min(p + 0.5, 4))} disabled={zoom >= 4} className="text-white/80 hover:text-white p-1 disabled:opacity-30"><ZoomIn size={20} /></button>
          </div>
          {images.length > 1 && (
            <>
              <button onClick={lightboxPrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full z-10"><ChevronLeft size={32} /></button>
              <button onClick={lightboxNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full z-10"><ChevronRight size={32} /></button>
            </>
          )}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
            <img src={images[lightboxIndex]} alt={listing.title} className="max-w-none transition-transform duration-200" style={{ transform: `scale(${zoom})` }} draggable={false} />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full font-medium z-10 select-none">{lightboxIndex + 1} / {images.length}</div>
          <div className="absolute bottom-4 right-4 text-white/50 text-sm z-10 select-none">ESC · arrows · +/−</div>
        </div>
      )}
    </div>
  );
}
