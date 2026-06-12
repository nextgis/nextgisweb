import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { DefaultMenuItem } from "@nextgisweb/webmap/display/component/DefaultMenuItem";
import type { PanelPluginActionButtonProps } from "@nextgisweb/webmap/panel/registry";
import type { WebMapUpdate } from "@nextgisweb/webmap/type/api";
import { getWebmapTree } from "@nextgisweb/webmap/utils/webmap-item-utils";

const SaveWebmapButton = observer<PanelPluginActionButtonProps>(
  ({ display, plugin }) => {
    const [saving, setSaving] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const onClick = useCallback(async () => {
      if (saving) {
        return;
      }

      const { treeStore } = display;

      if (!treeStore.dirty) {
        messageApi.info(gettext("No layer changes to save"));
        return;
      }

      setSaving(true);

      try {
        const webmap: WebMapUpdate = {
          root_item: {
            item_type: "root",
            children: getWebmapTree(treeStore),
          },
        };

        await route("resource.item", display.config.webmapId).put({
          json: { webmap },
        });
        treeStore.markClean();

        messageApi.success(gettext("Layers configuration saved"));
      } catch (er) {
        errorModal(er);
      } finally {
        setSaving(false);
      }
    }, [display, messageApi, saving]);

    return (
      <>
        {contextHolder}
        <DefaultMenuItem
          item={plugin}
          onClick={() => {
            void onClick();
          }}
        />
      </>
    );
  }
);

SaveWebmapButton.displayName = "SaveWebmapButton";
export default SaveWebmapButton;
