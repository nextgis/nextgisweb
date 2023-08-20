import { Dropdown } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

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
                    <span>{gettext("Zoom to all layers")}</span>
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
