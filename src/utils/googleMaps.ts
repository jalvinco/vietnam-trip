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
  if (win.google?.maps?.Map && win.google?.maps?.places) {
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
    )}&libraries=places,marker&v=weekly`;
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
