import { actionBound, observableRef } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { Group } from "@nextgisweb/webmap/items-widget/Item";
import type { ItemStore } from "@nextgisweb/webmap/items-widget/Item";
import { GroupWidget } from "@nextgisweb/webmap/items-widget/ItemsWidget";
import type { TreeGroupStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import { updateTreeGroupFromWebmapItem } from "@nextgisweb/webmap/utils/webmap-item-utils";

const msgTitle = gettext("Properties");

class GroupPropertiesDraftStore implements ItemStore {
  @observableRef accessor dirty = false;
  @observableRef accessor validate = false;

  readonly composite = { parent: null };

  @actionBound
  markDirty() {
    this.dirty = true;
  }

  @actionBound
  setValidate(value: boolean) {
    this.validate = value;
  }
}

export interface GroupPropertiesModalProps extends ShowModalOptions {
  nodeData: TreeGroupStore;
}

const GroupPropertiesModal = observer(
  ({ nodeData, close, ...modalProps }: GroupPropertiesModalProps) => {
    const [draftStore] = useState(() => new GroupPropertiesDraftStore());
    const [group] = useState(
      () =>
        new Group(draftStore, {
          display_name: nodeData.title,
          group_enabled: nodeData.visibility,
          group_expanded: nodeData.expanded,
          group_exclusive: nodeData.exclusive,
          children: [],
        })
    );

    const handleOk = useCallback(() => {
      draftStore.setValidate(true);

      if (group.error !== false) {
        return;
      }

      if (draftStore.dirty) {
        updateTreeGroupFromWebmapItem(nodeData, group.dump());
      }

      close?.();
    }, [close, draftStore, group, nodeData]);

    return (
      <Modal
        {...modalProps}
        title={msgTitle}
        width="fit-content"
        onOk={handleOk}
      >
        <GroupWidget item={group} />
      </Modal>
    );
  }
);

GroupPropertiesModal.displayName = "GroupPropertiesModal";
export default GroupPropertiesModal;
