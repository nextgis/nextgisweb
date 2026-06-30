import { useCallback, useEffect, useState } from "react";

import { Input, Modal } from "@nextgisweb/gui/antd";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResourcePicker } from "@nextgisweb/resource/component/resource-picker/hook/useResourcePicker";
import type { ResourcePickerAttr } from "@nextgisweb/resource/component/resource-picker/type";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import { getEffectiveDisplayName } from "@nextgisweb/resource/util/getEffectiveDisplayName";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeStore } from "@nextgisweb/webmap/store";
import type { TreeItemStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { GroupItemConfig } from "@nextgisweb/webmap/type/api";
import { styleToWebmapItem } from "@nextgisweb/webmap/utils/webmap-item-utils";

const newGroupDefValue = gettext("New group");

function getInsertParams({
  treeStore,
  item,
}: {
  treeStore: TreeStore;
  item: TreeItemStore | null;
}) {
  const parentId = item?.type === "group" ? item.id : (item?.parentId ?? null);

  if (item?.type !== "layer") {
    return { parentId, index: 0 };
  }

  const siblings =
    parentId === null
      ? treeStore.childrenIds
      : treeStore.getParent(item.id)?.childrenIds;

  return {
    parentId,
    index: siblings?.indexOf(item.id) ?? 0,
  };
}

export function useAddItem({ display }: { display: Display }) {
  const { treeStore, item, config } = display;
  const [modal, contextHolder] = Modal.useModal();
  const [parent, setParent] = useState<number | null>(null);
  const { showResourcePicker } = useResourcePicker();
  const { fetchResourceItems } = useResourceAttr();

  const { parentId, index } = getInsertParams({ item, treeStore });

  const { makeSignal } = useAbortController();

  useEffect(() => {
    const setup = async () => {
      const res = await fetchResourceItems({
        resources: [config.webmapId],
        attributes: [["resource.parent"]],
      });
      const parent = res[0].get("resource.parent");
      setParent(parent ? parent.id : null);
    };
    setup();
  }, [config.webmapId, fetchResourceItems]);

  const addLayers = useCallback(() => {
    showResourcePicker({
      pickerOptions: {
        requireClass: "point_cloud_style",
        requireInterface: "IRenderableStyle",
        multiple: true,
        initParentId: parent,
      },
      onPick: async (resources: ResourcePickerAttr | ResourcePickerAttr[]) => {
        if (!Array.isArray(resources)) resources = [resources];

        for (const res of resources) {
          const newId = treeStore.nextId();

          const displayName = await getEffectiveDisplayName(res, {
            signal: makeSignal(),
          });

          const webmapItem = await styleToWebmapItem({
            styleId: res.id,
            display,
            newId,
            name: displayName,
          });

          if (webmapItem) {
            treeStore.addItem(webmapItem, parentId, index);
            if (parentId !== null) {
              treeStore.setExpanded(
                Array.from(new Set([...treeStore.expanded, parentId]))
              );
            }
          }
        }
      },
    });
  }, [
    treeStore,
    parentId,
    display,
    parent,
    index,
    makeSignal,
    showResourcePicker,
  ]);

  const addGroup = useCallback(() => {
    let inputValue = newGroupDefValue;

    modal.confirm({
      title: gettext("Add group"),
      okText: gettext("Add"),
      cancelText: gettext("Cancel"),
      content: (
        <Input
          autoFocus
          defaultValue={inputValue}
          onChange={(e) => (inputValue = e.target.value)}
        />
      ),
      onOk: () => {
        const newId = treeStore.nextId();

        const group: GroupItemConfig = {
          id: newId,
          key: newId,
          type: "group",
          label: inputValue ?? newGroupDefValue,
          title: inputValue ?? newGroupDefValue,
          expanded: false,
          exclusive: false,
          children: [],
        };

        treeStore.addItem(group, parentId);
      },
    });
  }, [parentId, modal, treeStore]);

  return { addLayers, addGroup, contextHolder };
}
