import * as React from "react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import L from "leaflet";
import { Navbar } from "@/components/Navbar";
import { DashboardTabs } from "@/components/DashboardTabs";
import { LeafletMap } from "@/components/LeafletMap";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ListingDetail } from "@/pages/ListingDetail";
import { MessagesSection } from "@/components/MessagesSection";
import { ProfileSection } from "@/components/ProfileSection";
import { Auth } from "@/pages/Auth";
import { ToastStack } from "@/components/ToastStack";
import { ComparePage } from "@/pages/ComparePage";
import { ListingForm } from "@/components/ListingForm";
import { ListingCard } from "@/components/ListingCard";
import { AdminDocReviewModal } from "@/components/AdminDocReviewModal";
import { DrawingOverlay } from "@/components/DrawingOverlay";
import { PageLoader, MapLoadingOverlay } from "@/components/LoadingStates";
import { MyListings } from "@/components/MyListings";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useListings } from "@/hooks/useListings";
import { useInquiries } from "@/hooks/useInquiries";
import { useFavorites } from "@/hooks/useFavorites";
import { useConversations } from "@/hooks/useConversations";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { useSort } from "@/hooks/useSort";
import { SearchPanel } from "@/components/SearchPanel";
import { supabase } from "@/integrations/supabase/client";
import { Listing, validateListing, formatIndianPrice, STATUS_CONFIG } from "@/types";
import {
  Heart, LayoutDashboard, Scale, Mail, MessageSquare,
  MapPin, ShieldCheck, FileText, BarChart3, Download,
  Edit, Trash2, CheckCircle, XCircle, Eye, Search,
  Database, ArrowRight,
} from "lucide-react";

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";

function App() {
  const { user: authUser, profile, roles, isAdmin, isLoading: authLoading, signOut, updateProfile } = useAuth();
  const { listings, isLoading: listingsLoading, addListing, updateListing, deleteListing, setListingStatus } = useListings(authUser?.id || null, roles);
  const { inquiries, addInquiry, deleteInquiry } = useInquiries(authUser?.id || null);
  const { favorites, isFavorite, toggleFavorite, getFavoriteListings } = useFavorites(authUser?.id || null);
  const { conversations, startConversation } = useConversations(authUser?.id || null);
  const totalUnreadMessages = useMemo(() => conversations.reduce((s, c) => s + c.unreadCount, 0), [conversations]);
  const { isLoading: placesLoading, results: placesResults, searchPlaces, getPlaceDetails, clearResults: clearPlacesResults } = useGooglePlaces(GOOGLE_PLACES_API_KEY);

  const {
    view, userMode, dashboardTab,
    selectedListing, detailListing, compareList,
    isPickingLocation, isDrawing, showControls,
    setView, setUserMode, setDashboardTab,
    setSelectedListing, setDetailListing,
    toggleCompare, clearCompare,
    setIsPickingLocation, setIsDrawing,
    toggleControls,
    showNotification, goToMap, goToDashboard,
  } = useAppStore();

  const [isSaving, setIsSaving] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [boundaryRedo, setBoundaryRedo] = useState<{ lat: number; lng: number }[]>([]);
  const [newListing, setNewListing] = useState<Partial<Listing>>(emptyListing());
  const [editingId, setEditingId] = useState<string | null>(null);
  // FIX 3: Track which tab was active before entering edit mode so Cancel can return to it
  const [preEditTab, setPreEditTab] = useState<"buyer" | "seller" | "admin" | "messages">("seller");
  const [reviewingDoc, setReviewingDoc] = useState<Listing | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [filters, setFilters] = useState({ type: "all" as const, minPrice: 0, maxPrice: 1_000_000_000, minArea: 0, maxArea: 5_000_000 });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", variant: "danger" as const, onConfirm: () => {} });

  // FIX 1: flyToTarget state — replaces mapInstance.flyTo() inside setTimeout.
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // SCROLL POSITION FIX:
  // dashboardScrollRef  — attached to the overflow-y-auto dashboard container so we can read/set scrollTop.
  // savedDashboardScroll — persists the scroll position across unmounts (view changes don't reset a ref).
  // When any navigation leaves the dashboard (picking location, drawing boundary), we save scrollTop.
  // When the dashboard remounts (view returns to "dashboard"), we restore it via a useEffect.
  const dashboardScrollRef = useRef<HTMLDivElement>(null);
  const savedDashboardScroll = useRef<number>(0);

  const searchPanelRef = React.useRef<HTMLDivElement>(null);
  const mainSearchPanelRef = React.useRef<HTMLDivElement>(null);

  const userName = profile?.name || authUser?.email || "User";

  const filteredListings = useMemo(() =>
    listings.filter((l) => {
      const matchType = filters.type === "all" || l.type === filters.type;
      const matchPrice = l.price >= filters.minPrice && l.price <= filters.maxPrice;
      const matchArea = l.area >= filters.minArea && l.area <= filters.maxArea;
      const matchStatus = l.status === "verified" || userMode === "admin" || (authUser && l.sellerId === authUser.id);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
      return matchType && matchPrice && matchArea && matchStatus && matchSearch;
    }), [listings, filters, userMode, authUser, searchQuery]);

  const { sorted: sortedListings, sortKey, setSortKey } = useSort(filteredListings);

  const favoriteListingIds = useMemo(() => getFavoriteListings(), [favorites]);
  const favoriteListings = useMemo(() => listings.filter((l) => favoriteListingIds.includes(l.id)), [listings, favoriteListingIds]);
  const buyerInquiries = useMemo(() => inquiries.filter((i) => authUser && i.buyerId === authUser.id), [inquiries, authUser]);
  const sellerInquiries = useMemo(() => inquiries.filter((i) => authUser && i.sellerId === authUser.id), [inquiries, authUser]);
  const myListings = useMemo(() => listings.filter((l) => authUser && l.sellerId === authUser.id), [listings, authUser]);
  const canManageListing = useCallback((l: Listing) => !!(authUser && l.sellerId === authUser.id) || isAdmin, [authUser, isAdmin]);

  React.useEffect(() => {
    if (searchPanelRef.current) L.DomEvent.disableClickPropagation(searchPanelRef.current);
    if (mainSearchPanelRef.current) L.DomEvent.disableClickPropagation(mainSearchPanelRef.current);
  }, [isPickingLocation, view]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.length > 2) searchPlaces(searchQuery);
      else clearPlacesResults();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchPlaces, clearPlacesResults]);

  // SCROLL POSITION FIX:
  // When the dashboard div mounts (view just became "dashboard"), restore the saved scroll position.
  // requestAnimationFrame ensures the browser has painted the content before we set scrollTop,
  // which is needed because the children may not have their full height yet right after mount.
  useEffect(() => {
    if (view === "dashboard" && dashboardScrollRef.current) {
      const el = dashboardScrollRef.current;
      const saved = savedDashboardScroll.current;
      if (saved > 0) {
        requestAnimationFrame(() => {
          el.scrollTop = saved;
        });
      }
    }
  }, [view]); // runs whenever view changes TO "dashboard"

  const handleSelectPlaceResult = async (result: any) => {
    const coords = await getPlaceDetails(result.place_id);
    if (coords) {
      setSearchLocation({ lat: coords.lat, lon: coords.lng });
      // FIX 1: Use flyToTarget instead of mapInstance.flyTo() so LeafletMap handles the
      // animation via its internal useEffect — guaranteed to run after mount, no setTimeout race.
      setFlyToTarget({ lat: coords.lat, lng: coords.lng, zoom: 17 });
    }
    clearPlacesResults();
    setSearchQuery(result.main_text);
  };

  // ── FIX 1: flyToListing — uses flyToTarget prop, not mapInstance.flyTo() ──
  const flyToListing = useCallback((l: Listing) => {
    if (!l.lat || !l.lng) {
      showNotification("This listing has no location set.", "warning");
      return;
    }
    setSelectedListing(l);
    goToMap();
    setFlyToTarget({ lat: l.lat, lng: l.lng, zoom: 17 });
  }, [setSelectedListing, goToMap, showNotification]);

  const handleAddOrUpdateListing = async () => {
    const errs = validateListing(newListing);
    if (Object.keys(errs).length > 0) return;
    if (!authUser) return showNotification("Please log in to add listings.", "error");
    setIsSaving(true);
    const listingData = { ...newListing, price: Number(newListing.price), area: Number(newListing.area) };
    const finalImages = newListing.images?.length ? newListing.images : ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80"];
    try {
      if (editingId) {
        const ok = await updateListing(editingId, { ...listingData, images: finalImages } as Listing);
        if (ok) { showNotification("Listing updated!"); setEditingId(null); }
        else showNotification("Failed to update.", "error");
      } else {
        const result = await addListing({ ...listingData, images: finalImages } as Omit<Listing, "id" | "sellerId" | "status">, authUser.id);
        if (result) showNotification("Listing submitted! Pending verification.", "info");
        else showNotification("Failed to add listing.", "error");
      }
    } catch (err) { showNotification("An error occurred.", "error"); }
    finally { setIsSaving(false); }
    resetListingForm(); goToDashboard();
  };

  // ── Admin status handler — now uses setListingStatus ──────────────────────
  const handleSetStatus = async (id: string, status: Listing["status"], reason?: string) => {
    const ok = await setListingStatus(id, status, reason);
    if (ok) {
      const label = STATUS_CONFIG[status]?.label || status;
      showNotification(`Listing marked as ${label}.`, status === "verified" ? "success" : status === "suspected" ? "warning" : "error");
      setReviewingDoc(null);
    } else {
      showNotification("Failed to update status.", "error");
    }
  };

  const handleDeleteListing = (id: string) => {
    setConfirmModal({
      isOpen: true, title: "Delete Listing", message: "This action cannot be undone.", variant: "danger",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        const ok = await deleteListing(id);
        if (ok) { showNotification("Listing removed."); if (editingId === id) { setEditingId(null); resetListingForm(); } if (selectedListing?.id === id) setSelectedListing(null); }
        else showNotification("Failed to delete.", "error");
      },
    });
  };

  const handleImageUpload = async (files: FileList) => {
    if (!authUser) return [];
    const uploaded: { url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
      const { data, error } = await supabase.storage.from("listing-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { showNotification(`Failed to upload "${file.name}".`, "error"); continue; }
      const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(data.path);
      uploaded.push({ url: urlData.publicUrl, name: file.name });
    }
    if (uploaded.length > 0) { setNewListing((p) => ({ ...p, images: [...(p.images || []), ...uploaded.map((u) => u.url)] })); showNotification(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded.`); }
    return uploaded;
  };

  const handleDocumentUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => setNewListing((p) => ({ ...p, documents: [...(p.documents || []), { name: file.name, url: ev.target?.result as string }] }));
    reader.readAsDataURL(file);
  };

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (isPickingLocation) { setNewListing((p) => ({ ...p, lat: latlng.lat, lng: latlng.lng })); setIsPickingLocation(false); goToDashboard(); showNotification("Location pinned!"); }
    else setSelectedListing(null);
  };

  const handleDownloadDoc = (doc: { name: string; url?: string; mock?: boolean }) => {
    if (doc.url) { const a = document.createElement("a"); a.href = doc.url; a.download = doc.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
    else showNotification("Demo document.", "info");
  };

  // FIX 3: Remember which tab was active before entering edit, so Cancel can return to it.
  const handleEditListing = (l: Listing) => {
    setPreEditTab(dashboardTab); // save current tab (could be "admin", "seller", etc.)
    setNewListing(l);
    setEditingId(l.id);
    setBoundaryRedo([]);
    setDashboardTab("seller");
    goToDashboard();
  };

  const resetListingForm = () => { setNewListing(emptyListing()); setBoundaryRedo([]); setIsPickingLocation(false); setIsDrawing(false); };

  // FIX 3: handleCancelEdit restores the tab the user came from.
  const handleCancelEdit = () => {
    resetListingForm();
    setEditingId(null);
    setDashboardTab(preEditTab); // go back to whichever tab triggered the edit
  };

  const handleBackupData = () => {
    const exportData = isAdmin ? { listings, inquiries } : { listings: myListings, inquiries: buyerInquiries };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `terra_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); showNotification("Backup downloaded!");
  };

  // SCROLL POSITION FIX:
  // Wraps the onPickLocation and onDrawBoundary handlers so we save the dashboard scroll
  // position BEFORE React unmounts the dashboard container (view change to map).
  // savedDashboardScroll.current survives the unmount since it's a ref, not state.
  const handlePickLocation = useCallback(() => {
    if (dashboardScrollRef.current) {
      savedDashboardScroll.current = dashboardScrollRef.current.scrollTop;
    }
    setIsPickingLocation(true);
    setIsDrawing(false);
    setView("map");
  }, [setIsPickingLocation, setIsDrawing, setView]);

  const handleDrawBoundary = useCallback(() => {
    if (dashboardScrollRef.current) {
      savedDashboardScroll.current = dashboardScrollRef.current.scrollTop;
    }
    setIsDrawing(true);
    setIsPickingLocation(false);
    setView("map");
  }, [setIsDrawing, setIsPickingLocation, setView]);

  if (authLoading) return <PageLoader message="Authenticating…" />;
  if (!authUser) return <Auth />;

  // ── Tab renderers ────────────────────────────────────────────────────────

  const renderBuyerTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Saved Properties" value={favoriteListings.length} icon={<Heart size={24} />} color="bg-destructive" />
        <StatsCard title="Available Listings" value={listings.filter((l) => l.status === "verified").length} icon={<LayoutDashboard size={24} />} color="bg-primary" />
        <StatsCard title="In Compare" value={compareList.length} icon={<Scale size={24} />} color="bg-secondary" />
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
        <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-card-foreground select-none"><Heart className="text-destructive" size={20} /> My Favorites</h2>
        {favoriteListings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">No favorites yet</p>
            <button onClick={goToMap} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition select-none">Browse Properties</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteListings.map((l) => (
              <div key={l.id} className="bg-muted rounded-xl border border-border overflow-hidden hover:border-primary/30 transition cursor-pointer group" onClick={() => { setSelectedListing(l); goToMap(); }}>
                <img src={l.images[0]} alt={l.title} className="w-full h-32 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold text-card-foreground truncate group-hover:text-primary transition select-text">{l.title}</h3>
                  <p className="text-primary font-bold mt-1 select-text">{formatIndianPrice(l.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-muted-foreground/10 px-2 py-0.5 rounded capitalize select-none">{l.type}</span>
                    <span className="text-xs text-muted-foreground select-text">{l.area.toLocaleString("en-IN")} sq ft</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, title: "Remove Favorite", message: "Remove from favorites?", variant: "warning", onConfirm: async () => { setConfirmModal((p) => ({ ...p, isOpen: false })); await toggleFavorite(l.id); showNotification("Removed from favorites."); } }); }} className="mt-3 w-full text-sm text-destructive font-medium py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition select-none">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {buyerInquiries.length > 0 && (
        <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-card-foreground select-none"><Mail className="text-secondary" size={20} /> Inquiries Sent</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {buyerInquiries.map((inq) => (
              <div key={inq.id} className="p-4 bg-muted rounded-xl border border-border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-card-foreground text-sm select-text">{inq.listingTitle}</h4>
                  <span className="text-xs text-muted-foreground select-none">{inq.date}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 bg-card p-2 rounded border border-border select-text">"{inq.message}"</p>
                <button onClick={() => setDashboardTab("messages")} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition select-none"><MessageSquare size={12} /> Messages</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSellerTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="My Listings" value={myListings.length} icon={<LayoutDashboard size={24} />} color="bg-secondary" />
        <StatsCard title="Inquiries Received" value={sellerInquiries.length} icon={<MessageSquare size={24} />} color="bg-violet-500" />
        <StatsCard title="Verified" value={myListings.filter((l) => l.status === "verified").length} icon={<ShieldCheck size={24} />} color="bg-primary" />
      </div>
      <MyListings listings={myListings} onEdit={handleEditListing} onDelete={handleDeleteListing} onViewDetail={(l) => setDetailListing(l)} />
      <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
        <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-card-foreground select-none">{editingId ? "Edit Listing" : "List New Property"}</h2>
        <ListingForm listing={newListing} editingId={editingId} isSaving={isSaving} onListingChange={setNewListing}
          // SCROLL POSITION FIX: use the scroll-saving wrappers instead of inline lambdas
          onPickLocation={handlePickLocation}
          onDrawBoundary={handleDrawBoundary}
          onClearBoundary={() => { setNewListing((p) => ({ ...p, boundary: [] })); setBoundaryRedo([]); }}
          onImageUpload={handleImageUpload} onDocumentUpload={handleDocumentUpload}
          onRemoveImage={(idx) => setNewListing((p) => ({ ...p, images: p.images?.filter((_, i) => i !== idx) }))}
          onSubmit={handleAddOrUpdateListing}
          // FIX 3: use handleCancelEdit so Cancel goes back to the originating tab
          onCancel={handleCancelEdit}
        />
      </div>
    </div>
  );

  const renderAdminTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total" value={listings.length} icon={<Database size={24} />} color="bg-primary" />
        <StatsCard title="Pending" value={listings.filter((l) => l.status === "unverified").length} icon={<FileText size={24} />} color="bg-amber-500" />
        <StatsCard title="Verified" value={listings.filter((l) => l.status === "verified").length} icon={<ShieldCheck size={24} />} color="bg-green-600" />
        <StatsCard title="Flagged" value={listings.filter((l) => l.status === "suspected" || l.status === "rejected").length} icon={<Search size={24} />} color="bg-orange-500" />
      </div>

      {/* All listings table with Show on Map */}
      <div className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-xl text-card-foreground select-none">All Listings</h2>
          <button onClick={handleBackupData} className="flex items-center gap-2 text-sm font-semibold bg-muted border border-border px-3 py-2 rounded-lg hover:bg-muted/80 transition select-none">
            <Download size={16} /> Backup
          </button>
        </div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {listings.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition group">
              <img src={l.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-card-foreground text-sm truncate select-text">{l.title}</h4>
                  <StatusBadge status={l.status} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 select-text">
                  {formatIndianPrice(l.price)} · {l.area.toLocaleString("en-IN")} sq ft · <span className="capitalize">{l.type}</span>
                </p>
                {(l.rejectionReason || l.suspicionReason) && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate select-text">
                    Reason: {l.rejectionReason || l.suspicionReason}
                  </p>
                )}
              </div>
              {/* Admin actions — hidden until hover */}
              <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                {/* FIX 1: Show on Map — uses flyToListing which sets flyToTarget state */}
                <button
                  onClick={() => flyToListing(l)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition select-none"
                  title="Show on map"
                >
                  <MapPin size={12} /> Map
                </button>
                {/* Review docs */}
                <button
                  onClick={() => setReviewingDoc(l)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition select-none"
                  title="Review documents & set status"
                >
                  <Eye size={12} /> Review
                </button>
                {/* Edit */}
                <button onClick={() => handleEditListing(l)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition select-none"><Edit size={14} /></button>
                {/* Delete */}
                <button onClick={() => handleDeleteListing(l.id)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition select-none"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {view !== "listing-detail" && (
        <Navbar userMode={userMode} userName={userName} view={view} isSaving={isSaving || listingsLoading}
          showControls={showControls} isAdmin={isAdmin} isLoggedIn={!!authUser}
          onLogoClick={goToMap} onModeChange={setUserMode} onDashboardClick={goToDashboard}
          onToggleControls={toggleControls} onProfileClick={() => setShowProfile(true)}
        />
      )}
      <ToastStack />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {view === "listing-detail" && detailListing ? (
          <div className="flex-1 overflow-y-auto">
            <ListingDetail listing={detailListing} isFavorite={isFavorite(detailListing.id)}
              onBack={() => { setDetailListing(null); goToMap(); }}
              onToggleFavorite={toggleFavorite}
              onContactSeller={async () => {
                if (!authUser) { showNotification("Log in to message sellers.", "warning"); return; }
                const convId = await startConversation(String(detailListing.id), detailListing.sellerId);
                if (convId) { setDashboardTab("messages"); goToDashboard(); showNotification("Conversation started!"); }
                else showNotification("Failed to start conversation.", "error");
              }}
              onDownloadDoc={handleDownloadDoc}
            />
          </div>
        ) : view === "compare" ? (
          <ComparePage listings={listings} compareList={compareList} onRemoveFromCompare={toggleCompare}
            onOpenMap={(l) => { setSelectedListing(l); goToMap(); }}
            onViewDetail={(l) => setDetailListing(l)} onBack={goToMap}
          />
        ) : view === "map" || isPickingLocation ? (
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {listingsLoading && <MapLoadingOverlay />}
            {showControls && !isPickingLocation && !isDrawing && (
              <SearchPanel ref={mainSearchPanelRef} searchQuery={searchQuery} onSearchChange={setSearchQuery}
                placesLoading={placesLoading} placesResults={placesResults} onSelectResult={handleSelectPlaceResult}
                filters={filters} onFiltersChange={setFilters} listingCount={sortedListings.length}
                sortKey={sortKey} onSortChange={setSortKey}
              />
            )}

            {/* FIX 2: Location picker banner — includes full search-with-suggestions UI */}
            {isPickingLocation && (
              <div ref={searchPanelRef} className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-3 w-full max-w-md px-4">
                <div className="bg-card rounded-2xl shadow-xl p-4 w-full border border-border relative">
                  <input
                    type="text"
                    placeholder="Search location to pin…"
                    autoFocus
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {/* Suggestions dropdown — same as SearchPanel */}
                  {placesResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg border border-border max-h-60 overflow-y-auto z-10">
                      {placesResults.map((r) => (
                        <button
                          key={r.place_id}
                          onClick={(e) => { e.stopPropagation(); handleSelectPlaceResult(r); }}
                          className="w-full text-left px-4 py-3 hover:bg-muted text-sm border-b border-border last:border-b-0 flex items-start gap-2 transition"
                        >
                          <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground font-medium truncate">{r.main_text}</span>
                            {r.secondary_text && (
                              <span className="text-muted-foreground text-xs truncate">{r.secondary_text}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-secondary text-secondary-foreground px-6 py-3 rounded-full shadow-lg font-bold animate-pulse flex items-center gap-2 select-none">
                  <MapPin size={18} /> Click on the map to pin location
                </div>
              </div>
            )}

            {/* FIX 1: Pass flyToTarget as a prop so LeafletMap handles animation internally */}
            <LeafletMap
              listings={sortedListings}
              onMarkerClick={setSelectedListing}
              onMapClick={handleMapClick}
              onAddBoundaryPoint={(pt) => { setNewListing((p) => ({ ...p, boundary: [...(p.boundary || []), pt] })); setBoundaryRedo([]); }}
              locationPickerMode={isPickingLocation}
              drawingMode={isDrawing}
              pickerLocation={{ lat: newListing.lat ?? null, lng: newListing.lng ?? null }}
              boundaryPoints={newListing.boundary || []}
              searchResult={searchLocation}
              setMapInstance={setMapInstance}
              flyToTarget={flyToTarget}
            />
            {isDrawing && (
              <DrawingOverlay pointCount={newListing.boundary?.length || 0} canUndo={!!newListing.boundary?.length} canRedo={boundaryRedo.length > 0}
                onUndo={() => { const last = newListing.boundary?.[newListing.boundary.length - 1]; if (last) { setNewListing((p) => ({ ...p, boundary: p.boundary?.slice(0, -1) || [] })); setBoundaryRedo((r) => [...r, last]); } }}
                onRedo={() => { const pt = boundaryRedo[boundaryRedo.length - 1]; if (pt) { setBoundaryRedo((r) => r.slice(0, -1)); setNewListing((p) => ({ ...p, boundary: [...(p.boundary || []), pt] })); } }}
                onDone={() => { setIsDrawing(false); goToDashboard(); }}
              />
            )}
            {selectedListing && !isPickingLocation && !isDrawing && (
              <div className="absolute top-16 right-4 z-[400] w-full max-w-sm">
                <ListingCard listing={selectedListing} isFavorite={isFavorite(selectedListing.id)} inCompare={compareList.includes(selectedListing.id)}
                  canManage={canManageListing(selectedListing)} onFavoriteToggle={() => toggleFavorite(selectedListing.id)}
                  onCompareToggle={() => toggleCompare(selectedListing.id)} onViewDetail={() => setDetailListing(selectedListing)}
                  onEdit={() => handleEditListing(selectedListing)} onDelete={() => handleDeleteListing(selectedListing.id)}
                  onContact={async () => { if (!authUser) { showNotification("Log in to message sellers.", "warning"); return; } const convId = await startConversation(String(selectedListing.id), selectedListing.sellerId); if (convId) { setDashboardTab("messages"); goToDashboard(); setSelectedListing(null); showNotification("Conversation started!"); } }}
                  onClose={() => setSelectedListing(null)}
                />
              </div>
            )}
            {compareList.length > 0 && !selectedListing && !isPickingLocation && !isDrawing && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 select-none">
                <span className="font-bold text-sm">{compareList.length} selected</span>
                <button onClick={() => setView("compare")} className="bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-full text-xs font-bold transition">Compare Now</button>
                <button onClick={clearCompare} className="text-muted-foreground hover:text-background transition text-lg">✕</button>
              </div>
            )}
          </div>
        ) : (
          // SCROLL POSITION FIX: dashboardScrollRef is attached here so we can read/write scrollTop.
          // On mount (view just became "dashboard"), the useEffect above restores savedDashboardScroll.
          <div ref={dashboardScrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
              <div className="flex items-center justify-between select-none">
                <div>
                  <h1 className="text-3xl font-bold text-card-foreground">{userMode === "admin" ? "Admin Dashboard" : "My Dashboard"}</h1>
                  <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
                </div>
                <button onClick={signOut} className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2.5 rounded-xl font-bold hover:bg-destructive/20 transition">Logout</button>
              </div>
              <DashboardTabs activeTab={dashboardTab} onTabChange={setDashboardTab} showAdminTab={userMode === "admin"} unreadCount={totalUnreadMessages} />
              {dashboardTab === "buyer" && renderBuyerTab()}
              {dashboardTab === "seller" && renderSellerTab()}
              {dashboardTab === "messages" && authUser && <MessagesSection userId={authUser.id} />}
              {dashboardTab === "admin" && userMode === "admin" && renderAdminTab()}
            </div>
          </div>
        )}
      </main>

      {reviewingDoc && (
        <AdminDocReviewModal
          listing={reviewingDoc}
          onSetStatus={handleSetStatus}
          onClose={() => setReviewingDoc(null)}
        />
      )}
      {showProfile && authUser && <ProfileSection user={authUser} profile={profile} onClose={() => setShowProfile(false)} onProfileUpdate={updateProfile} onSignOut={signOut} />}
      <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} confirmLabel="Yes, proceed" cancelLabel="Cancel" onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))} />
    </div>
  );
}

function emptyListing(): Partial<Listing> {
  return { title: "", type: "residential", price: 0, area: 0, description: "", lat: null, lng: null, documents: [], images: [], boundary: [] };
}

export default App;
