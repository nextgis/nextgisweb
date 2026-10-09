import { useCallback } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { MapExtent } from "@nextgisweb/webmap/map-adapter";
import {
  DEFAULT_EXTENT_SRS,
  DEFAULT_FIT_PADDING,
} from "@nextgisweb/webmap/map-adapter/constant";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";

import { fetchResourceExtent } from "../fetchResourceExtent";

import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export function ZoomToResourceBtn({
  resourceId,
  padding = DEFAULT_FIT_PADDING,
  srs = DEFAULT_EXTENT_SRS,
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
