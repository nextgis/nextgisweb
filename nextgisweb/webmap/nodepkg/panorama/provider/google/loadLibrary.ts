import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let libraryPromise: Promise<google.maps.StreetViewLibrary> | null = null;
let optionsSet = false;

export function loadLibrary(
  apiKey: string | null
): Promise<google.maps.StreetViewLibrary> {
  if (!optionsSet) {
    setOptions(apiKey ? { key: apiKey, v: "weekly" } : { v: "weekly" });
    optionsSet = true;
  }
  if (!libraryPromise) {
    libraryPromise = importLibrary("streetView").catch((err) => {
      libraryPromise = null;
      throw err;
    });
  }
  return libraryPromise;
}
