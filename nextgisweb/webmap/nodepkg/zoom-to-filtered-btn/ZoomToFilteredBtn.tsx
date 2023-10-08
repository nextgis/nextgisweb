import { useEffect, useState } from "react";

import type {
    FeatureExtent,
    NgwExtent,
} from "@nextgisweb/feature-layer/type/FeatureExtent";
import { Button } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

import ZoomInMap from "@nextgisweb/icon/material/zoom_in_map";

interface ZoomToFilteredBtnProps {
    id: number;
    query: string;
    size?: SizeType;
    onZoomToFiltered?: (val: NgwExtent) => void;
}

const msgZoomToFiltered = gettext("Zoom to filtered features");

export const ZoomToFilteredBtn = ({
    id,
    query,
    size = "middle",
    onZoomToFiltered,
}: ZoomToFilteredBtnProps) => {
    const {
        data: extentData,
        refresh: refreshExtent,
        isLoading: loading,
    } = useRouteGet<FeatureExtent>(
        "feature_layer.feature.extent",
        { id },
        { query: { ilike: query } }
    );

    const [extentCache, setExtentCache] = useState<Record<string, NgwExtent>>();

    const click = () => {
        if (!onZoomToFiltered) {
            return;
        }

        if (extentCache && extentCache[query]) {
            onZoomToFiltered(extentCache[query]);
            return;
        }

        setExtentCache({});
        refreshExtent();
    };

    useEffect(() => {
        if (!onZoomToFiltered || !extentData || !extentCache) {
            return;
        }

        const { extent } = extentData;
        extentCache[query] = extent;
        onZoomToFiltered(extent);
    }, [extentData]);

    return (
        <Button
            type="text"
            title={msgZoomToFiltered}
            icon={<ZoomInMap />}
            onClick={click}
            size={size}
            loading={loading}
        />
    );
};
