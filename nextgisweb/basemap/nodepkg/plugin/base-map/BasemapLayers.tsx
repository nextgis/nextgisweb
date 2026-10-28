import { observer } from "mobx-react-lite";
import { useEffect, useMemo } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import type { WebmapPluginConfig } from "@nextgisweb/basemap/layer-widget/type";
import { prepareBaselayerConfig } from "@nextgisweb/basemap/util/baselayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import { useBaselayers } from "@nextgisweb/webmap/map-component/hook/useBaselayers";

const BasemapLayers = observer(
  ({ display, identity }: { display: Display; identity: string }) => {
    const { mapStore } = useMapContext();
    const { targetElement, adapter } = mapStore;

    const wmplugin = display.config.webmapPlugin[
      identity
    ] as WebmapPluginConfig;

    const disabled = wmplugin.disable;
    const backgroundColor = wmplugin.background_color;

    const basemaps = useMemo(() => {
      if (disabled) return [];

      const sourceBasemaps = wmplugin.basemaps.length
        ? wmplugin.basemaps
        : settings.basemaps;
      let hasDefault = false;
      const configs = sourceBasemaps.map((sourceBasemap, idx) => {
        const enabled = Boolean(sourceBasemap.enabled && !hasDefault);
        if (enabled) hasDefault = true;

        return prepareBaselayerConfig({
          ...sourceBasemap,
          keyname:
            "keyname" in sourceBasemap
              ? sourceBasemap.keyname
              : `basemap_${idx}`,
          enabled,
        });
      });

      configs.push({
        name: "blank",
        title: gettext("No basemap"),
        layer: {
          visible: !hasDefault,
        },
        source: {},
      });
      return configs;
    }, [disabled, wmplugin.basemaps]);

    useBaselayers({ mapStore, basemaps, baseKey: display.urlParams.base });

    useEffect(() => {
      const color = backgroundColor ? `#${backgroundColor}` : "";
      adapter.setBackgroundColor?.(color);
      if (!targetElement) {
        return;
      }
      targetElement.style.backgroundColor = color;
      return () => {
        targetElement.style.backgroundColor = "";
      };
    }, [targetElement, adapter, backgroundColor]);

    return null;
  }
);

BasemapLayers.displayName = "BasemapLayers";
export default BasemapLayers;
