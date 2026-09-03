import settings from "@nextgisweb/basemap/client-settings";
import { assert } from "@nextgisweb/jsrealm/error";

import type { QMSDetailEntry, QMSSearchEntry } from "../type";

const geoservicesApiUrl = `${settings.qms.url}/api/v1/geoservices`;

export async function get(
  id: number,
  options?: RequestInit
): Promise<QMSDetailEntry> {
  const url = `${geoservicesApiUrl}/${id}/?format=json`;
  const response = await fetch(url, { method: "GET", ...options });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  assert(data.type === "tms");
  return data;
}

export async function search(
  query: string,
  options: RequestInit
): Promise<QMSSearchEntry[]> {
  if (!query || query.toString().length === 0) {
    return [];
  }

  const queryOptions = {
    format: "json",
    type: "tms",
    search: query,
  };

  const queryString = new URLSearchParams(queryOptions).toString();
  const url = `${geoservicesApiUrl}/?${queryString}`;

  const response = await fetch(url, {
    method: "GET",
    ...options,
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return await response.json();
}
