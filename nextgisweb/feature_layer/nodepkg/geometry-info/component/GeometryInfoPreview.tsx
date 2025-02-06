import type { FeatureLike } from "ol/Feature";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useMemo } from "react";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { NGWLayer } from "@nextgisweb/webmap/map-component/NGWLayer";
import type { LayerOptions } from "@nextgisweb/webmap/map-component/hook/useNGWLayer";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import type { GeometryInfo } from "../../type/GeometryInfo";

function getFeatureStyle(
    feature: FeatureLike,
    isHighlighted: boolean
): Style | void {
    const strokeAlpha = isHighlighted ? 1 : 0.3;
    const fillAlpha = isHighlighted ? 0.5 : 0.1;

    const stroke = new Stroke({
        color: `rgba(0, 0, 255, ${strokeAlpha})`,
        width: 2,
    });
    const fill = new Fill({
        color: `rgba(0, 0, 255, ${fillAlpha})`,
    });

    const geometry = feature.getGeometry();
    if (geometry) {
        const geomType = geometry.getType();
        if (geomType === "Point" || geomType === "MultiPoint") {
            return new Style({
                image: new Circle({
                    radius: 5,
                    fill,
                    stroke,
                }),
            });
        }

        return new Style({
            stroke,
            fill,
        });
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
}: {
    geometryInfo: GeometryInfo;
    height?: number;
    resourceId: number;
    featureId: number;
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
                srs: { id: 4326 },
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
