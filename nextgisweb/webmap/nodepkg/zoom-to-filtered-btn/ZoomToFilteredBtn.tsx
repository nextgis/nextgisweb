import type { QueryParams } from "@nextgisweb/feature-layer/feature-grid/hook/useFeatureTable";
import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { Button } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import { useRoute } from "@nextgisweb/pyramid/hook/useRoute";
import { gettext } from "@nextgisweb/pyramid/i18n";

import ZoomInMap from "@nextgisweb/icon/material/zoom_in_map";

interface ZoomToFilteredBtnProps {
    id: number;
    queryParams: QueryParams | null;
    size?: SizeType;
    onZoomToFiltered?: (val: NgwExtent) => void;
}

const msgZoomToFiltered = gettext("Zoom to filtered features");

export const ZoomToFilteredBtn = ({
    id,
    queryParams,
    size = "middle",
    onZoomToFiltered,
}: ZoomToFilteredBtnProps) => {
    const { route, isLoading } = useRoute("feature_layer.feature.extent", {
        id,
    });

    const click = async () => {
        if (!onZoomToFiltered) {
            return;
        }
        const resp = await route.get<NgwExtent>({
            query: queryParams || undefined,
            cache: true,
        });
        onZoomToFiltered(resp);
    };

    return (
        <Button
            type="text"
            title={msgZoomToFiltered}
            icon={<ZoomInMap />}
            onClick={click}
            size={size}
            loading={isLoading}
        />
    );
};
