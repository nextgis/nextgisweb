import type { BookmarkResource } from "../type/WebmapResource";

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
    bookmarkResource: BookmarkResource | null;
}

export type ExtentKeys = "top" | "left" | "right" | "bottom";

export type Extent = Partial<Record<ExtentKeys, number | null>>;
