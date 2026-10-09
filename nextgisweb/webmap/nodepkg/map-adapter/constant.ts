import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";

export const DEFAULT_MAP_MIN_ZOOM = 0;
export const DEFAULT_MAP_MAX_ZOOM = 24;
export const DEFAULT_MAP_PROJECTION = "EPSG:3857";

export const DEFAULT_FIT_PADDING = [20, 20, 20, 20];
export const DEFAULT_EXTENT_SRS: SRSRef = { id: 4326 };
export const SMART_FIT_EXTENT_SIZE = 100;
export const SMART_FIT_MIN_ZOOM = 12;

// Milliseconds.
export const DEFAULT_VIEW_ANIMATION_DURATION = 250;
