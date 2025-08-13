import type { FitOptions } from "ol/View";

import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";

export const GEOMETRY_KEY = "geometry";
export const DEFAULT_PADDING: FitOptions["padding"] = [20, 20, 20, 20];
export const DEFAULT_SRS: SRSRef = { id: 4326 };
