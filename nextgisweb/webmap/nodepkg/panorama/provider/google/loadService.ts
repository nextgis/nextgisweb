import { loadLibrary } from "./loadLibrary";

let servicePromise: Promise<google.maps.StreetViewService> | null = null;

export function loadService(
  apiKey: string | null
): Promise<google.maps.StreetViewService> {
  if (!servicePromise) {
    servicePromise = loadLibrary(apiKey).then(
      ({ StreetViewService }) => new StreetViewService(),
      (err) => {
        servicePromise = null;
        throw err;
      }
    );
  }
  return servicePromise;
}
