import { observer } from "mobx-react-lite";
import type OlMap from "ol/Map";
import { useCallback, useMemo, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import { OlLayerAdapter } from "@nextgisweb/webmap/ol/layer/OlLayerAdapter";

import { ToggleControl } from "../../control";
import type { ToggleControlProps } from "../../control";

import SwipeControl from "./SwipeControl";

import Icon from "@nextgisweb/icon/material/compare";

/* prettier-ignore */ const
msgNoLayerSelectedContent = gettext("Please select a layer before using this tool."),
msgNoLayerSelectedTitle = gettext("No layer selected"),
msgInvalidTypeContent = gettext("Please select a layer, not a group."),
msgLayerHiddenContent = gettext("Please make the layer visible before using this tool."),
msgInvalidTypeTitle = gettext("Invalid selection type"),
msgLayerHiddenTitle = gettext("Layer is not visible");

type Orientation = "vertical" | "horizontal";

export interface ToolSwipeProps extends ToggleControlProps {
  olMap: OlMap;
  orientation?: Orientation;
  groupId?: string;
}

const ToolSwipe = observer(
  ({
    olMap,
    orientation: orientationProp = "horizontal",
    groupId,
    ...rest
  }: ToolSwipeProps) => {
    const { display } = useDisplayContext();
    const [modal, contextHolder] = Modal.useModal();
    const { item, map } = display;

    const [orientation, setOrientation] =
      useState<Orientation>(orientationProp);

    const label = useMemo(
      () =>
        orientation === "vertical"
          ? gettext("Vertical swipe")
          : gettext("Horizontal swipe"),
      [orientation]
    );

    const iconEl = useMemo(() => <Icon />, []);

    const validate = useCallback(
      (status: boolean): boolean => {
        if (status) {
          if (!item) {
            modal.info({
              title: msgNoLayerSelectedTitle,
              content: msgNoLayerSelectedContent,
            });
            return false;
          } else {
            if (item.type !== "layer" && item.type !== "group") {
              modal.info({
                title: msgInvalidTypeTitle,
                content: msgInvalidTypeContent,
              });
              return false;
            }
            if (item.isLayer() && !item.visibility) {
              modal.info({
                title: msgLayerHiddenTitle,
                content: msgLayerHiddenContent,
              });
              return false;
            }
          }
        }
        return true;
      },
      [item, modal]
    );

    const layers = useMemo(() => {
      if (item) {
        if (item.type === "layer") {
          const l = map.layers[item.id];
          return l instanceof OlLayerAdapter ? [l.olLayer] : [];
        } else if (item.type === "group") {
          const desc = display.treeStore.getDescendants(item.id);
          return desc
            .map((d) => {
              const layer = map.layers[d.id];
              return layer instanceof OlLayerAdapter
                ? layer.olLayer
                : undefined;
            })
            .filter((layer) => layer !== undefined);
        }
      }
      return [];
    }, [display.treeStore, item, map.layers]);

    const [active, setActive] = useState(false);

    const onToggle = useCallback(
      (next: boolean) => {
        if (!validate(next)) {
          setActive(false);
          return;
        }
        setActive(next);
      },
      [validate]
    );

    const handleRotate = useCallback(() => {
      setOrientation((prev) => {
        return prev === "vertical" ? "horizontal" : "vertical";
      });
    }, []);

    return (
      <>
        {contextHolder}
        <ToggleControl
          {...rest}
          title={label}
          groupId={groupId}
          onChange={onToggle}
          canToggle={validate}
        >
          {iconEl}
        </ToggleControl>

        {active && (
          <SwipeControl
            olMap={olMap}
            layers={layers}
            orientation={orientation}
            onRotateRequest={handleRotate}
          />
        )}
      </>
    );
  }
);

ToolSwipe.displayName = "ToolSwipe";

export default ToolSwipe;
