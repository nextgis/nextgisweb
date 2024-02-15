import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import {
    formatCoordinatesValue,
    formatMetersArea,
    formatMetersLength,
} from "@nextgisweb/webmap/utils/format-units";
import type { DefaultConfig } from "@nextgisweb/webmap/utils/format-units";
import { getGeometryTypeTitle } from "@nextgisweb/webmap/utils/geometry-types";

import type { GeometryInfo } from "../type/GeometryInfo";

import "./GeometryInfo.less";

const locale = dojoConfig.locale;
const formatConfig: DefaultConfig = {
    format: "jsx",
    locale,
};

const formatLength = (length: number) =>
    formatMetersLength(length, webmapSettings.units_length, formatConfig);
const formatArea = (area: number) =>
    formatMetersArea(area, webmapSettings.units_area, formatConfig);

export function GeometryInfo({
    layerId,
    featureId,
}: {
    layerId: number;
    featureId: number;
}) {
    const {
        data: geometryInfo,
        isLoading,
        error,
    } = useRouteGet<GeometryInfo>({
        name: "feature_layer.feature.geometry_info",
        params: {
            id: layerId,
            fid: featureId,
        },
        options: {
            query: {
                srs: webmapSettings.measurement_srid,
            },
        },
    });

    if (isLoading) {
        return (
            <div className="loading">
                <Spin />
                <div>{gettext("Load geometry info...")}</div>
            </div>
        );
    }

    if (error || !geometryInfo) {
        return (
            <div className="error">
                <div>
                    {gettext("Failed to get information about the geometry")}
                </div>
            </div>
        );
    }

    const length = geometryInfo.length !== null && (
        <tr>
            <td>
                {geometryInfo.type.toLowerCase().includes("polygon")
                    ? gettext("Perimeter")
                    : gettext("Length")}
            </td>
            <td>{formatLength(geometryInfo.length)}</td>
        </tr>
    );

    const area = geometryInfo.area !== null && (
        <tr>
            <td>{gettext("Area")}</td>
            <td>{formatArea(geometryInfo.area)}</td>
        </tr>
    );
    return (
        <table className="geometry-info-table">
            <tbody>
                <tr>
                    <td>{gettext("Geometry type")}</td>
                    <td>
                        {getGeometryTypeTitle(geometryInfo.type.toLowerCase())}
                    </td>
                </tr>
                {length}
                {area}
                <tr>
                    <td>{gettext("Extent (xMin)")}</td>
                    <td>{formatCoordinatesValue(geometryInfo.extent.minX)}</td>
                </tr>
                <tr>
                    <td>{gettext("Extent (yMin)")}</td>
                    <td>{formatCoordinatesValue(geometryInfo.extent.minY)}</td>
                </tr>
                <tr>
                    <td>{gettext("Extent (xMax)")}</td>
                    <td>{formatCoordinatesValue(geometryInfo.extent.maxX)}</td>
                </tr>
                <tr>
                    <td>{gettext("Extent (yMax)")}</td>
                    <td>{formatCoordinatesValue(geometryInfo.extent.maxY)}</td>
                </tr>
            </tbody>
        </table>
    );
}
