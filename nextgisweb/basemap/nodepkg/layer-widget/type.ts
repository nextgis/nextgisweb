export interface WebmapPluginBaselayer {
    url?: string;
    /** Serialized to a {@link QMSService} */
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
    [name: string]: Record<string, any>;
    basemaps: WebmapPluginBaselayer[];
}

export interface BasemapConfig {
    keyname: string;
    url: string;
    display_name: string;
    epsg?: number;
    opacity?: number;
    enabled?: boolean;
    copyright_text?: string | null;
    copyright_url?: string | null;
}

export interface QMSSearch {
    id: number;
    guid: string;
    name: string;
    desc: string;
    type: "tms" | "wms";
    epsg: number;
    icon: string | null;
    submitter: string;
    created_at: string;
    updated_at: string;
    cumulative_status: string;
    extent: string;
    is_draft: boolean;
    dt_want_publish: string | null;
    cors_status: "enabled" | "disabled";
}

export interface QMSService {
    id: number;
    url: string;
    type: "tms" | "wms";
    copyright_text: string;
    copyright_url: string;
    y_origin_top: boolean;
    epsg: number;
    z_min: number;
    z_max: number;
    // The props below are provided but not used.
    cumulative_status: string;
    alt_urls: string[];
    origin_url: string;
    guid: string;
    name: string;
    desc: string;
    license_name: string | null;
    license_url: string;
    terms_of_use_url: string | null;
    created_at: string;
    updated_at: string;
    source: string;
    source_url: string | null;
    extent: string;
    boundary: string;
    boundary_area: number;
    is_draft: boolean;
    dt_want_publish: string | null;
    dt_latest_monitoring: string;
    cors_status: "enabled" | "disabled";
    url_denormalized: string;
    duplicates_code: string;
    icon: string | null;
    submitter: string;
    last_status: number;
}
