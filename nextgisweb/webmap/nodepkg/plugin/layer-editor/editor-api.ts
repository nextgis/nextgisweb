import { Feature as OlFeature } from "ol";
import WKT from "ol/format/WKT";
import type { Geometry } from "ol/geom";
import type { GeometryLayout, Type as OlGeometryType } from "ol/geom/Geometry";
import type VectorSource from "ol/source/Vector";

import { route } from "@nextgisweb/pyramid/api";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import {
  getOlGeometryType,
  getOlLayout,
} from "@nextgisweb/webmap/utils/geometry-types";

import type { FeatureToSave } from "./type";

const wkt = new WKT();

export async function fetchResourceOlFeature({
  resourceId,
  signal,
}: {
  resourceId: number;
  signal?: AbortSignal;
}): Promise<OlFeature<Geometry>[]> {
  const resp = await route("feature_layer.feature.collection", {
    id: resourceId,
  }).get({
    query: { dt_format: "iso", fields: [], extensions: [] },
    signal,
  });
  const olFeatures: OlFeature<Geometry>[] = [];
  for (const featureInfo of resp as Array<{
    id: number;
    geom?: string;
  }>) {
    if (!featureInfo.geom) {
      continue;
    }
    olFeatures.push(
      new OlFeature({
        id: featureInfo.id,
        layer_id: resourceId,
        geometry: wkt.readGeometry(featureInfo.geom),
        deleted: false,
      })
    );
  }
  return olFeatures;
}

export interface GeomConfig {
  type: OlGeometryType;
  layout: GeometryLayout;
}

export async function getGeomConfig({
  resourceId,
  signal,
}: {
  resourceId: number;
  signal?: AbortSignal;
}): Promise<GeomConfig> {
  const resp = await route("resource.item", {
    id: resourceId,
  }).get({
    query: { fields: [], extensions: [] },
    signal,
  });
  if (!resp.feature_layer) {
    throw new Error(`Resource ${resourceId} is not a feature layer`);
  }
  const type = resp.feature_layer.geometry_type;
  return {
    type: getOlGeometryType(type),
    layout: getOlLayout(type),
  };
}

function getFeaturesToSave({
  source,
  resourceId,
}: {
  resourceId: number;
  source: VectorSource;
}): FeatureToSave[] {
  const featuresToSave: FeatureToSave[] = [];

  const features = source
    .getFeatures()
    .filter((f) => f.get("layer_id") === resourceId);

  features.forEach((feature) => {
    const id = feature.get("id");
    const isNew = id === undefined || id === null;
    const isModified =
      !isNew && !feature.get("deleted") && feature.getRevision() > 1;
    const isDeleted = feature.get("deleted");

    const attribution = feature.get("attribution") || {};

    let featureToSave: FeatureToSave | undefined;

    if (isNew || isModified) {
      const geom = wkt.writeGeometry(feature.getGeometry()!);
      featureToSave = {
        ...attribution,
        geom,
      };
      if (isModified) {
        featureToSave = {
          ...featureToSave,
          geom,
        };
      }
    } else if (isDeleted) {
      featureToSave = {
        id,
        delete: true,
      };
    }

    if (featureToSave) {
      featuresToSave.push(featureToSave);
    }
  });

  return featuresToSave;
}

async function patchFeaturesOnServer({
  resourceId,
  features,
}: {
  resourceId: number;
  features: FeatureToSave[];
}): Promise<void> {
  if (resourceId === null || !features || features.length < 1) return;

  await route("feature_layer.feature.collection", {
    id: resourceId,
  }).patch({
    // @ts-expect-error TODO: define patch payload for feature_layer.feature.collection
    json: features,
    query: { dt_format: "iso" },
  });
}

export async function saveChanges({
  item,
  source,
  display,
}: {
  item: TreeLayerStore;
  display: Display;
  source: VectorSource;
}): Promise<void> {
  const resourceId = item.layerId;
  const features = getFeaturesToSave({
    source,
    resourceId,
  });

  await patchFeaturesOnServer({ resourceId, features });

  display.map.getLayer(item.id)?.reload();

  topic.publish("/webmap/feature-table/refresh", item.layerId);
}
