import { Feature } from "ol";
import { asArray, asString } from "ol/color";
import { WKT } from "ol/format";
import type { Geometry } from "ol/geom";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import type { Options as StyleOptions } from "ol/style/Style";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { MapStore } from "../../ol/MapStore";

import { AnnotationsPopup } from "./AnnotationsPopup";

export type AccessType = "public" | "private" | "own" | null;

interface AnnotationStyle {
    circle: {
        radius: number;
        stroke: {
            color: string;
            width: number;
        };
        fill: {
            color: string;
        };
    };
}

export interface FeatureInfo {
    geom?: string;
    description?: string;
    style?: AnnotationStyle;
}

// TODO: typegen for webmap.annotation.item webmap.annotation.collection get response
export interface AnnotationInfo {
    id?: number;
    geom?: string;
    description?: string;
    style?: AnnotationStyle;
    public?: boolean;
    own?: boolean;
    user?: string;
}

export interface AnnotationFeatureOptions {
    editable?: boolean;
    annotationInfo?: AnnotationInfo;
    feature?: Feature;
}

const wkt = new WKT();
const defaultDescription = gettext("Your annotation text");
const defaultStyle: AnnotationStyle = {
    circle: {
        radius: 5,
        stroke: { color: "#d27a00", width: 1 },
        fill: { color: "#FF9800" },
    },
};
const hideStyle = new Style();

export class AnnotationFeature {
    private _feature?: Feature;
    private _editable: boolean;
    private _accessType: AccessType = null;
    private _style?: Style;
    private _visible: boolean = true;
    private _popupVisible: boolean | null = null;

    constructor({
        editable,
        annotationInfo,
        feature,
    }: AnnotationFeatureOptions) {
        this._editable = editable || false;

        if (annotationInfo) {
            this._buildFromAnnotationInfo(annotationInfo);
        }
        if (feature) {
            this._buildFromFeature(feature);
        }
    }

    private _buildFromAnnotationInfo(annotationInfo: AnnotationInfo): void {
        const geom = wkt.readGeometry(annotationInfo.geom);
        const feature = new Feature({
            geometry: geom,
        });

        feature.setId(annotationInfo.id);

        this._style = this._buildStyle(annotationInfo);
        feature.setStyle(this._style);

        feature.setProperties({
            info: annotationInfo,
            annFeature: this,
        });

        this._feature = feature;
        this.calculateAccessType();

        const popup = new AnnotationsPopup(
            this,
            this._editable,
            annotationInfo
        );
        feature.setProperties({
            popup: popup,
        });
    }

    private _buildFromFeature(feature: Feature): void {
        const geom = feature.getGeometry();
        const info: FeatureInfo = {
            description: defaultDescription,
            style: defaultStyle,
            geom: geom ? wkt.writeGeometry(geom) : undefined,
        };

        feature.setProperties({
            info,
            popup: new AnnotationsPopup(this),
            annFeature: this,
        });

        this._feature = feature;
    }

    clearOlFeature(): void {
        delete this._feature;
    }

    isNew(): boolean {
        return typeof this._feature?.getId() === "undefined";
    }

    getId(): number | string | undefined {
        return this._feature?.getId();
    }

    setId(id: number | string): void {
        this._feature?.setId(id);
    }

    getAnnotationInfo(): AnnotationInfo | null {
        const feature = this.getFeature();
        if (!feature) return null;
        return feature.get("info") as FeatureInfo;
    }

    getPopup(): AnnotationsPopup {
        return this._feature?.get("popup") as AnnotationsPopup;
    }

    getDescriptionAsHtml(): string {
        const info = this._feature?.get("info") as FeatureInfo;
        if (!info || !info.description) return "";
        return this.decodeHtmlEntities(info.description);
    }

    private decodeHtmlEntities(text: string): string {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    }

    getFeature(): Feature | undefined {
        return this._feature;
    }

    getAccessType(): AccessType {
        return this._accessType;
    }

    getAccessTypeTitle(): string | null {
        const annotationInfo = this.getAnnotationInfo();
        if (!annotationInfo) return null;

        const accessType = this.getAccessType();
        if (!accessType) return null;

        switch (accessType) {
            case "public":
                return gettext("Public annotation");
            case "own":
                return gettext("My private annotation");
            case "private":
                return `${gettext("Private annotation")} (${annotationInfo.user})`;
            default:
                return null;
        }
    }

    updateGeometry(geometry: Geometry): void {
        if (this._feature) {
            const annotationInfo = this._feature.get("info") as FeatureInfo;
            annotationInfo.geom = wkt.writeGeometry(geometry);
            this._feature.setGeometry(geometry);
        }
    }

    updateAnnotationInfo(annotationInfo: AnnotationInfo): void {
        if (this._feature) {
            this.setId(annotationInfo.id!);
            this._style = this._buildStyle(annotationInfo);
            this._feature.setStyle(this._style);

            this._feature.setProperties({
                info: annotationInfo,
            });

            this.calculateAccessType();
            this.updatePopup();
        }
    }

    updatePopup(): void {
        if (this._feature) {
            const popup = this._feature.get("popup") as AnnotationsPopup;
            popup.update();
        }
    }

    private _buildStyle(annotationInfo: AnnotationInfo): Style {
        return "style" in annotationInfo && annotationInfo.style
            ? this.jsonStyleToOlStyle(annotationInfo.style)
            : new Style(defaultStyle as StyleOptions);
    }

    jsonStyleToOlStyle(jsonStyle: AnnotationStyle | string): Style {
        if (!jsonStyle) return new Style();

        if (typeof jsonStyle === "string") {
            jsonStyle = JSON.parse(jsonStyle) as AnnotationStyle;
        }

        if (jsonStyle.circle.fill && jsonStyle.circle.fill.color) {
            const color = jsonStyle.circle.fill.color;
            const [r, g, b] = Array.from(asArray(color));
            jsonStyle.circle.fill.color = asString([r, g, b, 0.3]);
        }

        return new Style({
            image: new CircleStyle({
                radius: jsonStyle.circle.radius,
                fill: new Fill(jsonStyle.circle.fill),
                stroke: new Stroke(jsonStyle.circle.stroke),
            }),
            fill: new Fill(jsonStyle.circle.fill),
            stroke: new Stroke(jsonStyle.circle.stroke),
        });
    }

    calculateAccessType(): void {
        const props = this._feature?.getProperties();
        if (!props) {
            return;
        }
        if (!props["info"]) {
            this._accessType = null;
            return;
        }

        const { info } = props;

        if (info.public) {
            this._accessType = "public";
        } else if (info.own) {
            this._accessType = "own";
        } else {
            this._accessType = "private";
        }
    }

    toggleVisible(visible: boolean): boolean {
        if ((visible && this._visible) || (!visible && !this._visible)) {
            return false;
        }
        this.getFeature()?.setStyle(visible ? this._style : hideStyle);
        this._visible = visible;
        return true;
    }

    togglePopup(visible: boolean, map?: MapStore): boolean {
        if (
            (visible && this._popupVisible) ||
            (!visible && !this._popupVisible)
        ) {
            return false;
        }

        const popup = this.getPopup();
        if (visible && map) {
            popup.addToMap(map).show();
        } else {
            popup.remove();
        }
        this._popupVisible = visible;
        return true;
    }
}
