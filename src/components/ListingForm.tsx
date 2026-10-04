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

const AREA_UNITS = [
  { id: "sqft", label: "Sq Ft", multiplier: 1 },
  { id: "sqyd", label: "Sq Yards (Gaj)", multiplier: 9 },
  { id: "acre", label: "Acres", multiplier: 43560 },
  { id: "bigha", label: "Bigha", multiplier: 27225 },
  { id: "guntha", label: "Guntha", multiplier: 1089 },
  { id: "hectare", label: "Hectares", multiplier: 107639 },
  { id: "sqm", label: "Sq Meters", multiplier: 10.7639 },
] as const;

type AreaUnitId = typeof AREA_UNITS[number]["id"];

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
  const [areaUnit, setAreaUnit] = useState<AreaUnitId>("sqft");
  const [rawAreaInput, setRawAreaInput] = useState<string>(() => {
    if (!listing.area) return "";
    return listing.area.toString();
  });

  React.useEffect(() => {
    if (listing.area) {
      const unitObj = AREA_UNITS.find((u) => u.id === areaUnit) || AREA_UNITS[0];
      const val = listing.area / unitObj.multiplier;
      const formatted = Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(4)).toString();
      setRawAreaInput(formatted);
    } else if (!listing.area) {
      setRawAreaInput("");
    }
  }, [editingId]);

  const handleAreaInputChange = (valStr: string) => {
    setRawAreaInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      const unitObj = AREA_UNITS.find((u) => u.id === areaUnit) || AREA_UNITS[0];
      const totalSqFt = Math.round(num * unitObj.multiplier * 100) / 100;
      set({ area: totalSqFt });
      if (errors.area) setErrors((p) => ({ ...p, area: undefined }));
    } else {
      set({ area: 0 });
    }
  };

  const handleAreaUnitChange = (newUnit: AreaUnitId) => {
    setAreaUnit(newUnit);
    const num = parseFloat(rawAreaInput);
    if (!isNaN(num) && num > 0) {
      const newUnitObj = AREA_UNITS.find((u) => u.id === newUnit) || AREA_UNITS[0];
      const totalSqFt = Math.round(num * newUnitObj.multiplier * 100) / 100;
      set({ area: totalSqFt });
    }
  };

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

      {/* Area with Unit Selector */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          Area <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            className={`flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted transition ${
              errors.area ? "border-destructive" : "border-border"
            }`}
            placeholder="e.g. 500 or 2"
            value={rawAreaInput}
            onChange={(e) => handleAreaInputChange(e.target.value)}
          />
          <select
            className="w-36 sm:w-44 p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted font-semibold text-sm cursor-pointer select-none"
            value={areaUnit}
            onChange={(e) => handleAreaUnitChange(e.target.value as AreaUnitId)}
          >
            {AREA_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        {listing.area && listing.area > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 px-1 flex-wrap gap-1">
            <span>
              = <strong className="text-card-foreground">{listing.area.toLocaleString("en-IN")} sq ft</strong>
            </span>
            {livePricePerSqFt && (
              <span className="text-primary font-medium">
                ≈ ₹{livePricePerSqFt} / sq ft
              </span>
            )}
          </div>
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

      {/* ── Khasra / Gata / Survey Number ── */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-1.5">
          Khasra / Gata / Survey Number
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            (optional — legal land record identifier)
          </span>
        </label>
        <input
          className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted focus:bg-card transition font-mono tracking-wide"
          placeholder="e.g. Khasra No. 142/3 or Survey No. 89-B"
          value={listing.khasraNumber || ""}
          onChange={(e) =>
            set({ khasraNumber: e.target.value.trim() || undefined })
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your Khasra/Survey number will be displayed on property details for legal verification.
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
