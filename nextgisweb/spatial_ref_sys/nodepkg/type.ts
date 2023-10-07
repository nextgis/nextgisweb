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
