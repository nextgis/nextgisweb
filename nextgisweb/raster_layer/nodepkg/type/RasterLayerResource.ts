interface Srs {
    id: number;
}

export interface RasterLayerResource {
    srs: Srs;
    xsize: number;
    ysize: number;
    band_count: number;
    color_interpretation: string[];
    cog: boolean;
    dtype: string;
}
