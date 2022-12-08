import {useEffect, useState} from "react";
import PropTypes from "prop-types";
import {Spin} from "@nextgisweb/gui/antd";

import {route} from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import {
    formatMetersLength,
    formatMetersArea,
    formatCoordinatesValue
} from "@nextgisweb/webmap/utils/format-units";
import {
    getGeometryTypeTitle
} from "@nextgisweb/webmap/utils/geometry-types";

import "./GeometryInfo.less";

const loadGeometryInfo = async (layerId, featureId) => {
    const geoInfoRoute = route("feature_layer.feature.geometry_info", {
        id: layerId,
        fid: featureId
    });
    const query = {
        srs: webmapSettings.measurement_srid
    };
    return await geoInfoRoute.get({query});
};

const locale = window.dojoConfig.locale;
const formatConfig = {
    format: "jsx",
    locale
};

const formatLength = (length) => formatMetersLength(length, webmapSettings.units_length, formatConfig);
const formatArea = (area) => formatMetersArea(area, webmapSettings.units_area, formatConfig);

export function GeometryInfo({layerId, featureId}) {
    const [status, setStatus] = useState("loading");
    const [geometryInfo, setGeometryInfo] = useState(undefined);

    async function load() {
        try {
            const geometryInfo = await loadGeometryInfo(layerId, featureId);
            setGeometryInfo(geometryInfo);
            setStatus("loaded");
        } catch (err) {
            setStatus("error");
        }
    }

    useEffect(() => load(), []);

    if (status === "loading") {
        return (
            <div className="loading">
                <Spin/>
                <div>
                    {i18n.gettext("Load geometry info...")}
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="error">
                <div>
                    {i18n.gettext("Failed to get information about the geometry")}
                </div>
            </div>
        );
    }

    const length = geometryInfo.length == null ? <></> : (
        <tr>
            <td>
                {
                    geometryInfo.type.toLowerCase().includes("polygon") ?
                        i18n.gettext("Perimeter") : i18n.gettext("Length")
                }
            </td>
            <td>
                {formatLength(geometryInfo.length)}
            </td>
        </tr>
    );

    const area = geometryInfo.area == null ? <></> : (
        <tr>
            <td>
                {i18n.gettext("Area")}
            </td>
            <td>
                {formatArea(geometryInfo.area)}
            </td>
        </tr>
    );

    return (
        <>
            <table className="geometry-info-table">
                <tbody>
                <tr>
                    <td>
                        {i18n.gettext("Geometry type")}
                    </td>
                    <td>
                        {getGeometryTypeTitle(geometryInfo.type.toLowerCase())}
                    </td>
                </tr>
                {length}
                {area}
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMin)")}
                    </td>
                    <td>
                        {formatCoordinatesValue(geometryInfo.extent.minX)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMin)")}
                    </td>
                    <td>
                        {formatCoordinatesValue(geometryInfo.extent.minY)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMax)")}
                    </td>
                    <td>
                        {formatCoordinatesValue(geometryInfo.extent.maxX)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMax)")}
                    </td>
                    <td>
                        {formatCoordinatesValue(geometryInfo.extent.maxY)}
                    </td>
                </tr>
                </tbody>
            </table>
        </>
    );
}

GeometryInfo.propTypes = {
    layerId: PropTypes.number,
    featureId: PropTypes.number
};
