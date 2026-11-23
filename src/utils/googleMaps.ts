const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

export type GoogleLatLngLiteral = {
  lat: number;
  lng: number;
};

export type PickedPlace = {
  locationName: string;
  address: string;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
};

let loadPromise: Promise<any> | null = null;

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export function loadGoogleMaps(): Promise<any> {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY in environment."));
  }

  const win = window as unknown as { google?: { maps?: any } };
  if (win.google?.maps?.Map) {
    return Promise.resolve(win.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-sdk="true"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(win.google?.maps));
      existingScript.addEventListener("error", () =>
        reject(new Error("Could not load Google Maps JavaScript API.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsSdk = "true";
    script.onload = () => {
      if (win.google?.maps) {
        resolve(win.google.maps);
      } else {
        reject(new Error("Google Maps SDK loaded without google.maps object."));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Could not load Google Maps JavaScript API."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

type PlacesNewTextSearchResponse = {
  places?: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }[];
};

type NominatimSearchResult = {
  place_id?: number | string;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
};

export async function searchPlacesNew(query: string): Promise<PickedPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. Try Google Places API (New) Text Search (v1)
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: trimmed,
          locationBias: {
            circle: {
              center: { latitude: 15.95, longitude: 108.25 },
              radius: 50000.0,
            },
          },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as PlacesNewTextSearchResponse;
        const places = (data.places ?? [])
          .filter(
            (item) =>
              typeof item.location?.latitude === "number" &&
              typeof item.location?.longitude === "number",
          )
          .map((item) => ({
            locationName:
              item.displayName?.text ||
              item.formattedAddress?.split(",")[0] ||
              trimmed,
            address: item.formattedAddress || "",
            googlePlaceId: item.id || "",
            latitude: Number(item.location!.latitude!.toFixed(6)),
            longitude: Number(item.location!.longitude!.toFixed(6)),
          }));
        if (places.length > 0) {
          return places;
        }
      }
    } catch {
      // Fall through to Nominatim backup if Places API (New) fails
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim so search works even if Places API is restricted
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      trimmed,
    )}&countrycodes=vn&limit=6`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const items = (await res.json()) as NominatimSearchResult[];
      return items
        .filter((item) => item.lat && item.lon)
        .map((item) => {
          const fullAddress = item.display_name || "";
          const name = item.name || fullAddress.split(",")[0] || trimmed;
          return {
            locationName: name,
            address: fullAddress,
            googlePlaceId: item.place_id ? `osm-${item.place_id}` : "",
            latitude: Number(Number(item.lat).toFixed(6)),
            longitude: Number(Number(item.lon).toFixed(6)),
          };
        });
    }
  } catch {
    // Ignore fallback error
  }

  return [];
}

export async function reverseGeocodeNew(
  latitude: number,
  longitude: number,
): Promise<{ locationName: string; address: string; googlePlaceId: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      latitude,
    )}&lon=${encodeURIComponent(longitude)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimSearchResult;
    const address = data.display_name || "";
    const locationName = data.name || address.split(",")[0] || "Pinned location";
    return {
      locationName,
      address,
      googlePlaceId: data.place_id ? `osm-${data.place_id}` : "",
    };
  } catch {
    return null;
  }
}
