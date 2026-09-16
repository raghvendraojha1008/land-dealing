/**
 * AdminDocReviewModal
 *
 * Features:
 * 1. Status toggles: Verify ↔ Unverify, Reject (with reason), Suspect (with reason)
 * 2. In-page document viewer — PDFs in iframe, images inline; no forced download
 * 3. Reason shown to seller is saved to DB and visible in their dashboard
 * 4. Close returns to dashboard state without page refresh
 */
import * as React from "react";
import { useState } from "react";
import {
  FileText, XCircle, CheckCircle, AlertTriangle,
  Download, ShieldOff, Eye, ArrowLeft, X,
  Search, Shield,
} from "lucide-react";
import { Listing, STATUS_CONFIG } from "@/types";

interface AdminDocReviewModalProps {
  listing: Listing;
  onSetStatus: (id: string, status: Listing["status"], reason?: string) => void;
  onClose: () => void;
}

type DocViewerState = { url: string; name: string; type: "pdf" | "image" | "other" } | null;

function guessDocType(name: string, url?: string): "pdf" | "image" | "other" {
  const src = (url || name).toLowerCase();
  if (src.endsWith(".pdf") || src.includes("application/pdf")) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp)/.test(src)) return "image";
  return "other";
}

export function AdminDocReviewModal({ listing, onSetStatus, onClose }: AdminDocReviewModalProps) {
  const [reasonText, setReasonText] = useState(listing.rejectionReason || listing.suspicionReason || "");
  const [pendingStatus, setPendingStatus] = useState<Listing["status"] | null>(null);
  const [docViewer, setDocViewer] = useState<DocViewerState>(null);

  const cfg = STATUS_CONFIG[listing.status];

  const handleConfirm = () => {
    if (!pendingStatus) return;
    onSetStatus(listing.id, pendingStatus, reasonText.trim() || undefined);
    setPendingStatus(null);
  };

  const openDoc = (doc: { name: string; url?: string; mock?: boolean }) => {
    if (!doc.url) return;
    const type = guessDocType(doc.name, doc.url);
    setDocViewer({ url: doc.url, name: doc.name, type });
  };

  const downloadDoc = (doc: { name: string; url?: string }) => {
    if (!doc.url) return;
    const a = document.createElement("a");
    a.href = doc.url; a.download = doc.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── In-page doc viewer ────────────────────────────────────────────────────
  if (docViewer) {
    return (
      <div
        className="fixed inset-0 bg-foreground/70 backdrop-blur-sm flex items-center justify-center z-[700] p-4"
        onClick={() => setDocViewer(null)}
      >
        <div
          className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Viewer header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted">
            <button
              onClick={() => setDocViewer(null)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft size={16} /> Back to Review
            </button>
            <span className="flex-1 text-sm font-medium text-card-foreground truncate">
              {docViewer.name}
            </span>
            <button
              onClick={() => downloadDoc({ name: docViewer.name, url: docViewer.url })}
              className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-secondary/80 transition"
            >
              <Download size={14} /> Download
            </button>
            <button onClick={() => setDocViewer(null)} className="p-1 hover:bg-card rounded-lg transition">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Viewer body */}
          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-2" style={{ minHeight: 0 }}>
            {docViewer.type === "pdf" && (
              <iframe
                src={docViewer.url}
                title={docViewer.name}
                className="w-full rounded-xl border border-border bg-white"
                style={{ height: "70vh" }}
              />
            )}
            {docViewer.type === "image" && (
              <img
                src={docViewer.url}
                alt={docViewer.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow"
              />
            )}
            {docViewer.type === "other" && (
              <div className="text-center text-muted-foreground py-12">
                <FileText size={48} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium mb-3">Can't preview this file type</p>
                <button
                  onClick={() => downloadDoc({ name: docViewer.name, url: docViewer.url })}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
                >
                  <Download size={16} /> Download to view
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Reason / confirm panel ────────────────────────────────────────────────
  if (pendingStatus && (pendingStatus === "rejected" || pendingStatus === "suspected")) {
    const isReject = pendingStatus === "rejected";
    return (
      <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center z-[600] p-4" onClick={() => setPendingStatus(null)}>
        <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b border-border bg-muted flex items-center gap-3">
            <button onClick={() => setPendingStatus(null)} className="text-muted-foreground hover:text-foreground transition">
              <ArrowLeft size={18} />
            </button>
            <h3 className="font-bold text-card-foreground">
              {isReject ? "Reject listing" : "Flag as suspected"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              {isReject
                ? "Provide a reason so the seller knows what to correct. This will be shown in their dashboard."
                : "Describe why this listing is under suspicion. The buyer will see a warning badge. The seller will be notified."}
            </p>
            <textarea
              autoFocus
              className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted h-28 resize-none text-sm"
              placeholder={isReject
                ? "e.g. Title deed is not legible, missing RERA number…"
                : "e.g. Coordinates do not match the described location…"}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className={`flex-1 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 ${
                  isReject
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {isReject ? <XCircle size={16} /> : <Search size={16} />}
                {isReject ? "Confirm Rejection" : "Confirm Flag"}
              </button>
              <button onClick={() => setPendingStatus(null)} className="px-4 py-3 rounded-xl font-bold border border-border text-muted-foreground hover:bg-muted transition text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main modal ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center z-[600] p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-border bg-muted flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <FileText className="text-secondary flex-shrink-0" size={20} /> Review Documents
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{listing.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${cfg.classes}`}>
              {cfg.label}
            </span>
            <button onClick={onClose}>
              <XCircle size={22} className="text-muted-foreground hover:text-foreground transition" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Existing reason (rejection / suspicion) */}
          {(listing.rejectionReason || listing.suspicionReason) && (
            <div className={`p-3 rounded-xl border text-sm ${
              listing.status === "rejected"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-orange-50 border-orange-200 text-orange-800"
            }`}>
              <span className="font-semibold">
                {listing.status === "rejected" ? "Rejection reason: " : "Suspicion reason: "}
              </span>
              {listing.rejectionReason || listing.suspicionReason}
            </div>
          )}

          {/* Documents */}
          {listing.documents && listing.documents.length > 0 ? (
            <div className="space-y-2">
              {listing.documents.map((doc, idx) => {
                const canView = !!doc.url && !doc.mock;
                const type = guessDocType(doc.name, doc.url);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                    <FileText size={16} className="text-secondary flex-shrink-0" />
                    <span className="font-medium text-card-foreground text-sm flex-1 truncate">{doc.name}</span>
                    {doc.mock && <span className="text-xs text-muted-foreground">(demo)</span>}
                    <div className="flex gap-1.5">
                      {canView && (
                        <button
                          onClick={() => openDoc(doc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition"
                          title="View in page"
                        >
                          <Eye size={12} /> View
                        </button>
                      )}
                      {doc.url && !doc.mock && (
                        <button
                          onClick={() => downloadDoc(doc)}
                          className="p-1.5 bg-card border border-border text-muted-foreground rounded-lg hover:bg-muted transition"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Verify */}
            <button
              onClick={() => onSetStatus(listing.id, "verified")}
              className="flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm"
            >
              <CheckCircle size={16} /> Verify
            </button>

            {/* Unverify */}
            <button
              onClick={() => onSetStatus(listing.id, "unverified")}
              className="flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition text-sm"
            >
              <ShieldOff size={16} /> Unverify
            </button>

            {/* Mark Suspected */}
            <button
              onClick={() => { setReasonText(listing.suspicionReason || ""); setPendingStatus("suspected"); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 font-bold rounded-xl transition text-sm"
            >
              <Search size={16} /> Mark Suspected
            </button>

            {/* Reject */}
            <button
              onClick={() => { setReasonText(listing.rejectionReason || ""); setPendingStatus("rejected"); }}
              className="flex items-center justify-center gap-2 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 font-bold rounded-xl transition text-sm"
            >
              <XCircle size={16} /> Reject
            </button>
          </div>

          <button onClick={onClose} className="w-full py-2.5 rounded-xl font-semibold border border-border text-muted-foreground hover:bg-muted transition text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
