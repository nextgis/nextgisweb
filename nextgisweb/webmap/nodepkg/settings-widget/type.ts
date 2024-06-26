import type { ResourceRef } from "@nextgisweb/resource/type/api";

export type AnnotationType = "no" | "yes" | "messages";

export interface SettingsValue {
    editable?: boolean;
    annotationEnabled?: boolean;
    annotationDefault?: AnnotationType;
    legendSymbols?: string | undefined;
    measureSrs?: number;
    extentLeft: number;
    extentRight: number;
    extentBottom: number;
    extentTop: number;
    extentConstLeft: number;
    extentConstRight: number;
    extentConstBottom: number;
    extentConstTop: number;
    bookmarkResource: ResourceRef | null;
}

export type ExtentKeys = "top" | "left" | "right" | "bottom";

export type Extent = Partial<Record<ExtentKeys, number | null>>;
