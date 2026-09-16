// ─── Core domain types ────────────────────────────────────────────────────────

export type ListingType = "residential" | "agricultural" | "commercial";
export type ListingStatus = "verified" | "unverified" | "rejected" | "suspected";
export type ViewType = "map" | "dashboard" | "compare" | "listing-detail";
export type NotificationType = "success" | "error" | "warning" | "info";

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  type: ListingType;
  area: number;
  price: number;
  description: string;
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  boundary: { lat: number; lng: number }[];
  images: string[];
  documents: { name: string; url?: string; mock?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
  suspicionReason?: string;
  reraNumber?: string;
}

export interface Inquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  buyerId?: string;
  buyerName: string;
  buyerContact: string;
  message: string;
  date: string;
}

export interface Message {
  id: string;
  inquiryId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  createdAt: string;
}

export interface User {
  role: "buyer" | "seller" | "admin";
  name: string;
}

export interface Filters {
  type: "all" | ListingType;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
}

export interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface ListingValidationErrors {
  title?: string;
  price?: string;
  area?: string;
  location?: string;
}

export function validateListing(listing: Partial<Listing>): ListingValidationErrors {
  const errors: ListingValidationErrors = {};
  if (!listing.title?.trim()) errors.title = "Property title is required.";
  else if (listing.title.trim().length < 5) errors.title = "Title must be at least 5 characters.";
  if (!listing.price || listing.price <= 0) errors.price = "Price must be greater than zero.";
  if (!listing.area || listing.area <= 0) errors.area = "Area must be greater than zero.";
  if (!listing.lat || !listing.lng) errors.location = "Please pin a location on the map.";
  return errors;
}

export function pricePerSqFt(listing: Listing): number {
  if (!listing.area || listing.area === 0) return 0;
  return Math.round((listing.price / listing.area) * 100) / 100;
}

export function formatIndianPrice(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function listingAge(createdAt?: string): string {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Listed today";
  if (days === 1) return "Listed yesterday";
  if (days < 30) return `Listed ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Listed ${months}mo ago`;
  return `Listed ${Math.floor(months / 12)}yr ago`;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<ListingStatus, { label: string; classes: string; dotClass: string }> = {
  verified:  { label: "Verified",  classes: "bg-green-100 text-green-800 border-green-200",  dotClass: "bg-green-500" },
  unverified:{ label: "Pending",   classes: "bg-amber-100 text-amber-800 border-amber-200",  dotClass: "bg-amber-400" },
  rejected:  { label: "Rejected",  classes: "bg-red-100 text-red-800 border-red-200",        dotClass: "bg-red-500"   },
  suspected: { label: "Suspected", classes: "bg-orange-100 text-orange-800 border-orange-200", dotClass: "bg-orange-500" },
};
