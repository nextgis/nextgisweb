import { observer } from "mobx-react-lite";

import { Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";

import { PanelTitle } from "../component";

import { LoadingOutlined } from "@ant-design/icons";
import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import RestoreIcon from "@nextgisweb/icon/material/settings_backup_restore/outline";
import VisibilityOffIcon from "@nextgisweb/icon/material/visibility_off/outline";
import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export const LayersDropdown = observer(({ display }: { display: Display }) => {
    const { treeStore, map } = display;

    const { route, isLoading: isExtentLoading } = useRoute("webmap.extent", {
        id: display.config.webmapId,
    });

    const zoomToAllLayers = () => {
        route.get().then((extent) => {
            if (!extent) return;
            map.zoomToNgwExtent(extent, {
                displayProjection: display.map.displayProjection,
            });
        });
    };

    const hideAllLayers = () => {
        treeStore.setVisibleIds([]);
    };

    const restoreLayers = () => {
        treeStore.load(display.config.rootItem);
    };

    const menuItems: MenuProps["items"] = [
        {
            key: "zoomToAllLayers",
            icon: isExtentLoading ? (
                <LoadingOutlined spin />
            ) : (
                <ZoomInMapIcon />
            ),
            label: gettext("Zoom to all layers"),
            onClick: zoomToAllLayers,
        },
        {
            key: "hideAllLayers",
            icon: <VisibilityOffIcon />,
            label: gettext("Hide all layers"),
            disabled: !treeStore.visibleLayerIds.length,
            onClick: hideAllLayers,
        },
        {
            key: "restoreLayers",
            icon: <RestoreIcon />,
            label: gettext("Reset layers"),
            onClick: restoreLayers,
        },
    ];

    const menuProps: MenuProps = {
        items: menuItems,
    };

    return (
        <Dropdown
            menu={menuProps}
            trigger={["click"]}
            destroyOnHidden
            placement="bottomRight"
        >
            <PanelTitle.Button
                icon={<MoreVertIcon />}
                style={{ marginInlineStart: "8px" }}
            />
        </Dropdown>
    );
});

LayersDropdown.displayName = "LayersDropdown";
