import { hmuxFetch } from "./hmux";

interface GeoTIFFLoadFunctionOptions {
  src: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  hmux?: boolean;
}

export async function geoTIFFLoadFunction({
  src,
  headers,
  signal,
  hmux,
}: GeoTIFFLoadFunctionOptions): Promise<Response> {
  const response = await (hmux ? hmuxFetch : fetch)(src, {
    method: "GET",
    headers,
    signal,
  });

  if (response.status === 200 || response.status === 206) {
    return response;
  }

  throw new Error(`Unable to load GeoTIFF. Status: ${response.status}`);
}
