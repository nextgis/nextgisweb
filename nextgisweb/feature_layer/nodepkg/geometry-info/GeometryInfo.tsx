import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";

import type { GeometryInfo } from "../type/GeometryInfo";

import { GeometryInfoPreview } from "./component/GeometryInfoPreview";
import { GeometryInfoTable } from "./component/GeometryInfoTable";

import "./GeometryInfo.less";

interface GeometryInfoProps {
    resourceId: number;
    featureId: number;
    showPreview?: boolean;
}

export function GeometryInfo({
    resourceId,
    featureId,
    showPreview,
}: GeometryInfoProps) {
    const {
        data: geometryInfo,
        isLoading,
        error,
    } = useRouteGet<GeometryInfo>({
        name: "feature_layer.feature.geometry_info",
        params: {
            id: resourceId,
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

    return (
        <>
            {showPreview && (
                <GeometryInfoPreview
                    geometryInfo={geometryInfo}
                    resourceId={resourceId}
                    featureId={featureId}
                />
            )}
            <GeometryInfoTable geometryInfo={geometryInfo} />
        </>
    );
}
