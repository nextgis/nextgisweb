import type { QueryParams } from "package/nextgisweb/nextgisweb/feature_layer/nodepkg/feature-grid/hook/useFeatureTable";

import type {
    FeatureExtent,
    NgwExtent,
} from "@nextgisweb/feature-layer/type/FeatureExtent";
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
        const resp = await route.get<FeatureExtent>({
            query: queryParams || undefined,
            cache: true,
        });
        onZoomToFiltered(resp.extent);
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
