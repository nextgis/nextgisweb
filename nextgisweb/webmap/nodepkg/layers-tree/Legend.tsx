import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TreeItem } from "../type/TreeItems";

import ExpandLessIcon from "@nextgisweb/icon/material/expand_less/outline";
import ViewListIcon from "@nextgisweb/icon/material/view_list/outline";

import "./Legend.less";

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

export function Legend({ nodeData }: { nodeData: TreeItem }) {
    const legendInfo = "legendInfo" in nodeData && nodeData.legendInfo;
    if (!nodeData || !legendInfo || !legendInfo.open) {
        return <></>;
    }

    return (
        <div className="legend-block">
            {legendInfo.symbols.map((s, idx) => (
                <div key={idx} className="legend-symbol" title={s.display_name}>
                    <img
                        width={20}
                        height={20}
                        src={"data:image/png;base64," + s.icon.data}
                    />
                    <div className="legend-title">{s.display_name}</div>
                </div>
            ))}
        </div>
    );
}
