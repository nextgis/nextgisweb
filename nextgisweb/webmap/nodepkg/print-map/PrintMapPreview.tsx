import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import { View } from "ol";
import { unByKey } from "ol/Observable";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import CompanyLogoControl from "@nextgisweb/pyramid/company-logo/CompanyLogoControl";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { imageQueue } from "@nextgisweb/pyramid/util";

import type { Display } from "../display";
import { PanelMapComponents } from "../display/component/map-panel/PanelMapComponents";
import { PluginMapComponents } from "../display/component/map-panel/PluginMapComponents";
import { WebmapLayers } from "../display/component/map-panel/WebmapLayers";
import { MapComponent } from "../map-component";
import RotateControl from "../map-component/control/RotateControl";
import { GraticuleLayer } from "../map-component/layer/GraticuleLayer";
import { MapStore } from "../ol/MapStore";
import { hasOlMap } from "../ol/util/hasOlMap";

import { PrintScaleToolbar } from "./PrintScaleToolar";
import type { PrintMapStore } from "./store";

export interface PrintMapPreviewProps {
  style?: CSSProperties;
  display: Display;
  className?: string;
  printMapStore: PrintMapStore;
}

export const PrintMapPreview = observer(
  ({ display, printMapStore }: PrintMapPreviewProps) => {
    const measureSrsId = display.map.measureSrsId;
    const [mapStore] = useState(() => {
      const view = new View({
        maxZoom: display.map.maxZoom,
        extent: display.map.constrainingExtent,
        projection: display.map.displayProjection,
        constrainResolution: false,
        center: printMapStore.center ?? display.map.getViewState()?.center,
      });
      const mStore = new MapStore({
        view,
        controls: [],
        measureSrsId,
      });
      mStore.setBasemapConfigs(
        display.map.basemapConfigs,
        display.map.activeBasemapKey
      );
      return mStore;
    });

    const [mainMapLoaded, setMainMapLoaded] = useState(false);
    const mainMap = hasOlMap(display.map.adapter)
      ? display.map.adapter.map
      : undefined;

    const { adapter } = mapStore;
    const olMap = hasOlMap(adapter) ? adapter.map : undefined;
    const viewPrintMap = olMap?.getView();

    const {
      arrow,
      scale,
      width,
      height,
      margin,
      graticule,
      scaleLine,
      scaleValue,
    } = printMapStore;

    useEffect(() => {
      let cancelled = false;
      setMainMapLoaded(false);

      const startPrintMap = () => {
        imageQueue.waitAll().then(() => {
          if (!cancelled) {
            setMainMapLoaded(true);
          }
        });
      };

      // This is an important aspect not just for optimization
      // but also for handling the print map logic,
      // where after each position change, the map scale is rounded and the map view is redrawn.
      const renderCompleteKey = mainMap?.once("rendercomplete", () => {
        // If the display page opens in the print panel, the main map starts loading invisibly underneath.
        // Aborting the shared image queue too early prevents the main map from loading its layers.
        // So we have to wait until it's fully loaded before using the queue for the print map.
        startPrintMap();
      });
      if (mainMap) {
        mainMap.render();
      } else {
        startPrintMap();
      }

      return () => {
        cancelled = true;
        if (renderCompleteKey) {
          unByKey(renderCompleteKey);
        }
      };
    }, [mainMap]);

    useEffect(() => {
      if (!mapStore.ready || !viewPrintMap) return;

      const center = printMapStore.center;
      if (center) {
        viewPrintMap.setCenter(center);
      }

      const mainResolution =
        printMapStore.scale && mapStore.resolutionForScale(printMapStore.scale);
      if (mainResolution !== undefined) {
        viewPrintMap.setResolution(mainResolution);
      }

      const fireChangeCenter = () => {
        const centerPrintMap = viewPrintMap.getCenter();
        if (centerPrintMap) {
          printMapStore.update({ center: centerPrintMap });
        }
      };
      const viewCenterChange = debounce(fireChangeCenter, 100);
      const unCenterKey = viewPrintMap.on("change:center", viewCenterChange);
      fireChangeCenter();

      return () => {
        unByKey(unCenterKey);
        viewCenterChange.cancel();
      };
    }, [mapStore, mapStore.ready, viewPrintMap, printMapStore]);

    useEffect(() => {
      if (scale) {
        viewPrintMap?.setResolution(mapStore.resolutionForScale(scale));
      }
    }, [mapStore, viewPrintMap, scale]);

    const onChangeScale = useCallback(
      (scale: number) => {
        printMapStore.update({ scale });
      },
      [printMapStore]
    );
    const debouncedOnScaleChange = useDebounce(onChangeScale, 200);
    useEffect(() => {
      if (mapStore.scale !== undefined && mapStore.ready) {
        debouncedOnScaleChange(mapStore.scale);
      }
    }, [mapStore.ready, mapStore.scale, debouncedOnScaleChange]);

    useEffect(() => {
      mapStore.updateSize();
    }, [width, height, margin, mapStore]);

    if (!mainMapLoaded) return null;

    return (
      <MapComponent
        style={{ width: "100%", height: "100%" }}
        mapStore={mapStore}
      >
        <WebmapLayers treeStore={display.treeStore} />
        {pyramidSettings.company_logo.enabled && (
          <CompanyLogoControl position="bottom-right" />
        )}
        <PanelMapComponents display={display} />
        <PluginMapComponents display={display} />
        {arrow && (
          <RotateControl
            autoHide={false}
            position="top-right"
            style={{ borderRadius: "50px" }}
          />
        )}
        {graticule && olMap && <GraticuleLayer olMap={olMap} showLabels />}
        {olMap && (
          <PrintScaleToolbar
            olMap={olMap}
            scaleLine={scaleLine}
            scaleValue={scaleValue}
          />
        )}
      </MapComponent>
    );
  }
);

PrintMapPreview.displayName = "PrintMapPreview";
