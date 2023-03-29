import { PropTypes } from "prop-types";

import { useEffect, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";

import ZoomInMap from "@material-icons/svg/zoom_in_map";

const zoomToFilteredMsg = i18n.gettext("Zoom to filtered features");

export const ZoomToFilteredBtn = ({
    id,
    query,
    size = "middle",
    onZoomToFiltered,
}) => {
    const {
        data: extentData,
        refresh: refreshExtent,
        isLoading: loading,
    } = useRouteGet(
        "feature_layer.feature.extent",
        { id },
        { query: { ilike: query } }
    );

    const [extentCache, setExtentCache] = useState();

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
            title={zoomToFilteredMsg}
            icon={<ZoomInMap />}
            onClick={click}
            size={size}
            loading={loading}
        />
    );
};

ZoomToFilteredBtn.propTypes = {
    query: PropTypes.string,
    id: PropTypes.number,
    size: PropTypes.oneOf(["small", "middle", "large"]),
    onZoomToFiltered: PropTypes.func,
};
