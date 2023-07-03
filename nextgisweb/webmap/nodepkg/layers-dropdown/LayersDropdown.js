import { Dropdown } from "@nextgisweb/gui/antd";
import ZoomInMapIcon from "@material-icons/svg/zoom_in_map/outline";
import MoreVertIcon from "@material-icons/svg/more_vert/outline";

import i18n from "@nextgisweb/pyramid/i18n";

import PropTypes from "prop-types";

import "./LayersDropdown.less";

export function LayersDropdown({ onClick }) {
    const menuItems = [
        {
            key: "zoomToAllLayers",
            label: (
                <>
                    <span>
                        <ZoomInMapIcon />
                    </span>
                    <span>{i18n.gettext("Zoom to all layers")}</span>
                </>
            ),
        },
    ];

    const menuProps = {
        items: menuItems,
        onClick: (clickRcMenuItem) => {
            const { key } = clickRcMenuItem;
            onClick(key);
        },
    };

    return (
        <Dropdown
            menu={menuProps}
            overlayClassName="layers-dropdown"
            trigger={["click"]}
            destroyPopupOnHide
            placement="bottomRight"
        >
            <MoreVertIcon />
        </Dropdown>
    );
}

LayersDropdown.propTypes = {
    onClick: PropTypes.func,
};
