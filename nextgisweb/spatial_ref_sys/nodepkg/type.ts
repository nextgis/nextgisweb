export interface SpatialReferenceSystem {
    id: number;
    display_name: string;
    auth_name: string;
    auth_srid: number;
    wkt: string;
    catalog_id?: number;
    system: boolean;
    protected: boolean;
    geographic: boolean;
}

export interface SRSItem {
    id: number;
    auth_name?: string;
    auth_srid?: string;
    display_name: string;
    wkt?: string;
    system?: boolean;
    protected?: boolean;
}

export interface RefSysConvertPostResp {
    wkt?: string;
    error?: string;
}
