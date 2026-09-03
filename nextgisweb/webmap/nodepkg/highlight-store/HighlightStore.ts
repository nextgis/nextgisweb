import { action, observable } from "mobx";
import { WKT } from "ol/format";
import type { Geometry } from "ol/geom";

import { route } from "@nextgisweb/pyramid/api";

export interface HighlightEvent {
  geom: Geometry;
  layerId?: number;
  featureId?: number | string;
}

const wkt = new WKT();

export class HighlightStore {
  @observable.ref accessor highlighted: HighlightEvent[] = [];

  @action.bound
  highlight(e: HighlightEvent | HighlightEvent[]) {
    const arr = Array.isArray(e) ? e : [e];
    this.highlighted = arr;
  }

  @action.bound
  unhighlight(filter?: (e: HighlightEvent) => boolean) {
    if (!filter) {
      this.highlighted = [];
      return;
    }
    this.highlighted = this.highlighted.filter((x) => !filter(x));
  }

  @action.bound
  async highlightById(featureId: number, layerId: number) {
    const feature = await route("feature_layer.feature.item", {
      id: layerId,
      fid: featureId,
    }).get({
      query: { dt_format: "iso", fields: [], extensions: [] },
      cache: true,
    });

    const event = {
      geom: wkt.readGeometry(feature.geom),
      featureId,
      layerId,
    };
    this.highlight(event);
    return event;
  }
}
