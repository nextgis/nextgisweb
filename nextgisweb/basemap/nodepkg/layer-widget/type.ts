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
    cumulative_status: string;
    url: string;
    alt_urls: string[];
    origin_url: string;
    guid: string;
    name: string;
    desc: string;
    type: "tms" | "wms";
    epsg: number;
    license_name: string | null;
    license_url: string;
    copyright_text: string;
    copyright_url: string;
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
    z_min: number;
    z_max: number;
    y_origin_top: boolean;
    icon: string | null;
    submitter: string;
    last_status: number;
}
