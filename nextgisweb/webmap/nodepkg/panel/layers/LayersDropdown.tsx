import { Button, Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export function LayersDropdown({
    onClick,
}: {
    onClick: (key: string) => void;
}) {
    const menuItems = [
        {
            key: "zoomToAllLayers",
            icon: <ZoomInMapIcon />,
            label: gettext("Zoom to all layers"),
        },
    ];

    const menuProps: MenuProps = {
        items: menuItems,
        onClick: (clickRcMenuItem) => {
            const { key } = clickRcMenuItem;
            onClick(key);
        },
    };

    return (
        <Dropdown
            menu={menuProps}
            trigger={["click"]}
            destroyPopupOnHide
            placement="bottomRight"
        >
            <Button type="text" shape="circle" icon={<MoreVertIcon />} />
        </Dropdown>
    );
}