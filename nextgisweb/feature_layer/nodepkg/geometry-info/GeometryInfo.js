import {useEffect, useState} from "react";
import PropTypes from "prop-types";
import {Spin} from "@nextgisweb/gui/antd";

import {route} from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import {formatMetersLength, formatMetersArea} from "@nextgisweb/webmap/utils/format-units";

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

const formatExtentValue = (number) => {
    const numberRound = Math.round(number * 100) / 100;
    return numberRound.toLocaleString(locale);
};

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
                {i18n.gettext("Length")}
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
                {length}
                {area}
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMin)")}
                    </td>
                    <td>
                        {formatExtentValue(geometryInfo.extent.minLon)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMin)")}
                    </td>
                    <td>
                        {formatExtentValue(geometryInfo.extent.minLat)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMax)")}
                    </td>
                    <td>
                        {formatExtentValue(geometryInfo.extent.maxLon)}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMax)")}
                    </td>
                    <td>
                        {formatExtentValue(geometryInfo.extent.maxLat)}
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
