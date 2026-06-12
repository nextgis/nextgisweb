import { action, observable } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import { Layer } from "@nextgisweb/webmap/items-widget/Item";
import type { ItemStore } from "@nextgisweb/webmap/items-widget/Item";
import { LayerWidget } from "@nextgisweb/webmap/items-widget/ItemsWidget";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import {
  convertToWebmapItem,
  updateTreeLayerFromWebmapItem,
} from "@nextgisweb/webmap/utils/webmap-item-utils";

import CurrentScaleIcon from "@nextgisweb/icon/material/my_location";

const msgTitle = gettext("Layer properties");
const msgUseCurrentScale = gettext("Use current map scale");

function CurrentScaleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      icon={<CurrentScaleIcon />}
      size="small"
      title={msgUseCurrentScale}
      type="text"
      onClick={onClick}
    />
  );
}

class LayerPropertiesDraftStore implements ItemStore {
  @observable.ref accessor dirty = false;
  @observable.ref accessor validate = false;

  readonly composite = { parent: null };

  @action.bound
  markDirty() {
    this.dirty = true;
  }

  @action.bound
  setValidate(value: boolean) {
    this.validate = value;
  }
}

export interface LayerPropertiesModalProps extends ShowModalOptions {
  display: Display;
  nodeData: TreeLayerStore;
}

export const LayerPropertiesModal = observer(
  ({ display, nodeData, close, ...modalProps }: LayerPropertiesModalProps) => {
    const [draftStore] = useState(() => new LayerPropertiesDraftStore());
    const [layer] = useState(
      () =>
        new Layer(
          draftStore,
          convertToWebmapItem({
            item: nodeData,
            store: display.treeStore,
          })
        )
    );

    const handleOk = useCallback(() => {
      draftStore.setValidate(true);

      if (layer.error !== false) {
        return;
      }

      if (draftStore.dirty) {
        updateTreeLayerFromWebmapItem(nodeData, layer.dump());
      }

      close?.();
    }, [close, draftStore, layer, nodeData]);

    const applyCurrentScale = useCallback(
      (setValue: (value: number) => void) => {
        const scale = display.map.scale;
        if (scale === undefined) return;

        setValue(Math.round(scale));
      },
      [display.map]
    );

    const minScaleDenomAddon = (
      <CurrentScaleButton
        onClick={() =>
          applyCurrentScale((value) => {
            layer.layerMinScaleDenom.value = value;
          })
        }
      />
    );
    const maxScaleDenomAddon = (
      <CurrentScaleButton
        onClick={() =>
          applyCurrentScale((value) => {
            layer.layerMaxScaleDenom.value = value;
          })
        }
      />
    );

    return (
      <Modal {...modalProps} title={msgTitle} width={720} onOk={handleOk}>
        <LayerWidget
          item={layer}
          maxScaleDenomAddon={maxScaleDenomAddon}
          minScaleDenomAddon={minScaleDenomAddon}
        />
      </Modal>
    );
  }
);

LayerPropertiesModal.displayName = "LayerPropertiesModal";
