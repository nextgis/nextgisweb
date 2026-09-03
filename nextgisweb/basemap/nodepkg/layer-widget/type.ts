export interface WebmapPluginBaselayer {
  url?: string;
  /** Serialized to a {@link QMSDetailEntry} */
  qms?: string | null;
  display_name: string;
  copyright_text?: string | null;
  copyright_url?: string | null;
  enabled: boolean;
  opacity: number | null;
  position: number;
  resource_id: number;
}

export interface WebmapPluginConfig {
  basemaps: WebmapPluginBaselayer[];
  disable: boolean;
  background_color: string | null;
}

export interface BasemapConfig {
  keyname: string;
  url: string;
  display_name: string;
  epsg?: number | null;
  opacity?: number | null;
  enabled?: boolean | null;
  copyright_text?: string | null;
  copyright_url?: string | null;
  z_min?: number | null;
  z_max?: number | null;
}

// NOTE: Only TMS services are supported at this point, this can be extended in
// the future to support vector tiles, WMS, etc.

export interface QMSSearchEntry {
  id: number;
  type: "tms";
  name: string;
}

export interface QMSDetailEntry extends QMSSearchEntry {
  url: string;
  epsg: number;
  z_min: number;
  z_max: number;
  copyright_text: string;
  copyright_url: string;
}
