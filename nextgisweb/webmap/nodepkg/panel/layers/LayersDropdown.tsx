import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Dropdown, Spin } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { AddIcon } from "@nextgisweb/gui/icon";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import type { Display } from "@nextgisweb/webmap/display";

import { PanelTitle } from "../component";

import { useAddItem } from "./useAddItem";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import RestoreIcon from "@nextgisweb/icon/material/settings_backup_restore/outline";
import VisibilityOffIcon from "@nextgisweb/icon/material/visibility_off/outline";
import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export const LayersDropdown = observer(({ display }: { display: Display }) => {
  const { treeStore, map, config } = display;
  const { webmapId } = config;
  const [isEditable, setIsEditable] = useState(false);

  const {
    route: routeDispalyConfig,
    isLoading: isLoadingDispalyConfig,
    abort: abortDispalyConfig,
  } = useRoute("webmap.display_config", { id: webmapId });

  const { route, isLoading: isExtentLoading } = useRoute("webmap.extent", {
    id: webmapId,
  });

  const { fetchResourceItems } = useResourceAttr();

  useEffect(() => {
    const setup = async () => {
      const items = await fetchResourceItems({
        resources: [webmapId],
        attributes: [["resource.has_permission", "resource.update"]],
      });

      setIsEditable(items[0].get("resource.has_permission", "resource.update"));
    };

    setup();
  }, [webmapId, fetchResourceItems]);

  const {
    contextHolder: addItemContextHolder,
    addLayers,
    // addGroup,
  } = useAddItem({ display });

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

  const restoreLayers = async () => {
    abortDispalyConfig();

    try {
      const newConfig = await routeDispalyConfig.get();
      display.config.update(newConfig);
    } catch (er) {
      errorModal(er);
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "zoomToAllLayers",
      icon: isExtentLoading ? <Spin /> : <ZoomInMapIcon />,
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

  if (isEditable) {
    menuItems.push(
      ...[
        {
          key: "addLayers",
          icon: <AddIcon />,
          label: gettext("Add layers"),
          onClick: addLayers,
        },
        // {
        //   key: "addGroup",
        //   icon: <AddIcon />,
        //   label: gettext("Add group"),
        //   onClick: addGroup,
        // },
      ]
    );
  }

  const menuProps: MenuProps = { items: menuItems };

  return (
    <>
      {addItemContextHolder}
      <Dropdown
        menu={menuProps}
        trigger={["click"]}
        destroyOnHidden
        placement="bottomRight"
      >
        <PanelTitle.Button
          icon={<MoreVertIcon />}
          loading={isLoadingDispalyConfig}
          style={{ marginInlineStart: "8px" }}
        />
      </Dropdown>
    </>
  );
});

LayersDropdown.displayName = "LayersDropdown";
