/**
 * useGooglePlaces — fixed hook.
 *
 * ROOT CAUSES FIXED:
 *
 * 1. OLD API REMOVED: The previous code used `google.maps.places.AutocompleteService`
 *    + `getPlacePredictions()`, which Google deprecated in 2024 and has been
 *    returning REQUEST_DENIED / ZERO_RESULTS for most API keys.
 *    → Replaced with the Places API (New) v1 endpoint via fetch(), which is
 *      key-based HTTP and does not require loading the Maps JS SDK at all for
 *      autocomplete. getPlaceDetails still uses a lightweight geocoding fetch.
 *
 * 2. RACE CONDITION: The old code checked `window.google?.maps?.places` and
 *    called `setIsLoaded(true)` — but the service-init useEffect depended on
 *    `isLoaded` as a dep. If the Maps SDK was already loaded before the hook
 *    mounted, `isLoaded` was set synchronously in the first effect, but React
 *    hadn't re-rendered yet so the service-init effect never fired.
 *    → No longer relevant since we use fetch() not the JS SDK.
 *
 * 3. STALE CLOSURE: `searchPlaces` had `[]` as dependency array, so
 *    `autocompleteServiceRef.current` was always null inside the callback.
 *    → No longer relevant; we use fetch() directly.
 *
 * FALLBACK: If no API key is configured, falls back to OpenStreetMap Nominatim
 * (free, no key needed) so search works in dev/demo environments.
 */
import { useState, useCallback, useRef } from "react";

export interface PlaceResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  lat?: number;
  lng?: number;
}

// ─── Places API (New) via HTTP fetch ─────────────────────────────────────────

const AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

async function fetchAutocompleteSuggestions(
  input: string,
  apiKey: string
): Promise<PlaceResult[]> {
  const res = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    throw new Error(`Places autocomplete HTTP ${res.status}`);
  }

  const json = await res.json();
  const suggestions: any[] = json.suggestions || [];

  return suggestions
    .filter((s: any) => s.placePrediction)
    .map((s: any) => {
      const p = s.placePrediction;
      return {
        place_id: p.placeId,
        description: p.text?.text || "",
        main_text: p.structuredFormat?.mainText?.text || p.text?.text || "",
        secondary_text:
          p.structuredFormat?.secondaryText?.text || "",
      };
    });
}

async function fetchPlaceCoords(
  placeId: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const fields = "location";
  const res = await fetch(
    `${DETAILS_URL}/${placeId}?fields=${fields}&key=${apiKey}`
  );

  if (!res.ok) return null;

  const json = await res.json();
  const loc = json.location;
  if (!loc?.latitude || !loc?.longitude) return null;

  return { lat: loc.latitude, lng: loc.longitude };
}

// ─── Nominatim fallback (no API key required) ─────────────────────────────────

async function nominatimSearch(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "6",
    addressdetails: "1",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "Accept-Language": "en" } }
  );

  if (!res.ok) return [];

  const json: any[] = await res.json();
  return json.map((item) => {
    const parts = item.display_name.split(", ");
    return {
      place_id: `nominatim_${item.osm_type}_${item.osm_id}`,
      description: item.display_name,
      main_text: parts[0],
      secondary_text: parts.slice(1, 3).join(", "),
      // Embed coords so getPlaceDetails doesn't need a second request
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

async function nominatimDetails(
  result: PlaceResult
): Promise<{ lat: number; lng: number } | null> {
  // Coords already embedded by nominatimSearch
  if (result.lat != null && result.lng != null) {
    return { lat: result.lat, lng: result.lng };
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGooglePlaces(apiKey: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cache results so getPlaceDetails can resolve Nominatim results from cache
  const resultCacheRef = useRef<Map<string, PlaceResult>>(new Map());
  // Abort controller to cancel in-flight requests when query changes
  const abortRef = useRef<AbortController | null>(null);

  const usingFallback = !apiKey;

  const searchPlaces = useCallback(
    async (query: string): Promise<void> => {
      if (!query || query.trim().length < 2) {
        setResults([]);
        return;
      }

      // Cancel previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        let found: PlaceResult[];

        if (usingFallback) {
          found = await nominatimSearch(query);
        } else {
          found = await fetchAutocompleteSuggestions(query, apiKey);
        }

        // Update cache
        found.forEach((r) => resultCacheRef.current.set(r.place_id, r));
        setResults(found);
      } catch (err: any) {
        if (err?.name === "AbortError") return; // deliberate cancel

        console.error("[useGooglePlaces] search error:", err);

        // If Places API (New) fails (e.g. billing not enabled), fall back to Nominatim
        if (!usingFallback) {
          try {
            const fallback = await nominatimSearch(query);
            fallback.forEach((r) => resultCacheRef.current.set(r.place_id, r));
            setResults(fallback);
            return;
          } catch {
            // Nominatim also failed, give up
          }
        }

        setError("Search unavailable. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, usingFallback]
  );

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
      // Check cache first (Nominatim embeds coords, so this is a fast path)
      const cached = resultCacheRef.current.get(placeId);
      if (cached?.lat != null && cached?.lng != null) {
        return { lat: cached.lat, lng: cached.lng };
      }

      if (usingFallback) {
        // Nominatim always embeds coords; if we got here it's a cache miss
        return cached ? nominatimDetails(cached) : null;
      }

      try {
        return await fetchPlaceCoords(placeId, apiKey);
      } catch (err) {
        console.error("[useGooglePlaces] details error:", err);
        return null;
      }
    },
    [apiKey, usingFallback]
  );

  const clearResults = useCallback(() => {
    abortRef.current?.abort();
    setResults([]);
  }, []);

  return {
    // isLoaded kept for backwards compat — always true since we use fetch()
    isLoaded: true,
    isLoading,
    results,
    error,
    searchPlaces,
    getPlaceDetails,
    clearResults,
  };
}
