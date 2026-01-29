import { observer } from "mobx-react-lite";
import type { MouseEvent } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TreeLayerStore } from "../store/tree-store/TreeItemStore";

import { openLayerFilter } from "./util/openLayerFilter";

import FilterIcon from "@nextgisweb/icon/material/filter_alt";

const msgFilter = gettext("Filter");

export const FilterAction = observer(
    ({
        nodeData,
        onClick,
    }: {
        nodeData: TreeLayerStore;
        onClick?: (id: number) => void;
    }) => {
        if (!(nodeData.filterable && nodeData.filter)) {
            return null;
        }

        const click = (evt: MouseEvent) => {
            evt.stopPropagation();
            openLayerFilter(nodeData);
            onClick?.(nodeData.id);
        };

        return (
            <span
                className="action-btn filter-open"
                onClick={click}
                title={msgFilter}
            >
                <FilterIcon />
            </span>
        );
    }
);

FilterAction.displayName = "FilterAction";
