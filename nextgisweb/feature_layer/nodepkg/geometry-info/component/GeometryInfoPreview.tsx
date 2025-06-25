import type { FeatureLike } from "ol/Feature";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import type { Options as StyleOptions } from "ol/style/Style";
import { useMemo } from "react";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { NGWLayer } from "@nextgisweb/webmap/map-component/NGWLayer";
import type { LayerOptions } from "@nextgisweb/webmap/map-component/hook/useNGWLayer";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import type { GeometryInfo } from "../../type/GeometryInfo";

export function getFeatureStyle(
    feature: FeatureLike,
    isHighlighted?: boolean
): Style | void {
    const strokeAlpha = isHighlighted ? 1 : 0.1;
    const fillAlpha = isHighlighted ? 0.25 : 0.05;

    const colorRGB = isHighlighted ? "255,0,255" : "0,0,255";

    const stroke = new Stroke({
        color: `rgba(${colorRGB}, ${strokeAlpha})`,
        width: 2,
    });
    const fill = new Fill({
        color: `rgba(${colorRGB}, ${fillAlpha})`,
    });

    const styleOptions: StyleOptions = {
        stroke,
        fill,
        zIndex: isHighlighted ? 1000 : 0,
    };

    const geometry = feature.getGeometry();
    if (geometry) {
        const geomType = geometry.getType();
        if (geomType === "Point" || geomType === "MultiPoint") {
            styleOptions.image = new Circle({
                radius: 5,
                fill,
                stroke,
            });
        }
        return new Style(styleOptions);
    }
}

function convertExtentToNgwExtent(extent: GeometryInfo["extent"]): NgwExtent {
    return {
        minLon: extent.minX,
        minLat: extent.minY,
        maxLon: extent.maxX,
        maxLat: extent.maxY,
    };
}

export function GeometryInfoPreview({
    geometryInfo,
    resourceId,
    featureId,
    height = 300,
    srid = 4326,
}: {
    srid?: number;
    height?: number;
    resourceId: number;
    featureId: number;
    geometryInfo: GeometryInfo;
}) {
    const layerOptions = useMemo<LayerOptions>(() => {
        return {
            style: (feature) => {
                const isHighlighted =
                    String(feature.getId()) === String(featureId);
                return getFeatureStyle(feature, isHighlighted);
            },
        };
    }, [featureId]);

    return (
        <PreviewMap
            basemap
            style={{ width: "100%", height: `${height}px` }}
            mapExtent={{
                extent: convertExtentToNgwExtent(geometryInfo.extent),
                srs: { id: srid },
                maxZoom: 18,
            }}
        >
            <NGWLayer
                resourceId={resourceId}
                layerType="MVT"
                layerOptions={layerOptions}
            />
        </PreviewMap>
    );
}
