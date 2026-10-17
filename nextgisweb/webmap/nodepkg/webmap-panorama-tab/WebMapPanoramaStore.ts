import { actionBound, computed, reaction } from "mobx";
import { Observer } from "mobx-react-lite";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Suspense, createElement, lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";

import { PanoramaStore } from "../panorama/PanoramaStore";

import "./WebMapPanoramaTab.less";

const WebMapPanoramaTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-panorama-tab")
);

const PanoramaProviderSelectLazy = lazy(() =>
  import("../panorama/PanoramaProviderSelect").then((m) => ({
    default: m.PanoramaProviderSelect,
  }))
);

const TAB_KEY = "panorama";

interface WebMapPanoramaStoreOptions {
  display: Display;
}

export class WebMapPanoramaStore extends PanoramaStore {
  private _display: Display;

  constructor({ display }: WebMapPanoramaStoreOptions) {
    super();
    this._display = display;

    reaction(
      () => display.tabsManager.tabs.some((t) => t.key === TAB_KEY),
      (opened) => {
        if (!opened) this.clear();
      }
    );

    reaction(
      () => this.position,
      (position) => {
        if (!position) return;
        const { lat, lng } = position;
        const coordinates = fromLonLat([lng, lat], display.displayProjection);
        display.map.zoomToGeom(new Point(coordinates));
      }
    );
  }

  @computed
  get active(): boolean {
    return this._display.tabsManager.activeKey === TAB_KEY;
  }

  @actionBound
  open(lat: number, lng: number) {
    this.setPosition(lat, lng);
    this._display.tabsManager.addTab({
      key: TAB_KEY,
      label: createElement(
        Suspense,
        { fallback: gettext("Panorama") },
        createElement(Observer, {
          render: () =>
            createElement(PanoramaProviderSelectLazy, {
              store: this,
              className: "ngw-webmap-panorama-tab-select",
              variant: "borderless",
              style: this.active ? undefined : { pointerEvents: "none" },
            }),
        })
      ),
      component: WebMapPanoramaTabLazy,
      props: { store: this },
    });
  }

  @actionBound
  close() {
    this._display.tabsManager.removeTab(TAB_KEY);
    this.clear();
  }
}
