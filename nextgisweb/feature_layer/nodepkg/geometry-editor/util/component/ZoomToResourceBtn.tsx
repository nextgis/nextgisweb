import { useCallback } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import type { MapExtent } from "@nextgisweb/webmap/ol/MapStore";

import { DEFAULT_PADDING, DEFAULT_SRS } from "../../constant";
import { fetchResourceExtent } from "../fetchResourceExtent";

import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export function ZoomToResourceBtn({
    resourceId,
    padding = DEFAULT_PADDING,
    srs = DEFAULT_SRS,
}: { resourceId: number } & Partial<Omit<MapExtent, "extent">>) {
    const { makeSignal, abort } = useAbortController();
    const { mapStore } = useMapContext();

    const setLayerExtent = useCallback(async () => {
        abort();

        const signal = makeSignal();
        const extent = await fetchResourceExtent({ signal, resourceId });
        if (extent) {
            mapStore?.fitNGWExtent({ padding, srs, extent });
        }
    }, [abort, makeSignal, mapStore, padding, resourceId, srs]);

    return (
        <ButtonControl
            position="top-left"
            onClick={setLayerExtent}
            title={gettext("Zoom to layer extent")}
        >
            <ZoomInMapIcon />
        </ButtonControl>
    );
}
