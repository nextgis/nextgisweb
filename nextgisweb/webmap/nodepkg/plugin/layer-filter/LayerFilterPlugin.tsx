import { gettext } from "@nextgisweb/pyramid/i18n";
import { openLayerFilter } from "@nextgisweb/webmap/layers-tree/util/openLayerFilter";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import FilterIcon from "@nextgisweb/icon/material/filter_alt";

export class LayerFilterPlugin extends PluginBase {
    getPluginState(nodeData: TreeLayerStore): PluginState {
        const state = super.getPluginState(nodeData);

        return {
            ...state,
            enabled: nodeData.filterable,
        };
    }

    async run(nodeData: TreeLayerStore) {
        openLayerFilter(nodeData);
        return undefined;
    }

    getMenuItem() {
        return {
            icon: <FilterIcon />,
            title: gettext("Filter"),
        };
    }
}
