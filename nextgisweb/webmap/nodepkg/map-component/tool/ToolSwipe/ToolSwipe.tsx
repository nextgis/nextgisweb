import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";

import { ToggleControl } from "../../control";
import type { ToggleControlProps } from "../../control";

import SwipeControl from "./SwipeControl";

import Icon from "@nextgisweb/icon/material/compare";

// prettier-ignore
const msg = {
    noLayerSelectedContent: gettext("Please select a layer before using this tool."),
    noLayerSelectedTitle: gettext("No layer selected"),
    invalidTypeContent: gettext("Please select a layer, not a group."),
    layerHiddenContent: gettext("Please make the layer visible before using this tool."),
    invalidTypeTitle: gettext("Invalid selection type"),
    layerHiddenTitle: gettext("Layer is not visible"),
};

type Orientation = "vertical" | "horizontal";

export interface ToolSwipeProps extends ToggleControlProps {
    orientation?: Orientation;
    groupId?: string;
}

const ToolSwipe = observer(
    ({
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
                            title: msg.noLayerSelectedTitle,
                            content: msg.noLayerSelectedContent,
                        });
                        return false;
                    } else {
                        if (item.type !== "layer" && item.type !== "group") {
                            modal.info({
                                title: msg.invalidTypeTitle,
                                content: msg.invalidTypeContent,
                            });
                            return false;
                        }
                        if (item.isLayer() && !item.visibility) {
                            modal.info({
                                title: msg.layerHiddenTitle,
                                content: msg.layerHiddenContent,
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
                    const l = map.layers[item.id]?.olLayer;
                    return l ? [l] : [];
                } else if (item.type === "group") {
                    const desc = display.treeStore.getDescendants(item.id);
                    return desc
                        .map((d) => map.layers[d.id]?.olLayer)
                        .filter(Boolean);
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
