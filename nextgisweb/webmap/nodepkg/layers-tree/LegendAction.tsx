import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TreeItem } from "../type/TreeItems";

import ExpandLessIcon from "@nextgisweb/icon/material/expand_less/outline";
import ViewListIcon from "@nextgisweb/icon/material/view_list/outline";

const msgShowLegend = gettext("Show legend");
const msgHideLegend = gettext("Hide legend");

export function LegendAction({
    nodeData,
    onClick,
}: {
    nodeData: TreeItem;
    onClick: (id: number) => void;
}) {
    const legendInfo = "legendInfo" in nodeData && nodeData.legendInfo;
    if (!nodeData || !legendInfo || legendInfo.open === undefined) {
        return <></>;
    }

    const { open } = nodeData.legendInfo;
    const icon = open ? <ExpandLessIcon /> : <ViewListIcon />;

    const click = () => {
        const { id } = nodeData;
        const { open } = nodeData.legendInfo;
        nodeData.legendInfo.open = !open;
        onClick(id);
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
