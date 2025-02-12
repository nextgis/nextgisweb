import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { GeometryInfoPreview } from "./component/GeometryInfoPreview";
import { GeometryInfoTable } from "./component/GeometryInfoTable";

import "./GeometryInfo.less";

interface GeometryInfoProps {
    showPreview?: boolean;
    resourceId: number;
    featureId: number;
    showInfo?: boolean;
    srid?: number;
}

export function GeometryInfo({
    showPreview,
    resourceId,
    featureId,
    showInfo,
    srid = 4326,
}: GeometryInfoProps) {
    const {
        data: geometryInfo,
        isLoading,
        error,
    } = useRouteGet({
        name: "feature_layer.feature.geometry_info",
        params: {
            id: resourceId,
            fid: featureId,
        },
        options: {
            query: {
                srs: srid,
            },
        },
    });

    if (isLoading) {
        return (
            <div className="ngw-feature-layer-geometry-info-loading">
                <Spin />
                <div>{gettext("Load geometry info...")}</div>
            </div>
        );
    }

    if (error || !geometryInfo) {
        return (
            <div className="ngw-feature-layer-geometry-info-error">
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
                    srid={srid}
                />
            )}
            {showInfo && <GeometryInfoTable geometryInfo={geometryInfo} />}
        </>
    );
}
