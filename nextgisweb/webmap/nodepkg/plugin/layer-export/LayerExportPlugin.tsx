import { lazy } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { ExportIcon } from "@nextgisweb/gui/icon";
import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ComputeMapExtent } from "@nextgisweb/webmap/component/ComputeMapExtent";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";
import type { PluginRunOptions } from "../PluginBase";

const ExportModal = lazy(() => import("@nextgisweb/resource/export-modal"));

export class LayerExportPlugin extends PluginBase {
  async run(
    nodeData: TreeLayerStore,
    { signal }: PluginRunOptions
  ): Promise<undefined> {
    try {
      const { resource } = await route("resource.item", nodeData.layerId).get({
        cache: true,
        signal,
      });
      showModal(ExportModal, {
        resourceId: nodeData.layerId,
        exportType:
          resource.cls === "raster_layer" ? "raster_layer" : "feature_layer",
        params: nodeData.filter ? { filter: nodeData.filter } : {},
        renderExtentButton: (onDone) => (
          <ComputeMapExtent display={this.display} onDone={onDone} />
        ),
      });
    } catch (err) {
      errorModal(err);
    }
    return undefined;
  }

  getMenuItem(): PluginMenuItem {
    return {
      icon: <ExportIcon />,
      title: gettext("Export"),
      order: 40,
    };
  }
}
