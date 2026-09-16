import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Listing } from "@/types";

const USE_CLUSTERING = false;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function makeIcon(type: Listing["type"], status: Listing["status"]): L.DivIcon {
  const colours: Record<string, string> = {
    residential: "#3b82f6",
    agricultural: "#22c55e",
    commercial: "#a855f7",
  };
  const colour = colours[type] || "#6b7280";
  const opacity = status === "verified" ? "1" : "0.65";
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${colour};opacity:${opacity};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
  });
}

/**
 * Distinct icon for the seller's own picked pin.
 * Larger, orange/amber colour so it's never confused with listing markers
 * (which are blue/green/purple) or boundary dots (which are red/small).
 */
function makePickerIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `
      <div style="
        width:36px;height:36px;
        border-radius:50% 50% 50% 0;
        background:#f59e0b;
        border:3px solid white;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        transform:rotate(-45deg);
        position:relative;
      ">
        <div style="
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          transform:rotate(45deg);
          font-size:14px;
          line-height:1;
        ">📍</div>
      </div>`,
  });
}

interface LeafletMapProps {
  listings: Listing[];
  onMarkerClick: (listing: Listing) => void;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onAddBoundaryPoint: (latlng: { lat: number; lng: number }) => void;
  locationPickerMode: boolean;
  drawingMode: boolean;
  pickerLocation: { lat: number | null; lng: number | null };
  boundaryPoints: { lat: number; lng: number }[];
  searchResult: { lat: number; lon: number } | null;
  setMapInstance: (map: L.Map) => void;
  /**
   * When set, the map flies to these coordinates at zoom 17.
   * Uses the same reliable internal-effect pattern as searchResult —
   * guaranteed to fire after the map is mounted, no setTimeout race.
   * Pass a new object reference each time you want a fly-to to trigger.
   */
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null;
}

export function LeafletMap({
  listings,
  onMarkerClick,
  onMapClick,
  onAddBoundaryPoint,
  locationPickerMode,
  drawingMode,
  pickerLocation,
  boundaryPoints,
  searchResult,
  setMapInstance,
  flyToTarget,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerMapRef = useRef<Map<string, { marker: L.Marker; polygon?: L.Polygon }>>(new Map());
  const clusterGroupRef = useRef<any>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hasInitializedDrawingRef = useRef(false);

  // ── Map init (once) ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    try {
      let initialCenter: [number, number] = [30.9, 75.8];
      let initialZoom = 10;
      try {
        const sc = localStorage.getItem("terraMapCenter");
        const sz = localStorage.getItem("terraMapZoom");
        if (sc) initialCenter = JSON.parse(sc);
        if (sz) initialZoom = parseInt(sz);
      } catch {}

      const map = L.map(mapContainerRef.current, {
        zoomControl: false, scrollWheelZoom: true, doubleClickZoom: true,
        touchZoom: true, dragging: true, tap: true,
      }).setView(initialCenter, initialZoom);

      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap", maxZoom: 22, maxNativeZoom: 19,
      });
      const googleSat    = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });
      const googleHybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });
      const googleStreets= L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });

      const baseMaps: Record<string, L.TileLayer> = {
        "Standard (OSM)": osm,
        "Google Streets": googleStreets,
        "Google Satellite": googleSat,
        "Google Hybrid": googleHybrid,
      };
      const savedLayer = localStorage.getItem("terraMapLayer") || "Standard (OSM)";
      (baseMaps[savedLayer] || osm).addTo(map);

      L.control.layers(baseMaps).addTo(map);
      L.control.scale().addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        localStorage.setItem("terraMapCenter", JSON.stringify([c.lat, c.lng]));
        localStorage.setItem("terraMapZoom", String(map.getZoom()));
      });
      map.on("baselayerchange", (e: L.LayersControlEvent) => {
        localStorage.setItem("terraMapLayer", e.name);
      });

      if (USE_CLUSTERING) {
        try {
          const MCG = (L as any).markerClusterGroup({ chunkedLoading: true });
          clusterGroupRef.current = MCG;
          map.addLayer(MCG);
        } catch {
          markerLayerRef.current = L.layerGroup().addTo(map);
        }
      } else {
        markerLayerRef.current = L.layerGroup().addTo(map);
      }

      drawingLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapInstance(map);
    } catch (err) {
      console.error("Map init error:", err);
    }
  }, []);

  // ── flyToTarget — guaranteed to run after map is mounted ─────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToTarget) return;
    map.invalidateSize();
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? 17, {
      animate: true,
      duration: 1.0,
    });
  }, [flyToTarget]);

  // ── Search result fly-to ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !searchResult) return;
    map.invalidateSize();
    map.flyTo([searchResult.lat, searchResult.lon], 16);
  }, [searchResult]);

  // ── Drawing mode centering ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (drawingMode && pickerLocation?.lat && !hasInitializedDrawingRef.current) {
      hasInitializedDrawingRef.current = true;
      map.setView([pickerLocation.lat, pickerLocation.lng!], map.getZoom());
    }
    if (!drawingMode) hasInitializedDrawingRef.current = false;
  }, [drawingMode, pickerLocation]);

  // ── Click handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off("click");
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (drawingMode) onAddBoundaryPoint(e.latlng);
      else onMapClick(e.latlng);
    });
  }, [drawingMode, onMapClick, onAddBoundaryPoint]);

  // ── Marker diffing ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const layer = USE_CLUSTERING ? clusterGroupRef.current : markerLayerRef.current;
    if (!layer) return;

    if (locationPickerMode || drawingMode) {
      markerMapRef.current.forEach(({ marker, polygon }) => {
        layer.removeLayer(marker);
        if (polygon) map.removeLayer(polygon);
      });
      markerMapRef.current.clear();
      return;
    }

    const nextIds = new Set(listings.map((l) => l.id));
    const currentIds = new Set(markerMapRef.current.keys());

    // Remove stale
    currentIds.forEach((id) => {
      if (!nextIds.has(id)) {
        const entry = markerMapRef.current.get(id)!;
        layer.removeLayer(entry.marker);
        if (entry.polygon) map.removeLayer(entry.polygon);
        markerMapRef.current.delete(id);
      }
    });

    // Add new
    listings.forEach((l) => {
      if (currentIds.has(l.id)) return;
      if (l.lat === null || l.lng === null) return;

      const marker = L.marker([l.lat, l.lng], { icon: makeIcon(l.type, l.status) })
        .on("click", () => onMarkerClick(l));
      layer.addLayer(marker);

      let polygon: L.Polygon | undefined;
      if (l.boundary && l.boundary.length > 2) {
        polygon = L.polygon(l.boundary, {
          color: l.type === "agricultural" ? "#16a34a" : l.type === "commercial" ? "#9333ea" : "#2563eb",
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(map).on("click", () => onMarkerClick(l));
      }

      markerMapRef.current.set(l.id, { marker, polygon });
    });
  }, [listings, locationPickerMode, drawingMode, onMarkerClick]);

  // ── Picker marker (the seller's pinned location) ──────────────────────────
  // Shown whenever either editing mode is active AND a pin exists.
  // Uses a distinct amber icon so it can't be confused with listing markers
  // (blue/green/purple) or boundary dots (small red circles).
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // Always remove the old marker first so we don't accumulate duplicates
    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
    // Show whenever either mode is active and a pin coordinate exists
    if ((locationPickerMode || drawingMode) && pickerLocation?.lat != null) {
      pickerMarkerRef.current = L.marker(
        [pickerLocation.lat, pickerLocation.lng!],
        { icon: makePickerIcon(), zIndexOffset: 1000 }
      ).addTo(map);
    }
  }, [locationPickerMode, drawingMode, pickerLocation]);

  // ── Drawing layer (boundary polygon + vertex dots) ────────────────────────
  // FIX: Previously gated on `drawingMode` only, so switching back to
  // locationPickerMode cleared the boundary the seller had already drawn.
  // Now we render the boundary whenever either editing mode is active
  // AND there are boundary points — so the drawn area stays visible when
  // the seller goes back to re-pin the location, and vice-versa.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const dlg = drawingLayerGroupRef.current;
    if (!map || !dlg) return;

    dlg.clearLayers();

    // Show boundary in both drawing mode AND location-picker mode so the
    // seller always sees what they've already drawn, no matter which step
    // they're currently on.
    const shouldShowBoundary = (locationPickerMode || drawingMode) && boundaryPoints.length > 0;
    if (!shouldShowBoundary) return;

    // Polygon fill (needs at least 2 points to draw a line, 3 for a fill)
    if (boundaryPoints.length > 1) {
      L.polygon(boundaryPoints, {
        color: "#ef4444",
        dashArray: "5 5",
        fillColor: "#ef4444",
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(dlg);
    }

    // Vertex dots
    boundaryPoints.forEach((pt) => {
      L.marker(pt, {
        icon: L.divIcon({
          className: "",
          iconSize: [10, 10],
          iconAnchor: [5, 5],
          html: `<div style="width:10px;height:10px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        }),
      }).addTo(dlg);
    });
  }, [locationPickerMode, drawingMode, boundaryPoints]);

  return <div ref={mapContainerRef} className="absolute inset-0 z-0" />;
}
