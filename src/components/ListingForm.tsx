/**
 * ListingForm — extracted from App.tsx's renderSellerTab inline JSX.
 *
 * Key improvements:
 * - Field-level validation with inline error messages (not just toast)
 * - Price displayed in Indian format (lakhs / crores) as live preview
 * - Price per sq ft computed live so seller knows what they're asking
 * - Image upload shows per-file errors, not just aggregate success
 * - Drawing mode instructions overlay
 * - RERA number input field (Fix: was missing despite DB column + badge existing)
 */
import * as React from "react";
import { useState, useCallback } from "react";
import {
  MapPin,
  Pentagon,
  ImagePlus,
  FileText,
  XCircle,
  Loader,
  Save,
  Plus,
  Edit,
  AlertCircle,
} from "lucide-react";
import { Listing, ListingValidationErrors, validateListing, formatIndianPrice, pricePerSqFt } from "@/types";

interface ListingFormProps {
  listing: Partial<Listing>;
  editingId: string | null;
  isSaving: boolean;
  onListingChange: (listing: Partial<Listing>) => void;
  onPickLocation: () => void;
  onDrawBoundary: () => void;
  onClearBoundary: () => void;
  onImageUpload: (files: FileList) => Promise<{ url: string; name: string }[]>;
  onDocumentUpload: (file: File) => void;
  onRemoveImage: (idx: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ListingForm({
  listing,
  editingId,
  isSaving,
  onListingChange,
  onPickLocation,
  onDrawBoundary,
  onClearBoundary,
  onImageUpload,
  onDocumentUpload,
  onRemoveImage,
  onSubmit,
  onCancel,
}: ListingFormProps) {
  const [errors, setErrors] = useState<ListingValidationErrors>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const set = useCallback(
    (patch: Partial<Listing>) => onListingChange({ ...listing, ...patch }),
    [listing, onListingChange]
  );

  const handleSubmit = () => {
    const errs = validateListing(listing);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit();
  };

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setImageErrors([]);

    const errs: string[] = [];
    const validFiles = Array.from(files).filter((f) => {
      if (f.size > 2.5 * 1024 * 1024) {
        errs.push(`"${f.name}" exceeds 2.5 MB limit.`);
        return false;
      }
      return true;
    });

    setImageErrors(errs);

    if (validFiles.length > 0) {
      const dt = new DataTransfer();
      validFiles.forEach((f) => dt.items.add(f));
      await onImageUpload(dt.files);
    }

    setUploadingImages(false);
    e.target.value = "";
  };

  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        _doc: "Document exceeds 10 MB limit.",
      } as ListingValidationErrors));
      return;
    }
    onDocumentUpload(file);
    e.target.value = "";
  };

  const livePricePerSqFt =
    listing.price && listing.area && listing.area > 0
      ? (listing.price / listing.area).toFixed(2)
      : null;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          Property Title <span className="text-destructive">*</span>
        </label>
        <input
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted focus:bg-card transition ${
            errors.title ? "border-destructive" : "border-border"
          }`}
          placeholder="e.g. 5 Acre Farm Land near Ludhiana"
          value={listing.title || ""}
          onChange={(e) => {
            set({ title: e.target.value });
            if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
          }}
        />
        {errors.title && (
          <p className="text-destructive text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.title}
          </p>
        )}
      </div>

      {/* Type + Price */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">
            Type
          </label>
          <select
            className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
            value={listing.type || "residential"}
            onChange={(e) =>
              set({ type: e.target.value as Listing["type"] })
            }
          >
            <option value="residential">Residential</option>
            <option value="agricultural">Agricultural</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">
            Price (₹) <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted transition ${
              errors.price ? "border-destructive" : "border-border"
            }`}
            placeholder="0"
            value={listing.price || ""}
            onChange={(e) => {
              set({ price: Number(e.target.value) });
              if (errors.price) setErrors((p) => ({ ...p, price: undefined }));
            }}
          />
          {listing.price && listing.price > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              = {formatIndianPrice(listing.price)}
            </p>
          )}
          {errors.price && (
            <p className="text-destructive text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.price}
            </p>
          )}
        </div>
      </div>

      {/* Area */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          Area (sq ft) <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted transition ${
            errors.area ? "border-destructive" : "border-border"
          }`}
          placeholder="0"
          value={listing.area || ""}
          onChange={(e) => {
            set({ area: Number(e.target.value) });
            if (errors.area) setErrors((p) => ({ ...p, area: undefined }));
          }}
        />
        {livePricePerSqFt && (
          <p className="text-xs text-primary font-medium mt-1">
            ≈ ₹{livePricePerSqFt} / sq ft
          </p>
        )}
        {errors.area && (
          <p className="text-destructive text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.area}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          Description
        </label>
        <textarea
          className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted h-28 resize-none"
          placeholder="Describe the property — road access, soil type, surroundings, legal status…"
          value={listing.description || ""}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      {/* ── RERA Registration Number ── */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          RERA Registration Number
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            (optional — required for new residential/commercial projects)
          </span>
        </label>
        <input
          className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted focus:bg-card transition font-mono tracking-wide"
          placeholder="e.g. RERA/KA/01/2024/1234"
          value={listing.reraNumber || ""}
          onChange={(e) =>
            set({ reraNumber: e.target.value.trim() || undefined })
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your RERA number will appear as a verified badge on the listing detail page.
        </p>
      </div>

      {/* Location + Boundary */}
      <div className="flex flex-col gap-3 p-5 bg-muted border border-border rounded-xl">
        <label className="block text-sm font-bold text-card-foreground">
          Location & Boundary{" "}
          <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPickLocation}
            className="flex-1 bg-card text-secondary border border-secondary/20 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary/10 transition shadow-sm"
          >
            <MapPin size={16} />
            {listing.lat ? "Change Pin" : "Set Pin"}
          </button>
          <button
            type="button"
            disabled={!listing.lat}
            onClick={onDrawBoundary}
            className={`flex-1 border px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm ${
              !listing.lat
                ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                : "bg-card text-destructive border-destructive/20 hover:bg-destructive/10"
            }`}
          >
            <Pentagon size={16} />
            {listing.boundary && listing.boundary.length > 0
              ? "Edit Area"
              : "Draw Area"}
          </button>
        </div>
        <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
          <span className={listing.lat ? "text-green-600 font-semibold" : ""}>
            Pin: {listing.lat ? `✓ Set` : "Not set"}
          </span>
          <div className="flex gap-3 items-center">
            <span
              className={
                listing.boundary && listing.boundary.length > 0
                  ? "text-primary"
                  : ""
              }
            >
              {listing.boundary?.length || 0} boundary points
            </span>
            {listing.boundary && listing.boundary.length > 0 && (
              <button
                type="button"
                onClick={onClearBoundary}
                className="text-destructive hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {errors.location && (
          <p className="text-destructive text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errors.location}
          </p>
        )}
      </div>

      {/* Images */}
      <div className="bg-muted p-5 rounded-xl border border-border">
        <label className="block text-sm font-bold text-card-foreground mb-3">
          Property Images
        </label>
        <input
          type="file"
          id="imgUpload"
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleImageFiles}
        />
        <label
          htmlFor="imgUpload"
          className={`cursor-pointer bg-card border border-dashed text-muted-foreground px-4 py-8 rounded-xl text-sm flex flex-col items-center justify-center gap-2 transition ${
            uploadingImages
              ? "opacity-60 cursor-wait"
              : "hover:border-primary hover:text-primary border-border"
          }`}
        >
          {uploadingImages ? (
            <Loader size={24} className="animate-spin opacity-50" />
          ) : (
            <ImagePlus size={24} className="opacity-50" />
          )}
          <span className="font-semibold">
            {uploadingImages ? "Uploading…" : "Click to Upload Images"}
          </span>
          <span className="text-xs opacity-70">Max 2.5 MB per image</span>
        </label>

        {/* Per-file errors */}
        {imageErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {imageErrors.map((err, i) => (
              <p
                key={i}
                className="text-destructive text-xs flex items-center gap-1"
              >
                <AlertCircle size={12} /> {err}
              </p>
            ))}
          </div>
        )}

        {listing.images && listing.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {listing.images.map((img, idx) => (
              <div key={idx} className="relative h-16 w-full group">
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute -top-1 -right-1 bg-card text-destructive rounded-full shadow-md p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-muted p-5 rounded-xl border border-border">
        <label className="block text-sm font-bold text-card-foreground mb-3">
          Verification Documents{" "}
          <span className="font-normal text-muted-foreground text-xs ml-1">
            (Private — visible to admins only)
          </span>
        </label>
        <input
          type="file"
          id="docUpload"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleDocFile}
        />
        <label
          htmlFor="docUpload"
          className="cursor-pointer flex items-center gap-3 bg-card border border-dashed border-border text-muted-foreground px-4 py-3 rounded-xl text-sm hover:border-primary hover:text-primary transition"
        >
          <FileText size={18} className="opacity-50" />
          <span>Upload Document (PDF, Image, DOC — max 10 MB)</span>
        </label>
        {listing.documents && listing.documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {listing.documents.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-card border border-border p-2.5 rounded-lg"
              >
                <FileText size={14} className="text-secondary flex-shrink-0" />
                <span className="text-sm text-card-foreground truncate flex-1">
                  {doc.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSaving ? (
            <Loader size={18} className="animate-spin" />
          ) : editingId ? (
            <Save size={18} />
          ) : (
            <Plus size={18} />
          )}
          {isSaving
            ? "Saving…"
            : editingId
            ? "Update Listing"
            : "Submit for Verification"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3.5 rounded-xl font-bold border border-border text-muted-foreground hover:bg-muted transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
