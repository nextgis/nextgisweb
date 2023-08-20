import { gettext } from "@nextgisweb/pyramid/i18n";

import ExpandLessIcon from "@nextgisweb/icon/material/expand_less/outline";
import ViewListIcon from "@nextgisweb/icon/material/view_list/outline";

import "./Legend.less";

const showLegendMessage = gettext("Show legend");
const hideLegendMessage = gettext("Hide legend");

export function LegendAction({ nodeData, onClick }) {
    if (
        !nodeData ||
        !nodeData.legendInfo ||
        nodeData.legendInfo.open === undefined
    ) {
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
            title={open ? hideLegendMessage : showLegendMessage}
        >
            {icon}
        </span>
    );
}

export function Legend({ nodeData }) {
    if (!nodeData || !nodeData.legendInfo || !nodeData.legendInfo.open) {
        return <></>;
    }

    return (
        <div className="legend-block">
            {nodeData.legendInfo.symbols.map((s, idx) => (
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
