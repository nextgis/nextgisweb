interface Extent {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface GeometryInfo {
    area: number;
    extent: Extent;
    length: number;
    type: string;
}
