import { route } from "@nextgisweb/pyramid/api";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeStore } from "@nextgisweb/webmap/store";
import type {
  TreeItemStore,
  TreeLayerStore,
} from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type {
  LayerItemConfig,
  WebMapItemGroupRead,
  WebMapItemLayerRead,
  WebMapItemLayerWrite,
} from "@nextgisweb/webmap/type/api";

export const POINT_CLOUD_STYLE_CLS = "point_cloud_style";
export const POINT_CLOUD_ADAPTER = "point_cloud";
export const POINT_CLOUD_ADAPTER_MID =
  "@nextgisweb/point-cloud/point-cloud-adapter";

// TODO: use universal approach
const adapterAliases: Record<string, string> = {
  "@nextgisweb/webmap/image-adapter": "image",
  "@nextgisweb/webmap/tile-adapter": "tile",
  [POINT_CLOUD_ADAPTER_MID]: POINT_CLOUD_ADAPTER,
};

const adapterMidAliases: Record<string, string> = {
  image: "@nextgisweb/webmap/image-adapter",
  tile: "@nextgisweb/webmap/tile-adapter",
  [POINT_CLOUD_ADAPTER]: POINT_CLOUD_ADAPTER_MID,
};

export function isPointCloudStyleCls(styleCls: string | null | undefined) {
  return styleCls === POINT_CLOUD_STYLE_CLS;
}

export function getDefaultAdapterMidForStyleCls(
  styleCls: string | null | undefined
) {
  return isPointCloudStyleCls(styleCls)
    ? POINT_CLOUD_ADAPTER_MID
    : "@nextgisweb/webmap/image-adapter";
}

export function getDefaultAdapterIdentityForStyleCls(
  styleCls: string | null | undefined
) {
  return isPointCloudStyleCls(styleCls) ? POINT_CLOUD_ADAPTER : "image";
}

export type TreeLayerWebmapItemWrite = Partial<
  Omit<WebMapItemLayerWrite, "item_type">
>;

export function updateTreeLayerFromWebmapItem(
  item: TreeLayerStore,
  value: TreeLayerWebmapItemWrite
) {
  const adapter = value.layer_adapter
    ? adapterMidAliases[value.layer_adapter]
    : undefined;

  item.update({
    label: value.display_name,
    title: value.display_name,
    visibility: value.layer_enabled,
    identifiable: value.layer_identifiable,
    transparency: value.layer_transparency,
    styleId: value.layer_style_id,
    minScaleDenom: value.layer_min_scale_denom,
    maxScaleDenom: value.layer_max_scale_denom,
    adapter,
  });

  const legendSymbols = value.legend_symbols;
  const hasLegend = legendSymbols === "expand" || legendSymbols === "collapse";
  const visible = hasLegend ? legendSymbols : "collapse";

  item.legendInfo.load({
    visible,
    has_legend: hasLegend,
  });
}

export function convertToWebmapItem({
  item,
  store,
}: {
  item: TreeItemStore;
  store: TreeStore;
}): WebMapItemGroupRead | WebMapItemLayerRead {
  if (item.isGroup()) {
    const children: WebMapItemGroupRead["children"] = [];

    item.childrenIds.toReversed().forEach((id) => {
      const child = store.getItemById(id);
      if (child) {
        children.push(convertToWebmapItem({ item: child, store }));
      }
    });

    return {
      item_type: "group",
      display_name: item.title,
      group_expanded: item.expanded,
      group_exclusive: false,
      children,
    } satisfies WebMapItemGroupRead;
  }

  return {
    item_type: "layer",
    display_name: item.title,
    layer_enabled: item.visibility,
    layer_identifiable: item.identifiable,
    layer_transparency: item.transparency,
    layer_style_id: item.styleId,
    layer_min_scale_denom: item.minScaleDenom,
    layer_max_scale_denom: item.maxScaleDenom,
    layer_adapter: adapterAliases[item.adapter] || "image",
    draw_order_position: item.drawOrderPosition,
    legend_symbols: item.legendInfo?.has_legend
      ? item.legendInfo.visible
      : "disable",
    style_parent_id: null,
  } satisfies WebMapItemLayerRead;
}

export async function styleToWebmapItem({
  styleId,
  display,
  adapter,
  newId,
  name,
}: {
  name: string;
  newId: number;
  adapter?: string;
  styleId: number;
  display: Display;
}): Promise<LayerItemConfig | undefined> {
  const styleItem = await route("resource.item", styleId).get({
    cache: true,
  });
  const style = styleItem.resource;
  if (!style.parent) {
    throw new Error("Style parent can not be undefined");
  }
  const resolvedAdapter = adapter ?? getDefaultAdapterMidForStyleCls(style.cls);
  const title = name ?? style.display_name;

  const plugin: Record<string, boolean | Record<string, boolean | string>> = {
    "@nextgisweb/webmap/plugin/layer-opacity": true,
    "@nextgisweb/webmap/plugin/layer-properties": true,
    "@nextgisweb/webmap/plugin/zoom-to-layer": true,
    "@nextgisweb/webmap/plugin/layer-info": true,
    "@nextgisweb/webmap/plugin/layer-identifiable": true,
    "@nextgisweb/webmap/plugin/layer-remove": true,
    "@nextgisweb/webmap/plugin/style-resource-editor": true,
    "@nextgisweb/webmap/plugin/layer-resource-editor": true,
  };

  const parentId = style.parent.id;
  const layerItem = await route("resource.item", parentId).get({
    cache: true,
  });

  const geometry_type = layerItem.vector_layer?.geometry_type;
  if (display.config.webmapEditable) {
    if (geometry_type) {
      plugin["@nextgisweb/webmap/plugin/layer-editor"] = {
        writable: true,
        geometry_type,
      };
    }
  }

  const vectorLayer = !!(layerItem.feature_layer || layerItem.vector_layer);

  if (vectorLayer) {
    Object.assign(plugin, {
      "@nextgisweb/webmap/plugin/feature-layer": true,
      "@nextgisweb/webmap/plugin/layer-filter": true,
    });
  }

  const identifiable = !!(
    layerItem.feature_layer ||
    layerItem.vector_layer ||
    layerItem.raster_layer
  );

  const layerId = isPointCloudStyleCls(style.cls)
    ? parentId
    : identifiable
      ? parentId
      : style.id;

  return {
    id: newId,
    type: "layer",
    layerId,
    styleId: style.id,
    visibility: true,
    filterable: geometry_type ? true : false,
    identifiable,
    identification: identifiable
      ? {
          mode:
            layerItem.feature_layer || layerItem.vector_layer
              ? "feature_layer"
              : "raster_layer",
          resource: { id: layerId },
        }
      : null,

    transparency: 0,
    minScaleDenom: null,
    maxScaleDenom: null,
    drawOrderPosition: null,
    legendInfo: {
      visible: "collapse",
      has_legend: vectorLayer,
    },
    adapter: resolvedAdapter,
    plugin,
    key: newId,
    label: title,
    title,
  };
}

export function getWebmapTree(treeStore: TreeStore) {
  const children: (WebMapItemGroupRead | WebMapItemLayerRead)[] = [];

  for (const id of treeStore.childrenIds.toReversed()) {
    const item = treeStore.getItemById(id);
    if (item) {
      children.push(convertToWebmapItem({ item, store: treeStore }));
    }
  }

  return children;
}

export function getTreeSnapshot(treeStore: TreeStore) {
  return JSON.stringify(getWebmapTree(treeStore));
}
