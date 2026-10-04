import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Plus, Minus, Layers } from "lucide-react";
import { Listing } from "@/types";
import {
  LengthUnit,
  calculateDistanceMeters,
  calculateEdgeMidpoint,
  calculateSegmentAngle,
  calculateOutwardOffsetSign,
  getDynamicBadgeStyles,
  formatEdgeLength,
  MIN_ZOOM_FOR_EDGE_LENGTHS,
} from "@/lib/geo";
import { UnitSwitcher } from "@/components/UnitSwitcher";
import { useAppStore } from "@/store/useAppStore";

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

function makeUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(37, 99, 235, 0.25);animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:-5px;border-radius:50%;background:rgba(59, 130, 246, 0.35);border:1px solid rgba(255,255,255,0.7);"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>
      </div>
    `,
  });
}

function makeGoogleRedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "google-red-pin-marker",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
    html: `
      <div style="position:relative;width:32px;height:42px;display:flex;align-items:center;justify-content:center;">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.45));">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 27.2 16 42 16 42C16 42 32 27.2 32 16C32 7.163 24.837 0 16 0Z" fill="#EA4335"/>
          <path d="M16 7C11.029 7 7 11.029 7 16C7 20.971 11.029 25 16 25C20.971 25 25 20.971 25 16C25 11.029 20.971 7 16 7Z" fill="#B31412"/>
          <circle cx="16" cy="16" r="4.5" fill="white"/>
        </svg>
      </div>
    `,
  });
}

function makeEdgeLengthIcon(
  text: string,
  angleDeg: number,
  outwardSign: number,
  zoom: number,
  isDrawing: boolean = false
): L.DivIcon {
  const bg = isDrawing ? "rgba(239, 68, 68, 0.92)" : "rgba(15, 23, 42, 0.92)";
  const border = isDrawing ? "#ffffff" : "#38bdf8";

  const { fontSize, py, px, offsetDistance } = getDynamicBadgeStyles(zoom, isDrawing);
  const translateYPx = outwardSign * parseFloat(offsetDistance);

  return L.divIcon({
    className: "edge-length-badge-container",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="
        position: absolute;
        transform: translate(-50%, -50%) rotate(${angleDeg}deg) translateY(${translateYPx}px);
        background: ${bg};
        color: #ffffff;
        padding: ${py}px ${px}px;
        border-radius: 4px;
        font-size: ${fontSize}px;
        font-weight: 700;
        white-space: nowrap;
        border: 1px solid ${border};
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        pointer-events: none;
        user-select: none;
        letter-spacing: 0.02em;
        line-height: 1.15;
        backdrop-filter: blur(2px);
      ">
        ${text}
      </div>
    `,
  });
}

function createEdgeMarkersForBoundary(
  points: { lat: number; lng: number }[],
  unit: LengthUnit,
  zoom: number,
  isDrawing: boolean = false
): L.Marker[] {
  if (!points || points.length < 2) return [];
  const markers: L.Marker[] = [];
  const count = points.length;

  for (let i = 0; i < count - 1; i++) {
    const pt1 = points[i];
    const pt2 = points[i + 1];
    const mid = calculateEdgeMidpoint(pt1, pt2);
    const dist = calculateDistanceMeters(pt1, pt2);
    const angle = calculateSegmentAngle(pt1, pt2);
    const outwardSign = calculateOutwardOffsetSign(pt1, pt2, points);
    const text = formatEdgeLength(dist, unit);
    const icon = makeEdgeLengthIcon(text, angle, outwardSign, zoom, isDrawing);
    const marker = L.marker([mid.lat, mid.lng], {
      icon,
      interactive: false,
      zIndexOffset: isDrawing ? 900 : 400,
    });
    markers.push(marker);
  }

  if (count >= 3) {
    const pt1 = points[count - 1];
    const pt2 = points[0];
    const mid = calculateEdgeMidpoint(pt1, pt2);
    const dist = calculateDistanceMeters(pt1, pt2);
    const angle = calculateSegmentAngle(pt1, pt2);
    const outwardSign = calculateOutwardOffsetSign(pt1, pt2, points);
    const text = formatEdgeLength(dist, unit);
    const icon = makeEdgeLengthIcon(text, angle, outwardSign, zoom, isDrawing);
    const marker = L.marker([mid.lat, mid.lng], {
      icon,
      interactive: false,
      zIndexOffset: isDrawing ? 900 : 400,
    });
    markers.push(marker);
  }

  return markers;
}

interface LeafletMapProps {
  listings: Listing[];
  onMarkerClick: (listing: Listing) => void;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onAddBoundaryPoint: (latlng: { lat: number; lng: number }) => void;
  onUpdateBoundaryPoint?: (index: number, latlng: { lat: number; lng: number }) => void;
  locationPickerMode: boolean;
  drawingMode: boolean;
  pickerLocation: { lat: number | null; lng: number | null };
  boundaryPoints: { lat: number; lng: number }[];
  searchResult: { lat: number; lon: number } | null;
  droppedPin: { lat: number; lng: number } | null;
  setMapInstance: (map: L.Map) => void;
  lengthUnit: LengthUnit;
  onUnitChange?: (unit: LengthUnit) => void;
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null;
  isMeasuringLength?: boolean;
  measurePoints?: { lat: number; lng: number }[];
  onAddMeasurePoint?: (latlng: { lat: number; lng: number }) => void;
  onUpdateMeasurePoint?: (index: number, latlng: { lat: number; lng: number }) => void;
}

export function LeafletMap({
  listings,
  onMarkerClick,
  onMapClick,
  onAddBoundaryPoint,
  onUpdateBoundaryPoint,
  locationPickerMode,
  drawingMode,
  pickerLocation,
  boundaryPoints,
  searchResult,
  droppedPin,
  setMapInstance,
  lengthUnit,
  onUnitChange,
  flyToTarget,
  isMeasuringLength = false,
  measurePoints = [],
  onAddMeasurePoint,
  onUpdateMeasurePoint,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerMapRef = useRef<Map<string, { marker: L.Marker; polygon?: L.Polygon; edgeMarkers?: L.Marker[] }>>(new Map());
  const clusterGroupRef = useRef<any>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const searchPinMarkerRef = useRef<L.Marker | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hasInitializedDrawingRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const showNotification = useAppStore((s) => s.showNotification);

  const handleLocateUser = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      showNotification("Geolocation is not supported by your browser.", "error");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setIsLocating(false);

        map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
        showNotification("Centered on your current location!", "success");

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userLocationMarkerRef.current = L.marker([lat, lng], {
            icon: makeUserLocationIcon(),
            zIndexOffset: 1100,
          }).addTo(map);
        }

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const wLat = watchPos.coords.latitude;
            const wLng = watchPos.coords.longitude;
            setUserLocation({ lat: wLat, lng: wLng });
            if (userLocationMarkerRef.current) {
              userLocationMarkerRef.current.setLatLng([wLat, wLng]);
            }
          },
          (err) => console.warn("Watch position error:", err),
          { enableHighAccuracy: true }
        );
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          showNotification("Location permission denied. Please allow location access in your browser.", "warning");
        } else {
          showNotification("Unable to retrieve your location. Please try again.", "error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [showNotification]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
        zoomControl: false,
        attributionControl: false, // REMOVE LEAFLET TAGS
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
        tap: true,
      }).setView(initialCenter, initialZoom);
      setCurrentZoom(initialZoom);

      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22, maxNativeZoom: 19,
      });
      const googleSat    = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });
      const googleHybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });
      const googleStreets= L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { maxZoom: 22, maxNativeZoom: 20 });

      const baseMaps: Record<string, L.TileLayer> = {
        "Google Satellite": googleSat,
        "Google Hybrid": googleHybrid,
        "Google Streets": googleStreets,
        "Standard (OSM)": osm,
      };
      const savedLayer = localStorage.getItem("terraMapLayer") || "Google Hybrid";
      const activeTile = baseMaps[savedLayer] || googleHybrid;
      activeTile.addTo(map);
      activeTileLayerRef.current = activeTile;

      L.control.scale({ position: "bottomleft" }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        localStorage.setItem("terraMapCenter", JSON.stringify([c.lat, c.lng]));
        localStorage.setItem("terraMapZoom", String(map.getZoom()));
      });
      map.on("zoomend", () => {
        setCurrentZoom(map.getZoom());
      });

      markerLayerRef.current = L.layerGroup().addTo(map);
      drawingLayerGroupRef.current = L.layerGroup().addTo(map);
      measureLayerGroupRef.current = L.layerGroup().addTo(map);
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

  // ── Search result & pin marker ───────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }
    if (searchResult) {
      map.invalidateSize();
      map.flyTo([searchResult.lat, searchResult.lon], 16, { animate: true, duration: 1.0 });
      searchPinMarkerRef.current = L.marker([searchResult.lat, searchResult.lon], {
        icon: makeGoogleRedPinIcon(),
        zIndexOffset: 1200,
      }).addTo(map);
    }
  }, [searchResult]);

  // ── Dropped pin marker ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (droppedPinMarkerRef.current) {
      droppedPinMarkerRef.current.remove();
      droppedPinMarkerRef.current = null;
    }
    if (droppedPin && !locationPickerMode && !drawingMode && !isMeasuringLength) {
      droppedPinMarkerRef.current = L.marker([droppedPin.lat, droppedPin.lng], {
        icon: makeGoogleRedPinIcon(),
        zIndexOffset: 1200,
      }).addTo(map);
    }
  }, [droppedPin, locationPickerMode, drawingMode, isMeasuringLength]);

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
      if (isMeasuringLength && onAddMeasurePoint) {
        onAddMeasurePoint(e.latlng);
      } else if (drawingMode) {
        onAddBoundaryPoint(e.latlng);
      } else {
        onMapClick(e.latlng);
      }
    });
  }, [isMeasuringLength, drawingMode, onMapClick, onAddBoundaryPoint, onAddMeasurePoint]);

  // ── Linear Measurement Layer (Dotted Polyline + Vertex Badges + Segment Lengths) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    const mlg = measureLayerGroupRef.current;
    if (!map || !mlg) return;

    mlg.clearLayers();

    if (!measurePoints || measurePoints.length === 0) return;

    const currentPts = [...measurePoints];
    let darkGlow: L.Polyline | null = null;
    let mainPolyline: L.Polyline | null = null;
    const edgeMarkersGroup = L.layerGroup().addTo(mlg);

    const updateLinesAndBadges = (pts: { lat: number; lng: number }[]) => {
      edgeMarkersGroup.clearLayers();
      if (pts.length > 1) {
        if (darkGlow) darkGlow.setLatLngs(pts);
        if (mainPolyline) mainPolyline.setLatLngs(pts);

        for (let i = 0; i < pts.length - 1; i++) {
          const pt1 = pts[i];
          const pt2 = pts[i + 1];
          const mid = calculateEdgeMidpoint(pt1, pt2);
          const dist = calculateDistanceMeters(pt1, pt2);
          const text = formatEdgeLength(dist, lengthUnit);
          const angle = calculateSegmentAngle(pt1, pt2);

          const edgeIcon = makeEdgeLengthIcon(text, angle, -1, currentZoom, true);
          L.marker([mid.lat, mid.lng], {
            icon: edgeIcon,
            interactive: false,
            zIndexOffset: 1100,
          }).addTo(edgeMarkersGroup);
        }
      }
    };

    if (currentPts.length > 1) {
      darkGlow = L.polyline(currentPts, {
        color: "#000000",
        weight: 6,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mlg);

      mainPolyline = L.polyline(currentPts, {
        color: "#f59e0b",
        weight: 4,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round",
        opacity: 0.95,
      }).addTo(mlg);

      updateLinesAndBadges(currentPts);
    }

    // Numbered draggable vertex markers (P1, P2, P3...)
    currentPts.forEach((pt, idx) => {
      const vMarker = L.marker([pt.lat, pt.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: `
            <div style="
              width: 26px;
              height: 26px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: #ffffff;
              border: 2px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              font-family: sans-serif;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              user-select: none;
              cursor: grab;
            ">
              ${idx + 1}
            </div>
          `,
        }),
        zIndexOffset: 1200,
      }).addTo(mlg);

      vMarker.on("drag", () => {
        const newPos = vMarker.getLatLng();
        currentPts[idx] = { lat: newPos.lat, lng: newPos.lng };
        updateLinesAndBadges(currentPts);
      });

      vMarker.on("dragend", () => {
        const finalPos = vMarker.getLatLng();
        onUpdateMeasurePoint?.(idx, { lat: finalPos.lat, lng: finalPos.lng });
      });
    });
  }, [isMeasuringLength, measurePoints, lengthUnit, currentZoom, onUpdateMeasurePoint]);

  // ── Marker diffing ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const layer = USE_CLUSTERING ? clusterGroupRef.current : markerLayerRef.current;
    if (!layer) return;

    // Always clear old markers, polygons, and edge length badges
    markerMapRef.current.forEach(({ marker, polygon, edgeMarkers }) => {
      layer.removeLayer(marker);
      if (polygon) map.removeLayer(polygon);
      if (edgeMarkers) edgeMarkers.forEach((m) => map.removeLayer(m));
    });
    markerMapRef.current.clear();

    if (locationPickerMode || drawingMode) return;

    // Edge lengths are ONLY visible when zoomed in past MIN_ZOOM_FOR_EDGE_LENGTHS
    const showEdgeLengths = currentZoom >= MIN_ZOOM_FOR_EDGE_LENGTHS;

    // Add current listings
    listings.forEach((l) => {
      if (l.lat === null || l.lng === null) return;

      const marker = L.marker([l.lat, l.lng], { icon: makeIcon(l.type, l.status) })
        .on("click", () => onMarkerClick(l));
      layer.addLayer(marker);

      let polygon: L.Polygon | undefined;
      let edgeMarkers: L.Marker[] | undefined;

      if (l.boundary && l.boundary.length >= 2) {
        polygon = L.polygon(l.boundary, {
          color: l.type === "agricultural" ? "#16a34a" : l.type === "commercial" ? "#9333ea" : "#2563eb",
          fillOpacity: 0.18,
          weight: 2.5,
        }).addTo(map).on("click", () => onMarkerClick(l));

        if (showEdgeLengths) {
          edgeMarkers = createEdgeMarkersForBoundary(l.boundary, lengthUnit, currentZoom, false);
          edgeMarkers.forEach((m) => m.addTo(map));
        }
      }

      markerMapRef.current.set(l.id, { marker, polygon, edgeMarkers });
    });
  }, [listings, locationPickerMode, drawingMode, lengthUnit, currentZoom, onMarkerClick]);

  // ── Picker marker (the seller's pinned location) ──────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
    if ((locationPickerMode || drawingMode) && pickerLocation?.lat != null) {
      pickerMarkerRef.current = L.marker(
        [pickerLocation.lat, pickerLocation.lng!],
        { icon: makePickerIcon(), zIndexOffset: 1000 }
      ).addTo(map);
    }
  }, [locationPickerMode, drawingMode, pickerLocation]);

  // ── Drawing layer (boundary polygon + draggable vertex dots + edge length badges) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    const dlg = drawingLayerGroupRef.current;
    if (!map || !dlg) return;

    dlg.clearLayers();

    const shouldShowBoundary = (locationPickerMode || drawingMode) && boundaryPoints.length > 0;
    if (!shouldShowBoundary) return;

    const currentPts = [...boundaryPoints];
    let polygon: L.Polygon | null = null;
    const edgeMarkersGroup = L.layerGroup().addTo(dlg);

    const updateBoundaryShapeAndBadges = (pts: { lat: number; lng: number }[]) => {
      edgeMarkersGroup.clearLayers();
      if (pts.length > 1) {
        if (polygon) polygon.setLatLngs(pts);

        const drawingEdgeMarkers = createEdgeMarkersForBoundary(pts, lengthUnit, currentZoom, true);
        drawingEdgeMarkers.forEach((m) => edgeMarkersGroup.addLayer(m));
      }
    };

    if (currentPts.length > 1) {
      polygon = L.polygon(currentPts, {
        color: "#ef4444",
        dashArray: "5 5",
        fillColor: "#ef4444",
        fillOpacity: 0.18,
        weight: 2.5,
      }).addTo(dlg);

      updateBoundaryShapeAndBadges(currentPts);
    }

    currentPts.forEach((pt, index) => {
      const vMarker = L.marker(pt, {
        draggable: true,
        icon: L.divIcon({
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          html: `<div style="width:16px;height:16px;background:#ef4444;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);cursor:grab"></div>`,
        }),
        zIndexOffset: 1200,
      }).addTo(dlg);

      vMarker.on("drag", () => {
        const newPos = vMarker.getLatLng();
        currentPts[index] = { lat: newPos.lat, lng: newPos.lng };
        updateBoundaryShapeAndBadges(currentPts);
      });

      vMarker.on("dragend", () => {
        const finalPos = vMarker.getLatLng();
        onUpdateBoundaryPoint?.(index, { lat: finalPos.lat, lng: finalPos.lng });
      });
    });
  }, [locationPickerMode, drawingMode, boundaryPoints, lengthUnit, currentZoom, onUpdateBoundaryPoint]);

  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayerName, setActiveLayerName] = useState<string>(
    () => localStorage.getItem("terraMapLayer") || "Google Hybrid"
  );
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const MAP_LAYERS = [
    { id: "Google Hybrid", label: "Google Hybrid", icon: "🗺️", url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", maxZoom: 22, maxNativeZoom: 20 },
    { id: "Google Satellite", label: "Google Satellite", icon: "🛰️", url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", maxZoom: 22, maxNativeZoom: 20 },
    { id: "Google Streets", label: "Google Streets", icon: "🏙️", url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", maxZoom: 22, maxNativeZoom: 20 },
    { id: "Standard (OSM)", label: "Standard (OSM)", icon: "🌍", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 22, maxNativeZoom: 19 },
  ];

  const handleSelectLayer = useCallback((layerId: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const target = MAP_LAYERS.find((l) => l.id === layerId);
    if (!target) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const newTile = L.tileLayer(target.url, { maxZoom: target.maxZoom, maxNativeZoom: target.maxNativeZoom });
    newTile.addTo(map);
    activeTileLayerRef.current = newTile;
    setActiveLayerName(target.id);
    localStorage.setItem("terraMapLayer", target.id);
    setIsLayerMenuOpen(false);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* ── Upgraded 4-in-1 Map Layers Dropdown Button ── */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[400] select-none">
        <button
          type="button"
          onClick={() => setIsLayerMenuOpen((p) => !p)}
          className={`px-3 py-2 rounded-2xl shadow-xl border backdrop-blur-md font-bold text-xs flex items-center gap-1.5 transition min-h-[40px] ${
            isLayerMenuOpen
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/95 text-card-foreground border-border hover:bg-muted"
          }`}
          title="Map Layers (Satellite, Hybrid, Streets, OSM)"
        >
          <Layers size={16} />
          <span className="hidden sm:inline">{activeLayerName}</span>
        </button>

        {/* Floating Dropdown Card */}
        {isLayerMenuOpen && (
          <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-border w-48 space-y-1 z-10 animate-fade-in">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1 border-b border-border">
              Select Map View
            </div>
            {MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => handleSelectLayer(layer.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition min-h-[38px] ${
                  activeLayerName === layer.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted text-card-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{layer.icon}</span>
                  <span>{layer.label}</span>
                </span>
                {activeLayerName === layer.id && <span className="text-primary font-extrabold text-sm">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Google Maps Style Zoom Controls (+ and -) */}
      <div className="absolute bottom-20 right-3 sm:right-4 z-[400] flex flex-col bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2.5 hover:bg-muted text-card-foreground transition flex items-center justify-center min-w-[40px] min-h-[40px]"
          title="Zoom In"
        >
          <Plus size={18} />
        </button>
        <div className="h-px bg-border w-full" />
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2.5 hover:bg-muted text-card-foreground transition flex items-center justify-center min-w-[40px] min-h-[40px]"
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Google Maps Style Locate Me Button */}
      <button
        type="button"
        onClick={handleLocateUser}
        disabled={isLocating}
        className={`absolute bottom-4 right-3 sm:right-4 z-[400] p-3 rounded-2xl shadow-xl border border-border backdrop-blur-md transition flex items-center justify-center min-w-[44px] min-h-[44px] ${
          userLocation
            ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
            : "bg-card/95 text-card-foreground hover:bg-muted"
        }`}
        title="Show Current Location (Google Maps Style)"
      >
        {isLocating ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Navigation size={20} className={userLocation ? "fill-current" : ""} />
        )}
      </button>

      {/* Unit Switcher Strip — ONLY shown when zoomed in enough for edge lengths (level 16+) */}
      {onUnitChange && !drawingMode && !locationPickerMode && currentZoom >= MIN_ZOOM_FOR_EDGE_LENGTHS && (
        <div className="absolute bottom-4 left-24 sm:left-32 z-[400]">
          <UnitSwitcher currentUnit={lengthUnit} onUnitChange={onUnitChange} variant="compact" />
        </div>
      )}
    </div>
  );
}
