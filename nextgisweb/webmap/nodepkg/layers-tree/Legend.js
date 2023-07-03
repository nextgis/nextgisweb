import PropTypes from "prop-types";

import i18n from "@nextgisweb/pyramid/i18n";

import ViewListIcon from "@material-icons/svg/view_list/outline";
import ExpandLessIcon from "@material-icons/svg/expand_less/outline";

import "./Legend.less";

const showLegendMessage = i18n.gettext("Show legend");
const hideLegendMessage = i18n.gettext("Hide legend");

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

LegendAction.propTypes = {
    nodeData: PropTypes.object,
    onClick: PropTypes.func,
};

Legend.propTypes = {
    nodeData: PropTypes.object,
};
