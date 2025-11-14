import type { MouseEvent } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TreeItemStore } from "../store/tree-store/TreeItemStore";

import CollapseIcon from "@nextgisweb/icon/material/keyboard_arrow_up/outline";
import ExpandIcon from "@nextgisweb/icon/material/view_list/outline";

const msgShowLegend = gettext("Show legend");
const msgHideLegend = gettext("Hide legend");

export function LegendAction({
    nodeData,
    onClick,
}: {
    nodeData: TreeItemStore;
    onClick: (id: number) => void;
}) {
    const legendInfo = "legendInfo" in nodeData && nodeData.legendInfo;
    if (!nodeData || !legendInfo || legendInfo.open === undefined) {
        return <></>;
    }

    const { open } = nodeData.legendInfo;
    const icon = open ? <CollapseIcon /> : <ExpandIcon />;

    const click = (evt: MouseEvent) => {
        evt.stopPropagation();
        nodeData.legendInfo.open = !nodeData.legendInfo.open;
        onClick(nodeData.id);
    };

    return (
        <span
            className="legend"
            onClick={click}
            title={open ? msgHideLegend : msgShowLegend}
        >
            {icon}
        </span>
    );
}
