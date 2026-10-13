import { observer } from "mobx-react-lite";
import { Suspense, useEffect } from "react";

import { useContainerWidth } from "@nextgisweb/gui/hook/useContainerWidth";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import type { Display } from "../../Display";
import { displayURLParams } from "../../displayURLParams";

import { registry } from "./registry";

export const MapControls = observer(
  ({
    display,
    mapStore,
    isTinyMode,
  }: {
    display?: Display;
    mapStore: MapStore;
    isTinyMode: boolean;
  }) => {
    const width = useContainerWidth(mapStore.targetElement);
    const isMobile = width < 500;
    let reg = registry.queryAll().map((control) => ({
      ...control,
      props: control.getProps?.({ map: mapStore, display }),
    }));
    const activeControl = reg.find(
      (control) => control.props?.groupId === mapStore.mapState
    );
    reg = reg.filter(
      (control) => control.isEnabled?.({ map: mapStore, display }) ?? true
    );

    const urlParams = displayURLParams.values();
    const urlKeys = urlParams.controls;

    if (isTinyMode) {
      if (urlKeys) {
        reg = reg.filter(({ key, embeddedShowMode }) => {
          const matchToUrlKey = key ? urlKeys.includes(key) : false;
          const alwaysEmbeddedShow = embeddedShowMode === "always";
          return matchToUrlKey || alwaysEmbeddedShow;
        });
      } else {
        reg = reg.filter((r) => r.embeddedShowMode === "always");
      }
    }

    if (isMobile) {
      reg = reg.filter((r) => !r.hideOnMobile);
    }

    const activeControlRemoved =
      !!activeControl && !reg.includes(activeControl);

    useEffect(() => {
      if (activeControlRemoved) {
        mapStore.setMapState(null);
      }
    }, [mapStore, activeControlRemoved]);

    const lazyControls = reg
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(({ component, key, props, order, position }) => ({
        key,
        LazyControl: component,
        props: {
          order,
          position,
          ...props,
        },
      }));

    return (
      <Suspense>
        {lazyControls.map(({ key, LazyControl, props }) => (
          <LazyControl key={key} {...props} />
        ))}
      </Suspense>
    );
  }
);

MapControls.displayName = "MapControls";
