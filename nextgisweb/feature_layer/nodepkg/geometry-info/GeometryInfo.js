import {useEffect, useState} from "react";
import PropTypes from "prop-types";
import {Spin} from "@nextgisweb/gui/antd";

import {route} from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";

import "./GeometryInfo.less";

const loadGeometryInfo = async (layerId, featureId) => {
    const geoInfoRoute = route("feature_layer.feature.geometry_info", {
        id: layerId,
        fid: featureId
    });
    return await geoInfoRoute.get();
};

const formatDecimalValues = (num) => {
    return Math.round(num * 100) / 100;
};

export function GeometryInfo({layerId, featureId}) {
    const [status, setStatus] = useState("loading");
    const [geometryInfo, setGeometryInfo] = useState(undefined);

    async function load() {
        try {
            const geometryInfo = await loadGeometryInfo(layerId, featureId);
            console.log(geometryInfo);
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

    return (
        <>
            <table className="geometry-info-table">
                <tbody>
                <tr>
                    <td>
                        {i18n.gettext("Length")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.length).toLocaleString()}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Area")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.area).toLocaleString()}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMin)")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.extent.minLon).toLocaleString()}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMin)")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.extent.minLat).toLocaleString()}<br/>
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (xMax)")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.extent.maxLon).toLocaleString()}
                    </td>
                </tr>
                <tr>
                    <td>
                        {i18n.gettext("Extent (yMax)")}
                    </td>
                    <td>
                        {formatDecimalValues(geometryInfo.extent.maxLat).toLocaleString()}
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
