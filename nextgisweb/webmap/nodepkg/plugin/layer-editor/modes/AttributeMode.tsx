import { unByKey } from "ol/Observable";
import { click, pointerMove } from "ol/events/condition";
import { Select } from "ol/interaction";
import type { SelectEvent } from "ol/interaction/Select";
import { lazy, useCallback, useEffect, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { useShowModal } from "@nextgisweb/gui";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";
import type { LayerEditorMode } from "../type";

import ListIcon from "@nextgisweb/icon/material/list/outline";

const FeatureEditorModalLazy = lazy(
  () => import("@nextgisweb/feature-layer/feature-editor-modal")
);

export const AttributeMode: LayerEditorMode<{ resourceId: number }> = ({
  order,
  resourceId,
}) => {
  const { layer, addUndo, selectStyle } = useEditorContext();
  const { modalHolder, showModal } = useShowModal();
  const { makeSignal } = useAbortController();
  const [active, setActive] = useState(false);

  const createHoverSelect = useCallback(() => {
    return new Select({
      layers: [layer],
      style: selectStyle,
      condition: pointerMove,
      multi: false,
    });
  }, [layer, selectStyle]);

  const hover = useInteraction(
    `${AttributeMode.displayName}-hoverselect`,
    active,
    createHoverSelect
  );

  const onUpdate = useCallback(
    async (ev: SelectEvent) => {
      const feature = ev.selected[0];

      if (feature) {
        let prevItem: FeatureItem = feature.get("attribution");
        const featureId: number = feature.get("id");
        if (!prevItem && typeof featureId === "number") {
          prevItem = await route("feature_layer.feature.item", {
            id: resourceId,
            fid: featureId,
          }).get<FeatureItem>({
            signal: makeSignal(),
            query: { dt_format: "iso" },
          });
          feature.set("attribution", prevItem);
        }
        let hasChanges = false;
        await new Promise((resolve) => {
          showModal(FeatureEditorModalLazy, {
            editorOptions: {
              mode: "return",
              showGeometryTab: false,
              resourceId,
              featureItem: prevItem,
              onOk: (item) => {
                feature.set("attribution", {
                  ...prevItem,
                  ...item,
                });
                hasChanges = true;

                resolve(undefined);
              },
            },
            onCancel: resolve,
          });
        });
        if (hasChanges) {
          return () => {
            feature.set("attribution", prevItem);
          };
        }
      }
    },
    [showModal, makeSignal, resourceId]
  );

  const createSelect = useCallback(() => {
    return new Select({
      layers: [layer],
      style: selectStyle,
      condition: click,
      multi: false,
    });
  }, [layer, selectStyle]);

  const select = useInteraction(
    `${AttributeMode.displayName}-select`,
    active,
    createSelect
  );

  useEffect(() => {
    const key = select.on("select", async (ev) => {
      const undo = await onUpdate?.(ev);
      if (undo) {
        addUndo(undo);
      }
      select.getFeatures().clear();
      hover.getFeatures().clear();
    });

    return () => unByKey(key);
  }, [addUndo, hover, onUpdate, select]);

  return (
    <>
      {modalHolder}
      <ToggleControl
        groupId={AttributeMode.displayName}
        title={gettext("Edit attributes")}
        order={order}
        onChange={setActive}
      >
        <ListIcon />
      </ToggleControl>
    </>
  );
};

AttributeMode.displayName = "AttributeMode";
