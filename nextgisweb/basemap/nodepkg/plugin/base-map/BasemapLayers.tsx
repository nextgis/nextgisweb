import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import type { WebmapPluginConfig } from "@nextgisweb/basemap/layer-widget/type";
import {
  addBaselayer,
  prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";

function removeBaselayer(map: MapStore, layer: CoreLayer) {
  if (map.layers[layer.name] === layer) {
    map.removeLayer(layer);
  } else {
    map.olMap.removeLayer(layer.getLayer());
  }
  layer.dispose();
}

const BasemapLayers = observer(
  ({ display, identity }: { display: Display; identity: string }) => {
    const { mapStore } = useMapContext();

    const wmplugin = display.config.webmapPlugin[
      identity
    ] as WebmapPluginConfig;

    const basemaps = wmplugin.basemaps.length
      ? wmplugin.basemaps
      : settings.basemaps;

    useEffect(() => {
      const activeBasemapKey = mapStore.baseLayer
        ? mapStore.activeBasemapKey
        : undefined;
      const preferredBasemapKey = display.urlParams.base ?? activeBasemapKey;
      const layers: CoreLayer[] = [];
      let cancelled = false;

      const addLayer = async (
        config: ReturnType<typeof prepareBaselayerConfig>
      ) => {
        const layer = await addBaselayer({ ...config, map: mapStore });
        if (!layer) {
          return;
        }
        if (cancelled) {
          removeBaselayer(mapStore, layer);
          return;
        }

        layers.push(layer);
      };

      const setup = async () => {
        let hasDefault = false;

        for (const [idx, sourceBasemap] of basemaps.entries()) {
          if (cancelled) {
            return;
          }

          const basemap = {
            ...sourceBasemap,
            keyname:
              "keyname" in sourceBasemap
                ? sourceBasemap.keyname
                : `basemap_${idx}`,
          };
          if (basemap.enabled && !hasDefault) {
            hasDefault = true;
          } else {
            basemap.enabled = false;
          }

          try {
            await addLayer(prepareBaselayerConfig(basemap));
          } catch {
            //
          }
        }

        if (cancelled) {
          return;
        }
        try {
          await addLayer({
            keyname: "blank",
            layer: {
              title: gettext("No basemap"),
              visible: !hasDefault,
            },
            source: {},
          });
        } catch {
          //
        }

        if (preferredBasemapKey && !cancelled) {
          mapStore.switchBasemap(preferredBasemapKey);
        }
      };

      setup();

      return () => {
        cancelled = true;
        layers.forEach((layer) => removeBaselayer(mapStore, layer));
      };
    }, [basemaps, mapStore, display.urlParams.base]);

    return null;
  }
);

BasemapLayers.displayName = "BasemapLayers";
export default BasemapLayers;
